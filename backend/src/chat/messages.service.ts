import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}
