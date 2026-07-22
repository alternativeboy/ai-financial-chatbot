import type { StoredToolCall, StoredToolResult } from '../../chat/entities/message.entity';

/**
 * Events the LLM pipeline produces. The controller serialises these to SSE;
 * `done` and `error` are added there, since only the controller knows whether
 * the message was persisted.
 */
export type StreamEvent =
  | { type: 'token'; data: { content: string } }
  | { type: 'tool_call'; data: { name: string; arguments: string } }
  | {
      type: 'tool_result';
      data: {
        query: string;
        rows: Record<string, unknown>[];
        rowCount: number;
        truncated: boolean;
      };
    }
  | {
      type: 'usage';
      data: { inputTokens: number; outputTokens: number; cost: number };
    };

/** What a completed (or interrupted) turn leaves behind for persistence. */
export interface ChatTurnResult {
  content: string;
  toolCalls: StoredToolCall[];
  toolResults: StoredToolResult[];
  inputTokens: number;
  outputTokens: number;
  cost: number;
  /** True when the user disconnected before the model finished. */
  partial: boolean;
}

/** One prior turn, flattened to the text the model needs as context. */
export interface HistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}
