/** Why a request to the backend failed, in terms the UI can explain to the user. */
export type RequestFailure = 'offline' | 'timeout' | 'server' | 'invalid_response';

export type RequestResult<T> = { ok: true; data: T } | { ok: false; reason: RequestFailure; status?: number };

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  timeoutMs?: number;
  /** Replaceable in tests. */
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Calls a JSON endpoint and never throws: every failure (no internet, timeout, server error,
 * malformed reply) comes back as a typed result so screens can show a proper message.
 */
export async function requestJson<T>(url: string, options: RequestOptions = {}): Promise<RequestResult<T>> {
  const { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method,
      signal: controller.signal,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) return { ok: false, reason: 'server', status: response.status };
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
