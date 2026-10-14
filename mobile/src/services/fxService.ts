import AsyncStorage from '@react-native-async-storage/async-storage';

import { SEED_RATE_DATE, seedRatesPerMyr } from '@/config/demo';
import { env } from '@/config/env';
import type { IsoDate } from '@/domain/dates';
import type { CurrencyCode } from '@/domain/money';
import type { KeyValueStorage } from '@/services/appDataStore';
import type { RateQuote } from '@/services/expenseService';
import { requestJson, type RequestOptions } from '@/services/http';

/**
 * Exchange rates for the app. They come from the ITER backend (which gets them from Frankfurter
 * once a day) and the last good answer is kept on the phone, so converting still works with no
 * signal. Rates are foreign units per 1 Ringgit.
 */

export type ForeignCurrency = Exclude<CurrencyCode, 'MYR'>;
export const FOREIGN_CURRENCIES: ForeignCurrency[] = ['JPY', 'THB', 'SGD', 'IDR', 'VND', 'USD', 'EUR', 'KRW'];

export type RateTable = Partial<Record<ForeignCurrency, number>>;

/**
 * `live`: fetched from the backend just now.
 * `saved`: the last rates this phone received, used while offline.
 * `builtin`: the rates shipped with the app, used only if the phone has never been online.
 */
export type RatesOrigin = 'live' | 'saved' | 'builtin';

export interface RatesSnapshot {
  /** The newest market date among the rates. */
  date: IsoDate;
  rates: RateTable;
  /** Each currency's own market date, when it differs from `date` (sources publish at different times). */
  dates: Partial<Record<ForeignCurrency, IsoDate>>;
  previous: { date: IsoDate; rates: RateTable } | null;
  origin: RatesOrigin;
}

export interface RatePoint {
  date: IsoDate;
  rate: number;
}

const LATEST_KEY = 'iter.fx.latest.v1';
const historyKey = (currency: ForeignCurrency) => `iter.fx.history.${currency}.v1`;

type Deps = Pick<RequestOptions, 'fetchImpl'> & { storage?: KeyValueStorage };

function cleanTable(input: unknown): RateTable {
  const table: RateTable = {};
  if (typeof input !== 'object' || input === null) return table;
  for (const currency of FOREIGN_CURRENCIES) {
    const rate = (input as Record<string, unknown>)[currency];
    if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) table[currency] = rate;
  }
  return table;
}

const isDate = (value: unknown): value is IsoDate => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Checks a reply or a saved copy before trusting it. Returns null if it is not usable. */
function toSnapshot(input: unknown, origin: RatesOrigin): RatesSnapshot | null {
  if (typeof input !== 'object' || input === null) return null;
  const value = input as Record<string, unknown>;
  const rates = cleanTable(value.rates);
  if (!isDate(value.date) || Object.keys(rates).length === 0) return null;
  const prev = value.previous as Record<string, unknown> | null | undefined;
  const previous = prev && isDate(prev.date) ? { date: prev.date, rates: cleanTable(prev.rates) } : null;
  const dates: RatesSnapshot['dates'] = {};
  const rawDates = (typeof value.dates === 'object' && value.dates !== null ? value.dates : {}) as Record<string, unknown>;
  for (const currency of FOREIGN_CURRENCIES) {
    const date = rawDates[currency];
    if (rates[currency] !== undefined && isDate(date)) dates[currency] = date;
  }
  return { date: value.date, rates, dates, previous, origin };
}

export const builtinRates: RatesSnapshot = {
  date: SEED_RATE_DATE,
  rates: { ...seedRatesPerMyr },
  dates: {},
  previous: null,
  origin: 'builtin',
};

async function readSaved<T>(storage: KeyValueStorage, key: string): Promise<T | null> {
  try {
    const raw = await storage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

async function save(storage: KeyValueStorage, key: string, value: unknown): Promise<void> {
  try {
    await storage.setItem(key, JSON.stringify(value));
  } catch {
    // Not being able to save rates only means they must be fetched again next time.
  }
}

export const fxService = {
  /** The rates the phone already has, without using the network. Used to show something at once. */
  async loadSavedRates({ storage = AsyncStorage }: Deps = {}): Promise<RatesSnapshot> {
    return toSnapshot(await readSaved(storage, LATEST_KEY), 'saved') ?? builtinRates;
  },

  /** Fetches today's rates. Never fails: without a connection it returns the saved or built-in rates. */
  async refreshRates({ storage = AsyncStorage, fetchImpl }: Deps = {}): Promise<RatesSnapshot> {
    const result = await requestJson<unknown>(`${env.apiBaseUrl}/api/rates`, { fetchImpl, timeoutMs: 8_000 });
    const live = result.ok ? toSnapshot(result.data, 'live') : null;
    if (live) {
      await save(storage, LATEST_KEY, live);
      return live;
    }
    return fxService.loadSavedRates({ storage });
  },

  /** One currency's rate over the last `days` days, oldest first. `fresh` is false when shown from the phone's saved copy. */
  async loadHistory(currency: ForeignCurrency, days: 7 | 30, { storage = AsyncStorage, fetchImpl }: Deps = {}): Promise<{ points: RatePoint[]; fresh: boolean }> {
    const result = await requestJson<{ points?: unknown }>(`${env.apiBaseUrl}/api/rate-history?quote=${currency}&days=30`, { fetchImpl, timeoutMs: 8_000 });
    let points: RatePoint[] | null = null;
    if (result.ok && Array.isArray(result.data.points)) {
      const cleaned = result.data.points.filter(
        (p): p is RatePoint => typeof p === 'object' && p !== null && isDate((p as RatePoint).date) && Number.isFinite((p as RatePoint).rate) && (p as RatePoint).rate > 0,
      );
      if (cleaned.length > 0) {
        points = cleaned;
        await save(storage, historyKey(currency), cleaned);
      }
    }
    const fresh = points !== null;
    points ??= (await readSaved<RatePoint[]>(storage, historyKey(currency))) ?? [];
    if (days === 7 && points.length > 0) {
      const lastDate = points[points.length - 1]?.date ?? '';
      const cutoff = new Date(Date.parse(`${lastDate}T00:00:00Z`) - 7 * 86_400_000).toISOString().slice(0, 10);
      points = points.filter((point) => point.date > cutoff);
    }
    return { points, fresh };
  },
};

/** The market date of one currency's rate. */
export function rateDateFor(snapshot: Pick<RatesSnapshot, 'date' | 'dates'>, currency: CurrencyCode): IsoDate {
  return currency === 'MYR' ? snapshot.date : (snapshot.dates[currency] ?? snapshot.date);
}

/** The rate to store with a new expense in `currency`, or null if there is none. */
export function rateQuoteFor(snapshot: RatesSnapshot, currency: CurrencyCode): RateQuote | null {
  if (currency === 'MYR') return { ratePerMyr: 1, rateDate: snapshot.date };
  const rate = snapshot.rates[currency];
  return rate ? { ratePerMyr: rate, rateDate: rateDateFor(snapshot, currency) } : null;
}

/** Percentage change in what one unit of `currency` costs in Ringgit since the previous market day. */
export function dailyChangePercent(snapshot: RatesSnapshot, currency: ForeignCurrency): number | null {
  const now = snapshot.rates[currency];
  const before = snapshot.previous?.rates[currency];
  if (!now || !before) return null;
  // Rates are foreign units per Ringgit, so the foreign currency gets dearer when the rate falls.
  return (before / now - 1) * 100;
}
