import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Conversation } from './conversation.entity';

export type MessageRole = 'user' | 'assistant';

/** Shape persisted in tool_calls — the SQL the model asked to run. */
export interface StoredToolCall {
  name: string;
  arguments: string;
}

/** Shape persisted in tool_results — enough to redraw the UI, not the rows. */
export interface StoredToolResult {
  query: string;
  rowCount?: number;
  error?: string;
}

@Entity('messages')
@Index('idx_messages_created_at', ['createdAt'])
export class Message extends BaseEntity {
  @Index('idx_messages_conversation_id')
  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation!: Conversation;

  @Column({ type: 'varchar', length: 20 })
  role!: MessageRole;

  /** Nullable: a reply stopped before the first token has no text at all. */
  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ name: 'tool_calls', type: 'jsonb', nullable: true })
  toolCalls!: StoredToolCall[] | null;

  @Column({ name: 'tool_results', type: 'jsonb', nullable: true })
  toolResults!: StoredToolResult[] | null;

  @Column({ name: 'input_tokens', type: 'int', default: 0 })
  inputTokens!: number;

  @Column({ name: 'output_tokens', type: 'int', default: 0 })
  outputTokens!: number;

  /**
   * node-postgres returns DECIMAL as a string, because most decimals do not fit
   * a JS number without loss. Costs here are fractions of a cent, so the
   * conversion is safe — but it has to be explicit, or the API would serialise
   * cost as "0.001234" and arithmetic on the client would concatenate.
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    default: 0,
    transformer: {
      to: (value: number): number => value,
      from: (value: string | null): number => (value === null ? 0 : Number(value)),
    },
  })
  cost!: number;

  /** True when the user pressed stop before the model finished. */
  @Column({ name: 'is_partial', type: 'boolean', default: false })
  isPartial!: boolean;
}
