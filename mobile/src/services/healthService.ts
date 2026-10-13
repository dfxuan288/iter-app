import { env } from '@/config/env';
import { requestJson, type RequestOptions, type RequestResult } from '@/services/http';

export interface ServerHealth {
  status: 'ok';
  service: string;
  version: string;
  time: string;
  aiConfigured: boolean;
}

function isServerHealth(value: unknown): value is ServerHealth {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.status === 'ok' && typeof v.version === 'string' && typeof v.aiConfigured === 'boolean';
}

export const healthService = {
  /** Checks that the ITER backend is reachable. */
  async check(options: Pick<RequestOptions, 'fetchImpl' | 'timeoutMs'> = {}): Promise<RequestResult<ServerHealth>> {
    const result = await requestJson<unknown>(`${env.apiBaseUrl}/api/health`, { timeoutMs: 5_000, ...options });
    if (!result.ok) return result;
    return isServerHealth(result.data) ? { ok: true, data: result.data } : { ok: false, reason: 'invalid_response' };
  },
};
