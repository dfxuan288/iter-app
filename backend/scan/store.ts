import type { SupabaseConfig } from '../config.js';
import type { FetchLike } from '../fx/rates.js';
import { MODELS, type ExtractionByKind, type ModelId, type ScanKind } from './claude.js';
import { menuExtraction, receiptExtraction } from './schema.js';

const isModel = (value: unknown): value is ModelId => Object.values(MODELS).includes(value as ModelId);

/**
 * The scan counter and the scan cache, kept in Supabase (tables `scan_usage` and `scan_cache`,
 * functions `claim_scan` and `release_scan`; see supabase/migrations/0002).
 */

export interface Claim {
  allowed: boolean;
  /** Scans this device has used today, including this one when allowed. */
  deviceUsed: number;
  /** True when everyone together has reached the daily cap, rather than this device. */
  globalCapReached: boolean;
}

export interface CachedScan<K extends ScanKind> {
  extraction: ExtractionByKind[K];
  modelUsed: ModelId;
}

export interface ScanStore {
  claim(deviceId: string, kind: ScanKind, day: string, deviceLimit: number, globalLimit: number): Promise<Claim>;
  release(deviceId: string, kind: ScanKind, day: string): Promise<void>;
  readCache<K extends ScanKind>(key: string, kind: K): Promise<CachedScan<K> | null>;
  writeCache<K extends ScanKind>(key: string, kind: K, value: CachedScan<K>): Promise<void>;
}

const TIMEOUT_MS = 5_000;

export function supabaseScanStore(config: SupabaseConfig, fetchImpl: FetchLike = fetch): ScanStore {
  const headers = { apikey: config.secretKey, Authorization: `Bearer ${config.secretKey}`, 'Content-Type': 'application/json' };
  const call = async (path: string, init: RequestInit = {}) => {
    const response = await fetchImpl(`${config.url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error(`Supabase ${path.split('?')[0]} replied ${response.status}`);
    return response;
  };

  return {
    async claim(deviceId, kind, day, deviceLimit, globalLimit) {
      const response = await call('rpc/claim_scan', {
        method: 'POST',
        body: JSON.stringify({ p_device_id: deviceId, p_kind: kind, p_day: day, p_device_limit: deviceLimit, p_global_limit: globalLimit }),
      });
      const body: unknown = await response.json();
      const row = (Array.isArray(body) ? body[0] : body) as { allowed?: unknown; device_used?: unknown; global_used?: unknown } | undefined;
      if (!row || typeof row.allowed !== 'boolean') throw new Error('Supabase claim_scan returned an unexpected answer');
      return {
        allowed: row.allowed,
        deviceUsed: Number(row.device_used) || 0,
        globalCapReached: !row.allowed && Number(row.global_used) >= globalLimit,
      };
    },

    async release(deviceId, kind, day) {
      await call('rpc/release_scan', { method: 'POST', body: JSON.stringify({ p_device_id: deviceId, p_kind: kind, p_day: day }) });
    },

    async readCache(key, kind) {
      const response = await call(`scan_cache?select=result,model_used&cache_key=eq.${encodeURIComponent(key)}&kind=eq.${kind}`);
      const rows = (await response.json()) as { result?: unknown; model_used?: unknown }[];
      const row = rows[0];
      if (!row || !isModel(row.model_used)) return null;
      // Checked again on the way out, so an old or damaged row can never reach the app.
      const parsed = (kind === 'receipt' ? receiptExtraction : menuExtraction).safeParse(row.result);
      return parsed.success ? { extraction: parsed.data as ExtractionByKind[typeof kind], modelUsed: row.model_used } : null;
    },

    async writeCache(key, kind, value) {
      await call('scan_cache?on_conflict=cache_key', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ cache_key: key, kind, result: value.extraction, model_used: value.modelUsed }),
      });
    },
  };
}
