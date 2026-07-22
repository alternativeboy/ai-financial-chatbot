const STORAGE_KEY = 'smc_session_id';

/**
 * The browser's identity. There is no login: possession of this UUID is what
 * grants access to a set of conversations, and the server scopes every query by
 * it. Losing it means losing the history; sharing it means sharing the history.
 */
export function getSessionId(): string {
  let sessionId = localStorage.getItem(STORAGE_KEY);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, sessionId);
  }

  return sessionId;
}
