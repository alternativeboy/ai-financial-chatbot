import type Anthropic from '@anthropic-ai/sdk';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FinancialService } from '../financial/financial.service';
import {
  ChatTurnResult,
  StreamEvent,
} from './interfaces/stream-event.interface';
import { LlmService } from './llm.service';
import { MAX_TOOL_ROUNDS } from './llm.constants';
import { PromptBuilderService } from './services/prompt-builder.service';

/**
 * The tool loop, driven by a scripted Anthropic client.
 *
 * These tests exist because the loop's failure modes are all silent: a tool
 * result sent in the wrong shape, a turn that stops billing when interrupted,
 * a rejected query that takes the whole conversation down with it.
 */

type StreamEventish = Record<string, unknown>;

/** Stands in for the SDK's MessageStream: async-iterable plus finalMessage(). */
function scriptedStream(
  events: StreamEventish[],
  finalMessage: unknown,
  onIterate?: () => void,
) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event;
      }
      onIterate?.();
    },
    finalMessage: async () => finalMessage,
  };
}

const textDelta = (text: string): StreamEventish => ({
  type: 'content_block_delta',
  delta: { type: 'text_delta', text },
});

const messageStart = (inputTokens: number): StreamEventish => ({
  type: 'message_start',
  message: { usage: { input_tokens: inputTokens } },
});

const messageDelta = (outputTokens: number): StreamEventish => ({
  type: 'message_delta',
  usage: { output_tokens: outputTokens },
});

const toolUseMessage = (query: string, id = 'toolu_1') => ({
  stop_reason: 'tool_use',
  content: [
    { type: 'text', text: 'Let me check.' },
    { type: 'tool_use', id, name: 'execute_sql', input: { query } },
  ],
});

const endTurnMessage = () => ({ stop_reason: 'end_turn', content: [] });

async function drain(
  generator: AsyncGenerator<StreamEvent, ChatTurnResult, void>,
): Promise<{ events: StreamEvent[]; result: ChatTurnResult }> {
  const events: StreamEvent[] = [];
  let step = await generator.next();
  while (!step.done) {
    events.push(step.value);
    step = await generator.next();
  }
  return { events, result: step.value };
}

describe('LlmService', () => {
  let stream: jest.Mock;
  let execute: jest.Mock;
  let service: LlmService;

  const APPLE_SQL =
    "SELECT net_income FROM financial_data WHERE company = 'Apple' AND year = 2023";

  beforeEach(() => {
    stream = jest.fn();
    execute = jest.fn();

    service = new LlmService(
      { messages: { stream } } as unknown as Anthropic,
      { getSystemPrompt: () => 'SYSTEM PROMPT' } as PromptBuilderService,
      { execute } as unknown as FinancialService,
      { getOrThrow: () => 'claude-opus-4-8' } as unknown as ConfigService,
    );
  });

  describe('a complete question-and-answer turn (S1)', () => {
    beforeEach(() => {
      stream
        .mockReturnValueOnce(
          scriptedStream(
            [messageStart(1000), textDelta('Let me check.'), messageDelta(20)],
            toolUseMessage(APPLE_SQL),
          ),
        )
        .mockReturnValueOnce(
          scriptedStream(
            [
              messageStart(1200),
              textDelta('Apple earned '),
              textDelta('$96.99 billion.'),
              messageDelta(30),
            ],
            endTurnMessage(),
          ),
        );

      execute.mockResolvedValue({
        rows: [{ net_income: '96995000000' }],
        rowCount: 1,
        truncated: false,
      });
    });

    it('emits tool call, tool result, tokens and usage in order', async () => {
      const { events } = await drain(
        service.streamChat([], "Apple's net income in 2023?", new AbortController().signal),
      );

      expect(events.map((event) => event.type)).toEqual([
        'token', // "Let me check."
        'tool_call',
        'tool_result',
        'token', // "Apple earned "
        'token', // "$96.99 billion."
        'usage',
      ]);
    });

    it('surfaces the SQL it ran so the UI can show it', async () => {
      const { events } = await drain(
        service.streamChat([], 'q', new AbortController().signal),
      );

      const toolCall = events.find((event) => event.type === 'tool_call');
      expect(toolCall).toEqual({
        type: 'tool_call',
        data: { name: 'execute_sql', arguments: APPLE_SQL },
      });
      expect(execute).toHaveBeenCalledWith(APPLE_SQL);
    });

    it('accumulates text and bills both rounds', async () => {
      const { result } = await drain(
        service.streamChat([], 'q', new AbortController().signal),
      );

      // A blank line separates the pre-tool remark from the answer; without it
      // the two rounds run together as "…look that up.Apple earned…".
      expect(result.content).toBe(
        'Let me check.\n\nApple earned $96.99 billion.',
      );
      expect(result.inputTokens).toBe(2200);
      expect(result.outputTokens).toBe(50);
      expect(result.cost).toBeCloseTo(2200 * 5e-6 + 50 * 25e-6, 12);
      expect(result.partial).toBe(false);
      expect(result.toolCalls).toEqual([
        { name: 'execute_sql', arguments: APPLE_SQL },
      ]);
      expect(result.toolResults).toEqual([{ query: APPLE_SQL, rowCount: 1 }]);
    });

    it('returns every tool result inside a single user message', async () => {
      await drain(service.streamChat([], 'q', new AbortController().signal));

      const secondCall = stream.mock.calls[1][0];
      const messages = secondCall.messages;
      const last = messages[messages.length - 1];

      // Splitting tool results across several user messages is the most common
      // way to get a 400 back from this API.
      expect(last.role).toBe('user');
      expect(Array.isArray(last.content)).toBe(true);
      expect(last.content).toHaveLength(1);
      expect(last.content[0]).toMatchObject({
        type: 'tool_result',
        tool_use_id: 'toolu_1',
      });
      // The assistant turn before it must be the untouched message content.
      expect(messages[messages.length - 2].role).toBe('assistant');
    });

    it('sends the system prompt top-level and omits rejected parameters', async () => {
      await drain(service.streamChat([], 'q', new AbortController().signal));

      const request = stream.mock.calls[0][0];
      expect(request.system).toBe('SYSTEM PROMPT');
      expect(request.messages[0]).toEqual({ role: 'user', content: 'q' });
      // Opus 4.8 returns 400 for any of these.
      expect(request).not.toHaveProperty('temperature');
      expect(request).not.toHaveProperty('top_p');
      expect(request).not.toHaveProperty('top_k');
      expect(request).not.toHaveProperty('thinking');
      expect(request.max_tokens).toBeGreaterThan(0);
    });

    it('passes prior turns through as context', async () => {
      await drain(
        service.streamChat(
          [
            { role: 'user', content: 'earlier question' },
            { role: 'assistant', content: 'earlier answer' },
          ],
          'follow up',
          new AbortController().signal,
        ),
      );

      expect(stream.mock.calls[0][0].messages).toEqual([
        { role: 'user', content: 'earlier question' },
        { role: 'assistant', content: 'earlier answer' },
        { role: 'user', content: 'follow up' },
      ]);
    });
  });

  describe('when the validator rejects the query', () => {
    beforeEach(() => {
      stream
        .mockReturnValueOnce(
          scriptedStream(
            [messageStart(800), messageDelta(10)],
            toolUseMessage('DROP TABLE financial_data'),
          ),
        )
        .mockReturnValueOnce(
          scriptedStream(
            [
              messageStart(900),
              textDelta('I can only read data, not modify it.'),
              messageDelta(15),
            ],
            endTurnMessage(),
          ),
        );

      execute.mockRejectedValue(
        new BadRequestException('Blocked keyword detected: DROP'),
      );
    });

    it('keeps the turn alive and lets the model recover', async () => {
      const { events, result } = await drain(
        service.streamChat([], 'delete everything', new AbortController().signal),
      );

      expect(result.content).toBe('I can only read data, not modify it.');
      expect(result.partial).toBe(false);
      expect(events.map((event) => event.type)).toContain('tool_result');
    });

    it('reports an empty result to the client but the reason to the model', async () => {
      const { events, result } = await drain(
        service.streamChat([], 'q', new AbortController().signal),
      );

      const toolResult = events.find((event) => event.type === 'tool_result');
      expect(toolResult).toMatchObject({
        data: { rows: [], rowCount: 0, truncated: false },
      });

      // Stored for the transcript…
      expect(result.toolResults[0]).toMatchObject({
        error: 'Blocked keyword detected: DROP',
      });

      // …and handed back to the model flagged as an error, so it can correct
      // itself rather than repeat the same query.
      const followUp = stream.mock.calls[1][0];
      const toolResultBlock = followUp.messages[followUp.messages.length - 1]
        .content[0];
      expect(toolResultBlock.is_error).toBe(true);
      expect(toolResultBlock.content).toContain('Blocked keyword detected');
    });
  });

  describe('when the user presses stop', () => {
    it('returns what was generated, marked partial and still billed', async () => {
      const abort = new AbortController();

      stream.mockReturnValueOnce({
        async *[Symbol.asyncIterator]() {
          yield messageStart(900);
          yield textDelta('Apple earned ');
          abort.abort();
          const error = new Error('Request was aborted.');
          error.name = 'APIUserAbortError';
          throw error;
        },
        finalMessage: async () => {
          throw new Error('finalMessage must not resolve for an aborted turn');
        },
      });

      const { result } = await drain(
        service.streamChat([], 'q', abort.signal),
      );

      expect(result.partial).toBe(true);
      expect(result.content).toBe('Apple earned ');
      // The prompt was sent, so the turn is not free — S3 requires cost > 0.
      expect(result.inputTokens).toBe(900);
      expect(result.cost).toBeGreaterThan(0);
    });

    it('does not swallow a genuine failure as an abort', async () => {
      stream.mockReturnValueOnce({
        async *[Symbol.asyncIterator]() {
          yield messageStart(100);
          throw new Error('connection reset');
        },
        finalMessage: async () => endTurnMessage(),
      });

      await expect(
        drain(service.streamChat([], 'q', new AbortController().signal)),
      ).rejects.toThrow('connection reset');
    });
  });

  describe('guard rails on the loop itself', () => {
    it('stops after the round limit instead of looping forever', async () => {
      stream.mockReturnValue(
        scriptedStream(
          [messageStart(100), messageDelta(5)],
          toolUseMessage('SELECT 1 FROM financial_data'),
        ),
      );
      execute.mockResolvedValue({ rows: [], rowCount: 0, truncated: false });

      const { result } = await drain(
        service.streamChat([], 'q', new AbortController().signal),
      );

      expect(stream).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS);
      expect(execute).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS);
      expect(result.partial).toBe(false);
    });

    it('answers politely and stops when the model refuses', async () => {
      stream.mockReturnValueOnce(
        scriptedStream([messageStart(50), messageDelta(1)], {
          stop_reason: 'refusal',
          content: [],
        }),
      );

      const { result } = await drain(
        service.streamChat([], 'q', new AbortController().signal),
      );

      expect(result.content).toContain("I'm not able to help with that");
      expect(stream).toHaveBeenCalledTimes(1); // no retry with the same prompt
    });
  });
});
