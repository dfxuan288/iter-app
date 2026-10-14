/** Why a request to the backend failed, in terms the UI can explain to the user. */
export type RequestFailure = 'offline' | 'timeout' | 'server' | 'invalid_response';

export type RequestResult<T> =
  | { ok: true; data: T }
  /** `body` is the server's JSON error reply when it sent one, e.g. { error, message }. */
  | { ok: false; reason: RequestFailure; status?: number; body?: unknown };

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Replaceable in tests. */
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Calls a JSON endpoint and never throws: every failure (no internet, timeout, server error,
 * malformed reply) comes back as a typed result so screens can show a proper message.
 */
export async function requestJson<T>(url: string, options: RequestOptions = {}): Promise<RequestResult<T>> {
  const { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch, headers = {} } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method,
      signal: controller.signal,
      headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        // No JSON explanation: the status code is all there is.
      }
      return { ok: false, reason: 'server', status: response.status, body: errorBody };
    }
    try {
      return { ok: true, data: (await response.json()) as T };
    } catch {
      return { ok: false, reason: 'invalid_response', status: response.status };
    }
  } catch {
    return { ok: false, reason: controller.signal.aborted ? 'timeout' : 'offline' };
  } finally {
    clearTimeout(timer);
  }
}
