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
  /** The currency to expect, when it is not the trip's (e.g. the Thai sample menu on a Tokyo trip). */
  currencyHint?: CurrencyCode;
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

function parseChecks(value: unknown): ScanCheck[] {
  return Array.isArray(value)
    ? value.filter(isObject).map((check) => ({
        code: text(check.code),
        field: text(check.field),
        severity: oneOf(check.severity, ['error', 'warning'] as const, 'warning'),
        message: text(check.message),
      }))
    : [];
}

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
  const checks = parseChecks(body.checks);

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
  429: 'Today’s scanning limit has been reached.',
};

const NOT_KIND: Record<'receipt' | 'menu', string> = {
  receipt: 'That does not look like a receipt. Try again with the whole receipt in the frame.',
  menu: 'That does not look like a menu. Try again with the dishes and prices in the frame.',
};

type Outcome<T> = { ok: true; value: T } | { ok: false; retryLater: true } | { ok: false; retryLater: false; code: string; message: string; canRetry: boolean };

/** Sends a photo to /api/scan-receipt or /api/scan-menu and reads the reply with `parse`. */
async function sendScan<T>(kind: 'receipt' | 'menu', request: ScanRequest, parse: (body: unknown) => T | null, fetchImpl?: typeof fetch): Promise<Outcome<T>> {
  const result = await requestJson<unknown>(`${env.apiBaseUrl}/api/scan-${kind}`, {
    method: 'POST',
    timeoutMs: SCAN_TIMEOUT_MS,
    fetchImpl,
    headers: { 'X-Device-Id': await getDeviceId() },
    body: {
      image: request.image,
      mediaType: 'image/jpeg',
      sampleId: request.sampleId,
      currencyHint: request.currencyHint ?? request.trip.localCurrency,
      tripStart: request.trip.startDate,
      tripEnd: request.trip.endDate,
    },
  });

  if (result.ok) {
    const value = parse(result.data);
    return value !== null
      ? { ok: true, value }
      : { ok: false, retryLater: false, code: 'invalid_reply', message: 'The reply from the server could not be read. Try again.', canRetry: true };
  }
  if (result.reason === 'offline' || result.reason === 'timeout') return { ok: false, retryLater: true };

  const status = result.status ?? 0;
  const body = isObject(result.body) ? result.body : {};
  const fallback = status === 422 ? NOT_KIND[kind] : FALLBACK_MESSAGES[status];
  const message = textOrNull(body.message) ?? fallback ?? 'The photo could not be read just now. Try again.';
  // A different photo is needed for 4xx answers, except the daily limit, which passes.
  const canRetry = status >= 500 || status === 429 || status === 0;
  return { ok: false, retryLater: false, code: textOrNull(body.error) ?? `http_${status}`, message, canRetry };
}

export async function scanReceipt(request: ScanRequest, options: Pick<RequestOptions, 'fetchImpl'> = {}): Promise<ScanOutcome> {
  const outcome = await sendScan('receipt', request, parseReceiptReply, options.fetchImpl);
  return outcome.ok ? { ok: true, scan: outcome.value } : outcome;
}

/** A dish as read from a menu, with its printed price in minor units. */
export interface MenuDish {
  original: string;
  translation: string;
  description: string;
  priceMinor: number | null;
  containsPork: 'yes' | 'no' | 'unknown';
  containsAlcohol: 'yes' | 'no' | 'unknown';
}

export interface ScannedMenu {
  restaurantName: string | null;
  currency: CurrencyCode;
  language: string;
  dishes: MenuDish[];
  pricesExcludeTax: boolean;
  addedTaxPercent: number | null;
  serviceChargePercent: number | null;
  notes: string[];
  confidence: number;
}

export interface MenuScan {
  readBy: 'ai' | 'cache' | 'demo';
  menu: ScannedMenu;
  checks: ScanCheck[];
}

const percentOrNull = (value: unknown): number | null => (typeof value === 'number' && value > 0 && value < 100 ? value : null);
const flag = (value: unknown) => oneOf(value, ['yes', 'no', 'unknown'] as const, 'unknown');

/** Checks a menu reply field by field. Returns null if it is not a usable reading. */
export function parseMenuReply(body: unknown): MenuScan | null {
  if (!isObject(body) || !isObject(body.result)) return null;
  const r = body.result;
  const currency = r.currency;
  if (typeof currency !== 'string' || !(currency in currencies) || !Array.isArray(r.dishes)) return null;
  const dishes = r.dishes.filter(isObject).flatMap((dish) => {
    const original = text(dish.original).trim();
    if (!original) return [];
    return [
      {
        original,
        translation: text(dish.translation).trim() || original,
        description: text(dish.description).trim(),
        priceMinor: isInt(dish.priceMinor) && dish.priceMinor >= 0 ? dish.priceMinor : null,
        containsPork: flag(dish.containsPork),
        containsAlcohol: flag(dish.containsAlcohol),
      },
    ];
  });
  if (dishes.length === 0) return null;
  return {
    readBy: oneOf(body.source, ['ai', 'cache', 'demo'] as const, 'ai'),
    menu: {
      restaurantName: textOrNull(r.restaurantName),
      currency: currency as CurrencyCode,
      language: text(r.language),
      dishes,
      pricesExcludeTax: r.pricesExcludeTax === true,
      addedTaxPercent: percentOrNull(r.addedTaxPercent),
      serviceChargePercent: percentOrNull(r.serviceChargePercent),
      notes: Array.isArray(r.notes) ? r.notes.filter((n): n is string => typeof n === 'string' && n.trim() !== '') : [],
      confidence: typeof r.confidence === 'number' ? Math.min(1, Math.max(0, r.confidence)) : 0,
    },
    checks: parseChecks(body.checks),
  };
}

export type MenuOutcome = { ok: true; scan: MenuScan } | { ok: false; retryLater: true } | { ok: false; retryLater: false; code: string; message: string; canRetry: boolean };

export async function scanMenu(request: ScanRequest, options: Pick<RequestOptions, 'fetchImpl'> = {}): Promise<MenuOutcome> {
  const outcome = await sendScan('menu', request, parseMenuReply, options.fetchImpl);
  return outcome.ok ? { ok: true, scan: outcome.value } : outcome;
}
