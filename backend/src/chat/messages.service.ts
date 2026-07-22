import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatTurnResult, HistoryTurn } from '../llm/interfaces/stream-event.interface';
import { ChatService } from './chat.service';
import { Message } from './entities/message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messages: Repository<Message>,
    private readonly chat: ChatService,
  ) {}

  async findByConversation(
    sessionId: string,
    conversationId: string,
  ): Promise<Message[]> {
    // Ownership first. Without this a caller could read any conversation's
    // messages by guessing its id, since messages carry no session_id of their
    // own.
    await this.chat.findOne(sessionId, conversationId);

    return this.messages.find({
      where: { conversationId },
      // id is a tiebreaker only. created_at defaults to clock_timestamp(), so
      // ties should not occur — but ordering is the difference between a
      // readable transcript and a scrambled one, so it does not rely on that.
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  async createUserMessage(
    conversationId: string,
    content: string,
  ): Promise<Message> {
    return this.messages.save(
      this.messages.create({ conversationId, role: 'user', content }),
    );
  }

  async createAssistantMessage(
    conversationId: string,
    turn: ChatTurnResult,
  ): Promise<Message> {
    return this.messages.save(
      this.messages.create({
        conversationId,
        role: 'assistant',
        // A turn stopped before the first token has nothing to store, and the
        // column is nullable precisely for that case.
        content: turn.content.length > 0 ? turn.content : null,
        toolCalls: turn.toolCalls.length > 0 ? turn.toolCalls : null,
        toolResults: turn.toolResults.length > 0 ? turn.toolResults : null,
        inputTokens: turn.inputTokens,
        outputTokens: turn.outputTokens,
        cost: turn.cost,
        isPartial: turn.partial,
      }),
    );
  }

  /**
   * Prior turns, flattened to the text the model needs as context.
   *
   * Tool calls are not replayed: their results are already reflected in the
   * assistant text, and resending them would mean reconstructing exact
   * tool_use/tool_result pairings for no benefit.
   */
  async historyFor(conversationId: string): Promise<HistoryTurn[]> {
    const rows = await this.messages.find({
      where: { conversationId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    const turns = rows
      .filter((message) => (message.content ?? '').trim().length > 0)
      .map((message) => ({
        role: message.role,
        content: message.content as string,
      }));

    // The API requires the first message to be from the user. An interrupted
    // assistant reply with no text is dropped above, which can leave an
    // assistant turn at the front.
    while (turns.length > 0 && turns[0].role !== 'user') {
      turns.shift();
    }

    return turns;
  }
}
