import Anthropic from '@anthropic-ai/sdk';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  StoredToolCall,
  StoredToolResult,
} from '../chat/entities/message.entity';
import { FinancialService } from '../financial/financial.service';
import { EXECUTE_SQL_TOOL } from './constants/tool-definitions';
import {
  ANTHROPIC_CLIENT,
  MAX_TOKENS,
  MAX_TOOL_ROUNDS,
} from './llm.constants';
import {
  ChatTurnResult,
  HistoryTurn,
  StreamEvent,
} from './interfaces/stream-event.interface';
import { calculateCost } from './services/cost';
import { PromptBuilderService } from './services/prompt-builder.service';

const REFUSAL_NOTICE =
  "I'm not able to help with that request. Please try asking about the " +
  'income-statement data I have access to.';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly model: string;

  constructor(
    @Inject(ANTHROPIC_CLIENT) private readonly anthropic: Anthropic,
    private readonly promptBuilder: PromptBuilderService,
    private readonly financial: FinancialService,
    config: ConfigService,
  ) {
    this.model = config.getOrThrow<string>('ANTHROPIC_MODEL');
  }

  /**
   * Runs one assistant turn: stream, execute any SQL the model asks for, feed
   * the results back, repeat until it stops asking.
   *
   * Yields display events as they happen and returns the accumulated turn for
   * persistence. Aborting mid-flight is a normal outcome, not an error — the
   * user pressed stop, and whatever was produced still has to be saved and
   * billed.
   *
   * Note on parameters: no `temperature`, `top_p`, `top_k` or `thinking`.
   * Opus 4.8 rejects the sampling parameters outright, and omitting `thinking`
   * is what keeps this model from reasoning before every reply — writing a
   * SELECT over eight columns does not need it, and latency is the thing users
   * feel here.
   */
  async *streamChat(
    history: HistoryTurn[],
    userMessage: string,
    signal: AbortSignal,
  ): AsyncGenerator<StreamEvent, ChatTurnResult, void> {
    const system = this.promptBuilder.getSystemPrompt();
    const messages: Anthropic.MessageParam[] = [
      ...history.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: 'user' as const, content: userMessage },
    ];

    let content = '';
    const toolCalls: StoredToolCall[] = [];
    const toolResults: StoredToolResult[] = [];

    // Usage is accumulated from the stream itself rather than read off
    // finalMessage(). An aborted turn never resolves finalMessage(), and a
    // partial reply still has to carry a real cost — message_start already
    // carries the input tokens by the time the first token reaches the user.
    let committedInput = 0;
    let committedOutput = 0;
    let roundInput = 0;
    let roundOutput = 0;

    const snapshot = (partial: boolean): ChatTurnResult => {
      const inputTokens = committedInput + roundInput;
      const outputTokens = committedOutput + roundOutput;
      return {
        content,
        toolCalls,
        toolResults,
        inputTokens,
        outputTokens,
        cost: calculateCost(inputTokens, outputTokens),
        partial,
      };
    };

    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        roundInput = 0;
        roundOutput = 0;

        const stream = this.anthropic.messages.stream(
          {
            model: this.model,
            max_tokens: MAX_TOKENS,
            system, // top-level parameter, not a message
            // Copied per round: the loop appends to `messages` after this call,
            // and the request payload must not alias state from a later round.
            messages: [...messages],
            tools: [EXECUTE_SQL_TOOL],
          },
          { signal },
        );

        for await (const event of stream) {
          if (event.type === 'message_start') {
            roundInput = event.message.usage.input_tokens;
          } else if (event.type === 'message_delta') {
            // Cumulative for this message, so assign rather than add.
            roundOutput = event.usage.output_tokens;
          } else if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            content += event.delta.text;
            yield { type: 'token', data: { content: event.delta.text } };
          }
          // input_json_delta is ignored on purpose: finalMessage() hands back
          // the tool input already parsed, so accumulating the fragments here
          // would only risk disagreeing with it.
        }

        const message = await stream.finalMessage();
        committedInput += roundInput;
        committedOutput += roundOutput;
        roundInput = 0;
        roundOutput = 0;

        if (message.stop_reason === 'refusal') {
          // Retrying the same prompt would only be refused again.
          this.logger.warn('Model declined the request');
          content += REFUSAL_NOTICE;
          yield { type: 'token', data: { content: REFUSAL_NOTICE } };
          const result = snapshot(false);
          yield { type: 'usage', data: this.usageOf(result) };
          return result;
        }

        if (message.stop_reason !== 'tool_use') {
          const result = snapshot(false);
          yield { type: 'usage', data: this.usageOf(result) };
          return result;
        }

        // The whole assistant message goes back, tool_use blocks included.
        messages.push({ role: 'assistant', content: message.content });

        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const block of message.content) {
          if (block.type !== 'tool_use') continue;

          const sql = (block.input as { query?: string }).query ?? '';
          toolCalls.push({ name: block.name, arguments: sql });
          yield { type: 'tool_call', data: { name: block.name, arguments: sql } };

          try {
            const executed = await this.financial.execute(sql);
            toolResults.push({ query: sql, rowCount: executed.rowCount });
            yield {
              type: 'tool_result',
              data: {
                query: sql,
                rows: executed.rows,
                rowCount: executed.rowCount,
                truncated: executed.truncated,
              },
            };
            results.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(executed.rows),
            });
          } catch (error) {
            // A rejected or failed query is information for the model, not a
            // crash. Handing back the reason lets it correct itself; throwing
            // here would end the turn with nothing to show for it.
            const reason = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Tool query failed: ${reason}`);
            toolResults.push({ query: sql, error: reason });
            yield {
              type: 'tool_result',
              data: { query: sql, rows: [], rowCount: 0, truncated: false },
            };
            results.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({ error: reason }),
              is_error: true,
            });
          }
        }

        // Every tool result belongs to a single user message. Splitting them
        // across several is the most common way to get a 400 from this API.
        messages.push({ role: 'user', content: results });
      }

      // Round limit reached with the model still asking for tools.
      this.logger.warn(`Stopped after ${MAX_TOOL_ROUNDS} tool rounds`);
      const result = snapshot(false);
      yield { type: 'usage', data: this.usageOf(result) };
      return result;
    } catch (error) {
      if (signal.aborted) {
        return snapshot(true);
      }
      throw error;
    }
  }

  private usageOf(result: ChatTurnResult): {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  } {
    return {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cost: result.cost,
    };
  }
}
