import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Message } from './message.entity';

export const DEFAULT_CONVERSATION_TITLE = 'New Chat';

@Entity('conversations')
export class Conversation extends BaseEntity {
  /**
   * The browser-generated UUID that owns this conversation. Every read and
   * write is scoped by it; there is no other ownership check in the system.
   */
  @Index('idx_conversations_session_id')
  @Column({ name: 'session_id', type: 'varchar', length: 64 })
  sessionId!: string;

  @Column({ type: 'varchar', length: 255, default: DEFAULT_CONVERSATION_TITLE })
  title!: string;

  @Index('idx_conversations_updated_at')
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  /**
   * Soft delete. TypeORM's @DeleteDateColumn makes every find() exclude these
   * rows automatically, so a deleted conversation 404s without any repository
   * needing to remember a `deletedAt IS NULL` clause.
   */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => Message, (message) => message.conversation)
  messages!: Message[];
}
