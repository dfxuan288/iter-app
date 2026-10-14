import { env } from '@/config/env';
import type { IsoDate } from '@/domain/dates';
import { currencies, type CurrencyCode } from '@/domain/money';
import { CATEGORIES, type Category, type Trip } from '@/domain/types';
import { getDeviceId } from '@/services/deviceId';
import { requestJson, type RequestOptions } from '@/services/http';

/**
 * Sends a receipt photo to the ITER backend (/api/scan-receipt) and checks the reply before the
 * app trusts it. The backend reads the photo with AI and checks the numbers; see backend/scan.
 */

export interface ScanCheck {
  code: string;
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

/** What the receipt says, already in minor units of `currency`. */
export interface ScannedReceipt {
  merchantName: string;
  merchantNameOriginal: string | null;
  purchaseDate: IsoDate | null;
  currency: CurrencyCode;
  items: { name: string; nameOriginal: string | null; quantity: number | null; lineTotalMinor: number }[];
  subtotalMinor: number | null;
  taxLines: { ratePercent: number | null; amountMinor: number }[];
  serviceChargeMinor: number | null;
  totalMinor: number;
  taxIncluded: boolean;
  suggestedCategory: Category;
  taxFreeShop: 'yes' | 'no' | 'unknown';
  language: string;
  confidence: number;
}

export interface ReceiptScan {
  readBy: 'ai' | 'cache' | 'demo';
  modelUsed: string | null;
  receipt: ScannedReceipt;
  checks: ScanCheck[];
  /** Fields the review screen should highlight. */
  uncertainFields: string[];
}

export type ScanOutcome =
  | { ok: true; scan: ReceiptScan }
  /** No connection or no answer in time: keep the photo and try again later. */
  | { ok: false; retryLater: true }
  /** The backend answered but could not give a reading. `canRetry` says whether trying the same photo again may help. */
  | { ok: false; retryLater: false; code: string; message: string; canRetry: boolean };

export interface ScanRequest {
  /** JPEG, base64. */
  image: string;
  sampleId?: string;
  trip: Pick<Trip, 'localCurrency' | 'startDate' | 'endDate'>;
}

/** Each AI scan can take Haiku and then Sonnet, so allow well over a normal request. */
const SCAN_TIMEOUT_MS = 90_000;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isInt = (value: unknown): value is number => Number.isSafeInteger(value);
const intOrNull = (value: unknown): number | null => (isInt(value) ? value : null);
const text = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const textOrNull = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);
const isDate = (value: unknown): value is IsoDate => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T => (options.includes(value as T) ? (value as T) : fallback);

/** Checks a reply field by field. Returns null if it is not a usable reading. */
export function parseReceiptReply(body: unknown): ReceiptScan | null {
  if (!isObject(body) || !isObject(body.result)) return null;
  const r = body.result;
  const currency = r.currency;
  if (typeof currency !== 'string' || !(currency in currencies) || !isInt(r.totalMinor) || r.totalMinor <= 0) return null;

  const items = Array.isArray(r.items)
    ? r.items.filter(isObject).flatMap((item) =>
        isInt(item.lineTotalMinor)
          ? [{ name: text(item.name, 'Item'), nameOriginal: textOrNull(item.nameOriginal), quantity: typeof item.quantity === 'number' ? item.quantity : null, lineTotalMinor: item.lineTotalMinor }]
          : [],
      )
    : [];
  const taxLines = Array.isArray(r.taxLines)
    ? r.taxLines.filter(isObject).flatMap((line) =>
        isInt(line.amountMinor) ? [{ ratePercent: typeof line.ratePercent === 'number' ? line.ratePercent : null, amountMinor: line.amountMinor }] : [],
      )
    : [];
  const checks = Array.isArray(body.checks)
    ? body.checks.filter(isObject).map((check) => ({
        code: text(check.code),
        field: text(check.field),
        severity: oneOf(check.severity, ['error', 'warning'] as const, 'warning'),
        message: text(check.message),
      }))
    : [];

  return {
    readBy: oneOf(body.source, ['ai', 'cache', 'demo'] as const, 'ai'),
    modelUsed: textOrNull(body.modelUsed),
    receipt: {
      merchantName: text(r.merchantName, 'Receipt').trim() || 'Receipt',
      merchantNameOriginal: textOrNull(r.merchantNameOriginal),
      purchaseDate: isDate(r.purchaseDate) ? r.purchaseDate : null,
      currency: currency as CurrencyCode,
      items,
      subtotalMinor: intOrNull(r.subtotalMinor),
      taxLines,
      serviceChargeMinor: intOrNull(r.serviceChargeMinor),
      totalMinor: r.totalMinor,
      taxIncluded: r.taxIncluded === true,
      suggestedCategory: oneOf(r.suggestedCategory, CATEGORIES, 'shopping'),
      taxFreeShop: oneOf(r.taxFreeShop, ['yes', 'no', 'unknown'] as const, 'unknown'),
      language: text(r.language),
      confidence: typeof r.confidence === 'number' ? Math.min(1, Math.max(0, r.confidence)) : 0,
    },
    checks,
    uncertainFields: Array.isArray(body.uncertainFields) ? body.uncertainFields.filter((f): f is string => typeof f === 'string') : [],
  };
}

const FALLBACK_MESSAGES: Record<number, string> = {
  413: 'That photo is too large. Try again with a smaller one.',
  422: 'That does not look like a receipt. Try again with the whole receipt in the frame.',
  429: 'Today’s scanning limit has been reached. You can type the expense in instead.',
};

export async function scanReceipt(request: ScanRequest, options: Pick<RequestOptions, 'fetchImpl'> = {}): Promise<ScanOutcome> {
  const result = await requestJson<unknown>(`${env.apiBaseUrl}/api/scan-receipt`, {
    method: 'POST',
    timeoutMs: SCAN_TIMEOUT_MS,
    fetchImpl: options.fetchImpl,
    headers: { 'X-Device-Id': await getDeviceId() },
    body: {
      image: request.image,
      mediaType: 'image/jpeg',
      sampleId: request.sampleId,
      currencyHint: request.trip.localCurrency,
      tripStart: request.trip.startDate,
      tripEnd: request.trip.endDate,
    },
  });

  if (result.ok) {
    const scan = parseReceiptReply(result.data);
    return scan
      ? { ok: true, scan }
      : { ok: false, retryLater: false, code: 'invalid_reply', message: 'The reply from the server could not be read. Try again.', canRetry: true };
  }
  if (result.reason === 'offline' || result.reason === 'timeout') return { ok: false, retryLater: true };

  const status = result.status ?? 0;
  const body = isObject(result.body) ? result.body : {};
  const message = textOrNull(body.message) ?? FALLBACK_MESSAGES[status] ?? 'The photo could not be read just now. Try again, or type the expense in.';
  // A different photo is needed for 4xx answers, except the daily limit, which passes.
  const canRetry = status >= 500 || status === 429 || status === 0;
  return { ok: false, retryLater: false, code: textOrNull(body.error) ?? `http_${status}`, message, canRetry };
}
