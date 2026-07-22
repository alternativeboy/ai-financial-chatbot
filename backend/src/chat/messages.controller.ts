import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { SessionId } from '../common/decorators/session-id.decorator';
import { LlmService } from '../llm/llm.service';
import { ChatService } from './chat.service';
import {
  MessageResponse,
  toMessageResponse,
} from './dto/conversation-response.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesService } from './messages.service';

@Controller('conversations/:conversationId/messages')
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(
    private readonly messages: MessagesService,
    private readonly chat: ChatService,
    private readonly llm: LlmService,
  ) {}

  @Get()
  async findAll(
    @SessionId() sessionId: string,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ): Promise<MessageResponse[]> {
    const messages = await this.messages.findByConversation(
      sessionId,
      conversationId,
    );

    return messages.map(toMessageResponse);
  }

  /**
   * Streams an assistant reply as Server-Sent Events.
   *
   * Written to the raw response rather than through Nest's @Sse() helper
   * because this endpoint has to survive the client hanging up: on disconnect
   * the turn is aborted, whatever was generated is still persisted and billed,
   * and the `done` event is deliberately withheld so the client can tell an
   * interrupted message from a complete one.
   */
  @Post()
  async create(
    @SessionId() sessionId: string,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() body: CreateMessageDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    // Everything that can fail with a normal status code happens before the
    // first byte of the stream. Once SSE headers are out, a 404 is no longer
    // expressible.
    await this.chat.findOne(sessionId, conversationId);

    // Read history before storing the new message, so the turn being answered
    // is not also part of the context handed to the model.
    const history = await this.messages.historyFor(conversationId);
    await this.messages.createUserMessage(conversationId, body.content);
    await this.chat.applyAutoTitle(sessionId, conversationId, body.content);

    response.writeHead(HttpStatus.OK, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Stops a reverse proxy from buffering the stream into one lump.
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders();

    const abort = new AbortController();
    let settled = false;

    // Both events are wired deliberately. `request` emits close when the
    // inbound side ends, which for a long-lived SSE response is not reliably
    // the moment the browser goes away; `response` close is what fires when the
    // socket itself is torn down. Whichever arrives first, the turn is aborted
    // exactly once, and `settled` keeps a normal completion from tripping it.
    const onDisconnect = (): void => {
      if (settled || abort.signal.aborted) return;
      this.logger.log(
        `Client disconnected — aborting turn for conversation ${conversationId}`,
      );
      abort.abort();
    };
    request.on('close', onDisconnect);
    response.on('close', onDisconnect);

    const send = (event: string, data: unknown): void => {
      response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const turnStream = this.llm.streamChat(
      history,
      body.content,
      abort.signal,
    )[Symbol.asyncIterator]();

    try {
      let step = await turnStream.next();
      while (!step.done) {
        send(step.value.type, step.value.data);
        step = await turnStream.next();
      }

      const turn = step.value;
      settled = true;
      const saved = await this.messages.createAssistantMessage(
        conversationId,
        turn,
      );
      await this.chat.touch(sessionId, conversationId);
      this.logger.log(
        `Saved ${turn.partial ? 'partial' : 'complete'} message ${saved.id} ` +
          `(${turn.outputTokens} output tokens, $${turn.cost.toFixed(6)})`,
      );

      if (!turn.partial) {
        send('done', { messageId: saved.id });
      }
      // No `done` when the turn was interrupted: its absence is how the client
      // knows to mark the message as stopped.
    } catch (error) {
      this.logger.error(
        `Streaming failed for conversation ${conversationId}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Deliberately vague: the underlying error can quote the SQL the model
      // wrote and the database's reply, neither of which belongs in a browser.
      send('error', {
        message: 'Something went wrong while generating a response.',
      });
    } finally {
      response.end();
    }
  }
}
