import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { deriveConversationTitle } from './conversation-title';
import {
  Conversation,
  DEFAULT_CONVERSATION_TITLE,
} from './entities/conversation.entity';

/**
 * Every method takes sessionId as its first argument and folds it into the
 * WHERE clause. A conversation belonging to another session is indistinguishable
 * from one that never existed: both produce NotFoundException, never Forbidden.
 * A 403 would confirm the id is real, which is exactly the fact a guesser is
 * trying to learn.
 */
@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
  ) {}

  async create(sessionId: string): Promise<Conversation> {
    return this.conversations.save(
      this.conversations.create({
        sessionId,
        title: DEFAULT_CONVERSATION_TITLE,
      }),
    );
  }

  async findAll(
    sessionId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Conversation[]; total: number }> {
    const [items, total] = await this.conversations.findAndCount({
      where: { sessionId },
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  async findOne(sessionId: string, id: string): Promise<Conversation> {
    const conversation = await this.conversations.findOne({
      where: { id, sessionId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async softDelete(sessionId: string, id: string): Promise<void> {
    // Scoped by sessionId in the DELETE itself, not merely in a preceding read.
    // Checking ownership and then deleting by id alone would leave a window in
    // which the two statements disagree.
    //
    // deletedAt IS NULL is load-bearing: softDelete() does not filter out rows
    // it has already stamped, so without it a second DELETE re-stamps the row,
    // reports one affected row, and answers 200 for a conversation that GET
    // already treats as gone.
    const result = await this.conversations.softDelete({
      id,
      sessionId,
      deletedAt: IsNull(),
    });

    if (!result.affected) {
      throw new NotFoundException('Conversation not found');
    }
  }

  /** Moves a conversation to the top of the sidebar after new activity. */
  async touch(sessionId: string, id: string): Promise<void> {
    await this.conversations.update({ id, sessionId }, { updatedAt: new Date() });
  }

  /**
   * Names a conversation after its first user message.
   *
   * The default title is part of the WHERE clause so this is a single atomic
   * statement: a conversation the user has already renamed, or one that raced
   * with a second call, keeps the title it has. No read-modify-write.
   */
  async applyAutoTitle(
    sessionId: string,
    id: string,
    firstUserMessage: string,
  ): Promise<void> {
    await this.conversations.update(
      { id, sessionId, title: DEFAULT_CONVERSATION_TITLE },
      { title: deriveConversationTitle(firstUserMessage) },
    );
  }
}
