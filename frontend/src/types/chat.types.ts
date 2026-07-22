export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ToolCall {
  name: string;
  arguments: string;
}

export interface ToolResult {
  query: string;
  rowCount?: number;
  error?: string;
}

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string | null;
  toolCalls: ToolCall[] | null;
  toolResults: ToolResult[] | null;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  isPartial: boolean;
  createdAt: string;
}

/** Rows come back untyped — the columns depend on the SQL the model wrote. */
export type ResultRow = Record<string, string | number | null>;

/** A tool call plus whatever came back, as rendered while streaming. */
export interface LiveToolCall {
  name: string;
  arguments: string;
  rows?: ResultRow[];
  rowCount?: number;
  truncated?: boolean;
  /** Set when the query was rejected or failed. */
  error?: string;
}

export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}
