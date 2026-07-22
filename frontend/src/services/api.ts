import { getSessionId } from '../stores/session.store';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Headers every request needs. Kept in one place so the streaming hook — which
 * uses fetch directly rather than going through request() — cannot drift out of
 * sync and start sending anonymous requests.
 */
export function sessionHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Session-Id': getSessionId(),
  };
}

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: { ...sessionHeaders(), ...(init.headers ?? {}) },
  });

  if (!response.ok) {
    throw new ApiError(
      `Request failed with status ${response.status}`,
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
