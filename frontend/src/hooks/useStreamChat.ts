import { useCallback, useRef, useState } from 'react';
import { apiUrl, sessionHeaders } from '../services/api';
import type { LiveToolCall, ResultRow, UsageInfo } from '../types/chat.types';

export interface StreamState {
  isStreaming: boolean;
  text: string;
  toolCalls: LiveToolCall[];
  usage: UsageInfo | null;
  error: string | null;
}

const IDLE: StreamState = {
  isStreaming: false,
  text: '',
  toolCalls: [],
  usage: null,
  error: null,
};

export interface StreamOutcome {
  /** False when the user pressed stop or the connection dropped early. */
  completed: boolean;
  error: string | null;
}

/**
 * Streams one assistant turn over POST.
 *
 * fetch + ReadableStream rather than EventSource: EventSource can only issue
 * GET requests and cannot set headers, so it could carry neither the message
 * body nor X-Session-Id.
 */
export function useStreamChat() {
  const [state, setState] = useState<StreamState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setState(IDLE);
  }, []);

  const send = useCallback(
    async (conversationId: string, content: string): Promise<StreamOutcome> => {
      const controller = new AbortController();
      abortRef.current = controller;
      setState({ ...IDLE, isStreaming: true });

      // The server withholds `done` when a turn is interrupted, so its absence
      // — not the presence of an error — is what marks a message partial.
      let sawDone = false;
      let failure: string | null = null;

      const handleFrame = (frame: string): void => {
        let eventName = '';
        let raw = '';
        for (const line of frame.split('\n')) {
          if (line.startsWith('event: ')) eventName = line.slice(7).trim();
          else if (line.startsWith('data: ')) raw = line.slice(6);
        }
        if (!eventName || !raw) return;

        const payload = JSON.parse(raw);

        switch (eventName) {
          case 'token':
            setState((prev) => ({ ...prev, text: prev.text + payload.content }));
            break;

          case 'tool_call':
            setState((prev) => ({
              ...prev,
              toolCalls: [
                ...prev.toolCalls,
                { name: payload.name, arguments: payload.arguments },
              ],
            }));
            break;

          case 'tool_result':
            setState((prev) => {
              const toolCalls = [...prev.toolCalls];
              // Match by SQL against the most recent call still awaiting rows —
              // the model can issue the same query twice in one turn.
              for (let i = toolCalls.length - 1; i >= 0; i -= 1) {
                if (
                  toolCalls[i].arguments === payload.query &&
                  toolCalls[i].rows === undefined
                ) {
                  toolCalls[i] = {
                    ...toolCalls[i],
                    rows: payload.rows as ResultRow[],
                    rowCount: payload.rowCount,
                    truncated: payload.truncated,
                  };
                  break;
                }
              }
              return { ...prev, toolCalls };
            });
            break;

          case 'usage':
            setState((prev) => ({ ...prev, usage: payload as UsageInfo }));
            break;

          case 'done':
            sawDone = true;
            break;

          case 'error':
            failure = payload.message ?? 'Something went wrong.';
            setState((prev) => ({ ...prev, error: failure }));
            break;
        }
      };

      try {
        const response = await fetch(
          apiUrl(`/conversations/${conversationId}/messages`),
          {
            method: 'POST',
            headers: sessionHeaders(),
            body: JSON.stringify({ content }),
            signal: controller.signal,
          },
        );

        if (!response.ok || !response.body) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          // stream: true keeps a multi-byte character split across two chunks
          // from being decoded as garbage.
          buffer += decoder.decode(value, { stream: true });

          // Frames are separated by a blank line. Anything after the last
          // separator is an incomplete frame and stays buffered.
          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            handleFrame(buffer.slice(0, boundary));
            buffer = buffer.slice(boundary + 2);
            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          failure =
            error instanceof Error ? error.message : 'Something went wrong.';
          setState((prev) => ({ ...prev, error: failure }));
        }
        // An abort is the user pressing stop — an expected outcome, not an
        // error. The server has already persisted the partial reply.
      } finally {
        abortRef.current = null;
        setState((prev) => ({ ...prev, isStreaming: false }));
      }

      return { completed: sawDone, error: failure };
    },
    [],
  );

  return { ...state, send, stop, reset };
}
