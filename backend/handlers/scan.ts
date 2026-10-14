import { createHash } from 'node:crypto';

import { loadConfig } from '../config.js';
import { errorResponse, json, safely, type Handler } from '../http.js';
import { claudeReader, type ModelId, type ReadImage, type ScanKind } from '../scan/claude.js';
import { scanLimits } from '../scan/limits.js';
import type { Checked, ScanCheck } from '../scan/normalize.js';
import { parseScanRequest } from '../scan/request.js';
import { sampleExtraction } from '../scan/samples.js';
import { checkExtraction, scanWithSecondLook, type ResultByKind } from '../scan/scan.js';
import { PROMPT_VERSION } from '../scan/schema.js';
import { supabaseScanStore, type ScanStore } from '../scan/store.js';

/**
 * POST /api/scan-receipt and POST /api/scan-menu: a photo in, what is printed on it out, already
 * checked and in minor units. The order of work keeps cost down and demos safe:
 *   1. turn away bad requests;  2. answer from the cache if this exact photo was read before;
 *   3. count the scan against today's limits;  4. read it with Haiku, Sonnet if needed;
 *   5. if the AI cannot be used and the photo is a demo sample, answer from the sample.
 */

export interface ScanReply<K extends ScanKind> {
  kind: K;
  /** `ai`: read just now. `cache`: this photo was read before. `demo`: a sample answered without the AI. */
  source: 'ai' | 'cache' | 'demo';
  modelUsed: ModelId | null;
  escalated: boolean;
  result: ResultByKind[K];
  checks: ScanCheck[];
  uncertainFields: string[];
  /** AI scans this device has left today, when known. */
  scansLeftToday: number | null;
}

export interface ScanDeps {
  read?: ReadImage;
  store?: ScanStore;
  now?: () => Date;
}

const NOT_KIND_MESSAGE: Record<ScanKind, string> = {
  receipt: 'That does not look like a receipt. Try again with the whole receipt in the frame.',
  menu: 'That does not look like a menu. Try again with the prices in the frame.',
};

function reply<K extends ScanKind>(
  kind: K,
  checked: Checked<ResultByKind[K]>,
  meta: Pick<ScanReply<K>, 'source' | 'modelUsed' | 'escalated' | 'scansLeftToday'>,
): Response {
  if (!checked.result) {
    const unsupported = checked.checks.some((check) => check.code === 'currency_unsupported');
    return json(
      {
        error: unsupported ? 'currency_unsupported' : `not_a_${kind}`,
        message: unsupported ? 'ITER cannot read prices in this currency yet. You can type the expense in instead.' : NOT_KIND_MESSAGE[kind],
        checks: checked.checks,
      },
      422,
    );
  }
  const body: ScanReply<K> = { kind, ...meta, result: checked.result, checks: checked.checks, uncertainFields: checked.uncertainFields };
  return json(body);
}

export function scanHandler<K extends ScanKind>(kind: K, deps: ScanDeps = {}): Handler {
  return safely(async (request) => {
    const parsed = await parseScanRequest(request);
    if (!parsed.ok) return errorResponse(parsed.status, parsed.error, parsed.message);
    const { deviceId, image, bytes, sampleId, context } = parsed.request;

    const config = loadConfig();
    const store = deps.store ?? (config.supabase ? supabaseScanStore(config.supabase) : undefined);
    const apiKey = config.anthropicApiKey;
    const read = deps.read ?? (apiKey ? claudeReader(apiKey) : undefined);
    const day = (deps.now?.() ?? new Date()).toISOString().slice(0, 10);
    const cacheKey = createHash('sha256').update(`${kind}:${PROMPT_VERSION}:`).update(bytes).digest('hex');
    const sample = sampleExtraction(kind, sampleId);
    const fromSample = () =>
      sample ? reply(kind, checkExtraction(kind, sample, context), { source: 'demo', modelUsed: null, escalated: false, scansLeftToday: null }) : null;

    // 2. The same photo again: free and instant.
    if (store) {
      const cached = await store.readCache(cacheKey, kind).catch((error: unknown) => {
        console.error('[scan] cache read failed', error);
        return null;
      });
      if (cached) {
        return reply(kind, checkExtraction(kind, cached.extraction, context), { source: 'cache', modelUsed: cached.modelUsed, escalated: false, scansLeftToday: null });
      }
    }

    if (!read) {
      return fromSample() ?? errorResponse(503, 'ai_unavailable', 'Scanning is not set up on the server yet. You can type the expense in instead.');
    }

    // 3. Count it. If the counter itself is unreachable the scan goes ahead: the prepaid
    //    Anthropic credit (with auto-reload off) is the last line of defence for the bill.
    const deviceLimit = scanLimits.perDevicePerDay[kind];
    let scansLeftToday: number | null = null;
    if (store) {
      try {
        const claim = await store.claim(deviceId, kind, day, deviceLimit, scanLimits.allDevicesPerDay);
        if (!claim.allowed) {
          return (
            fromSample() ??
            errorResponse(
              429,
              'limit_reached',
              claim.globalCapReached
                ? 'ITER has reached its scanning limit for today. You can type the expense in instead.'
                : `You have used today's ${deviceLimit} ${kind} scans. You can type the expense in instead, or scan again tomorrow.`,
            )
          );
        }
        scansLeftToday = Math.max(0, deviceLimit - claim.deviceUsed);
      } catch (error) {
        console.error('[scan] scan counter unavailable', error);
      }
    }

    // 4. Read it.
    let attempt;
    try {
      attempt = await scanWithSecondLook(kind, image, context, read);
    } catch (error) {
      console.error('[scan] the AI could not read the image', error);
      if (store) await store.release(deviceId, kind, day).catch(() => undefined);
      return fromSample() ?? errorResponse(502, 'scan_failed', 'The photo could not be read just now. Try again, or type the expense in.');
    }

    if (store && attempt.checked.result) {
      await store
        .writeCache(cacheKey, kind, { extraction: attempt.extraction, modelUsed: attempt.modelUsed })
        .catch((error: unknown) => console.error('[scan] cache write failed', error));
    }
    return reply(kind, attempt.checked, { source: 'ai', modelUsed: attempt.modelUsed, escalated: attempt.escalated, scansLeftToday });
  });
}

export const postScanReceipt = scanHandler('receipt');
export const postScanMenu = scanHandler('menu');
