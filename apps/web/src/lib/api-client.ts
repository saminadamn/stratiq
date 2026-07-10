import type { ApiErrorResponse, AuthTokens } from '@stratiq/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

// Module-level, not React state: the access token needs to be readable from
// plain async functions (rawRequest) that aren't components, and there is
// deliberately no localStorage write for it — only the refresh token persists
// (see auth-context.tsx) — to shrink what an XSS payload could exfiltrate.
let tokens: Tokens | null = null;
let onSessionExpired: (() => void) | null = null;

export function setTokens(next: Tokens | null): void {
  tokens = next;
}

export function setOnSessionExpired(handler: () => void): void {
  onSessionExpired = handler;
}

async function parseErrorResponse(response: Response): Promise<never> {
  const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
  throw new ApiError(
    body?.error.code ?? 'UNKNOWN_ERROR',
    body?.error.message ?? 'Something went wrong.',
    response.status,
  );
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  // 'blob' for binary/file responses (CSV/PDF export) — everything else in
  // this app is JSON, so defaulting to 'json' keeps every other call site
  // unchanged.
  responseType?: 'json' | 'blob';
}

async function rawRequest<T>(path: string, options: RequestOptions): Promise<T> {
  // A FormData body (dataset file uploads) must NOT get a Content-Type here —
  // the browser sets one itself, including the multipart boundary, only if
  // this code doesn't override it.
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };
  if (options.auth && tokens) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    ...(options.body !== undefined
      ? { body: isFormData ? (options.body as FormData) : JSON.stringify(options.body) }
      : {}),
  });

  if (response.status === 204) {
    return undefined as T;
  }
  if (!response.ok) {
    await parseErrorResponse(response);
  }
  if (options.responseType === 'blob') {
    return (await response.blob()) as T;
  }
  return (await response.json()) as T;
}

// A single 401 triggers exactly one refresh-and-retry. If the refresh itself
// fails, the session is torn down via onSessionExpired instead of looping.
async function requestWithRefresh<T>(path: string, options: RequestOptions): Promise<T> {
  try {
    return await rawRequest<T>(path, options);
  } catch (err) {
    const shouldAttemptRefresh =
      err instanceof ApiError && err.status === 401 && options.auth && tokens;
    if (!shouldAttemptRefresh) {
      throw err;
    }

    try {
      const refreshed = await rawRequest<AuthTokens>('/api/v1/auth/refresh', {
        method: 'POST',
        body: { refreshToken: tokens!.refreshToken },
        auth: false,
      });
      setTokens({ accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken });
      return await rawRequest<T>(path, options);
    } catch (refreshErr) {
      setTokens(null);
      onSessionExpired?.();
      throw refreshErr;
    }
  }
}

export const apiClient = {
  get: <T>(path: string, auth = true): Promise<T> =>
    requestWithRefresh<T>(path, { method: 'GET', auth }),
  post: <T>(path: string, body?: unknown, auth = true): Promise<T> =>
    requestWithRefresh<T>(path, { method: 'POST', body, auth }),
  patch: <T>(path: string, body?: unknown, auth = true): Promise<T> =>
    requestWithRefresh<T>(path, { method: 'PATCH', body, auth }),
  del: <T>(path: string, auth = true): Promise<T> =>
    requestWithRefresh<T>(path, { method: 'DELETE', auth }),
  postForBlob: (path: string, body?: unknown, auth = true): Promise<Blob> =>
    requestWithRefresh<Blob>(path, { method: 'POST', body, auth, responseType: 'blob' }),
  getForBlob: (path: string, auth = true): Promise<Blob> =>
    requestWithRefresh<Blob>(path, { method: 'GET', auth, responseType: 'blob' }),
};
