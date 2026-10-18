import type { SupabaseConfig } from '../config.js';
import { MINOR_DIGITS } from '../currencyList.js';

/**
 * Exchange rates for the app. Rates come from Frankfurter (no key needed) and are stored as
 * daily snapshots in Supabase, so Frankfurter is asked at most once a day and the app still gets
 * rates if Frankfurter is briefly unreachable. Everything is quoted against the Ringgit:
 * `rate` is how many units of the quote currency one Ringgit buys.
 */

export const BASE = 'MYR';
/** The featured currencies, fetched together on every refresh. */
export const QUOTES = ['JPY', 'THB', 'SGD', 'IDR', 'VND', 'USD', 'EUR', 'KRW'] as const;
/**
 * Any currency ITER handles (backend/currencyList.ts). Trips to other countries ("Somewhere else?")
 * ask for their currency separately, and it is stored and refreshed on its own.
 */
export type Quote = Exclude<keyof typeof MINOR_DIGITS, typeof BASE>;

/** How far back rates are kept for the history chart. */
export const HISTORY_DAYS = 30;

/**
 * How long stored rates are served before Frankfurter is asked again. Its sources publish at
 * different times of day, so a copy taken just after midnight can hold today's rate for some
 * currencies only; refreshing every few hours fills in the rest.
 */
export const REFRESH_AFTER_MS = 3 * 60 * 60 * 1000;

const FRANKFURTER_URL = 'https://api.frankfurter.dev/v2/rates';
const UPSTREAM_TIMEOUT_MS = 8_000;

export interface RateRow {
  date: string;
  quote: Quote;
  rate: number;
}

export interface RateStore {
  /** Rows for these currencies on or after `from`, plus when they were last refreshed (ISO time), if ever. */
  read(from: string, quotes: readonly Quote[]): Promise<{ rows: RateRow[]; lastFetchedAt: string | null }>;
  save(rows: RateRow[], fetchedAt: string): Promise<void>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const isQuote = (value: unknown): value is Quote => typeof value === 'string' && value !== BASE && value in MINOR_DIGITS;
/** True for the featured currencies, which are fetched together. */
export const isFeatured = (quote: Quote): boolean => (QUOTES as readonly string[]).includes(quote);
const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Keeps only well-formed rows, so a surprise in someone else's data cannot reach the app. */
function cleanRows(input: unknown, pick: (item: Record<string, unknown>) => [unknown, unknown, unknown]): RateRow[] {
  if (!Array.isArray(input)) return [];
  const rows: RateRow[] = [];
  for (const item of input) {
    if (typeof item !== 'object' || item === null) continue;
    const [date, quote, rawRate] = pick(item as Record<string, unknown>);
    const rate = Number(rawRate);
    if (isDate(date) && isQuote(quote) && Number.isFinite(rate) && rate > 0) rows.push({ date, quote, rate });
  }
  return rows;
}

export function daysBefore(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
}

async function fetchWithTimeout(fetchImpl: FetchLike, url: string, init: RequestInit = {}): Promise<Response> {
  return fetchImpl(url, { ...init, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
}

export async function fetchFrankfurter(from: string, to: string, fetchImpl: FetchLike = fetch, quotes: readonly Quote[] = QUOTES): Promise<RateRow[]> {
  const url = `${FRANKFURTER_URL}?base=${BASE}&quotes=${quotes.join(',')}&from=${from}&to=${to}`;
  const response = await fetchWithTimeout(fetchImpl, url);
  if (!response.ok) throw new Error(`Frankfurter replied ${response.status}`);
  const rows = cleanRows(await response.json(), (item) => [item.date, item.quote, item.rate]);
  if (rows.length === 0) throw new Error('Frankfurter returned no usable rates');
  return rows;
}

/** Stores snapshots in the Supabase table `fx_rates`, through Supabase's REST interface. */
export function supabaseRateStore(config: SupabaseConfig, fetchImpl: FetchLike = fetch): RateStore {
  const endpoint = `${config.url}/rest/v1/fx_rates`;
  const headers = { apikey: config.secretKey, Authorization: `Bearer ${config.secretKey}`, 'Content-Type': 'application/json' };
  return {
    async read(from, quotes) {
      const query = `select=rate_date,quote,rate,fetched_at&base=eq.${BASE}&quote=in.(${quotes.join(',')})&rate_date=gte.${from}&order=rate_date.asc`;
      const response = await fetchWithTimeout(fetchImpl, `${endpoint}?${query}`, { headers });
      if (!response.ok) throw new Error(`Supabase read replied ${response.status}`);
      const body: unknown = await response.json();
      const rows = cleanRows(body, (item) => [item.rate_date, item.quote, item.rate]);
      const times = Array.isArray(body)
        ? body.map((item) => (item as Record<string, unknown>).fetched_at).filter((t): t is string => typeof t === 'string')
        : [];
      return { rows, lastFetchedAt: times.length > 0 ? times.reduce((a, b) => (a > b ? a : b)) : null };
    },
    async save(rows, fetchedAt) {
      const response = await fetchWithTimeout(fetchImpl, `${endpoint}?on_conflict=rate_date,base,quote`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows.map((row) => ({ rate_date: row.date, base: BASE, quote: row.quote, rate: row.rate, fetched_at: fetchedAt }))),
      });
      if (!response.ok) throw new Error(`Supabase save replied ${response.status}`);
    },
  };
}

export interface RateSeries {
  rows: RateRow[];
  /** When these rates were last fetched from Frankfurter (ISO time). */
  fetchedAt: string;
  /** True when Frankfurter could not be reached and older stored rates are being served. */
  stale: boolean;
  /** Whether the rates were read from the database or fetched just now. */
  servedFrom: 'database' | 'frankfurter';
}

export interface LoadSeriesOptions {
  /** Which currencies: the featured ones by default, or one other currency on its own. */
  quotes?: readonly Quote[];
  store?: RateStore;
  fetchImpl?: FetchLike;
  now?: Date;
}

/**
 * Returns the last month of rates. With a store: read the database, and refresh it from
 * Frankfurter when it is older than REFRESH_AFTER_MS. Without one (Supabase not set up yet):
 * fetch from Frankfurter. Throws only when no source at all can supply rates.
 */
export async function loadSeries({ quotes = QUOTES, store, fetchImpl = fetch, now = new Date() }: LoadSeriesOptions = {}): Promise<RateSeries> {
  const today = now.toISOString().slice(0, 10);
  const from = daysBefore(today, HISTORY_DAYS);
  const nowIso = now.toISOString();

  let stored: { rows: RateRow[]; lastFetchedAt: string | null } | undefined;
  if (store) {
    try {
      stored = await store.read(from, quotes);
      const age = stored.lastFetchedAt ? now.getTime() - Date.parse(stored.lastFetchedAt) : Infinity;
      if (stored.rows.length > 0 && stored.lastFetchedAt && age >= 0 && age < REFRESH_AFTER_MS) {
        return { rows: stored.rows, fetchedAt: stored.lastFetchedAt, stale: false, servedFrom: 'database' };
      }
    } catch (error) {
      console.error('[rates] could not read stored rates', error);
    }
  }

  try {
    const rows = await fetchFrankfurter(from, today, fetchImpl, quotes);
    if (store) {
      // A failed save must not stop the app getting its rates.
      await store.save(rows, nowIso).catch((error: unknown) => console.error('[rates] could not save rates', error));
    }
    return { rows, fetchedAt: nowIso, stale: false, servedFrom: 'frankfurter' };
  } catch (error) {
    console.error('[rates] Frankfurter is unavailable', error);
    if (stored && stored.rows.length > 0 && stored.lastFetchedAt) {
      return { rows: stored.rows, fetchedAt: stored.lastFetchedAt, stale: true, servedFrom: 'database' };
    }
    throw new Error('No exchange rates are available right now', { cause: error });
  }
}

export interface LatestRates {
  base: typeof BASE;
  /** The newest market date among the rates. */
  date: string;
  /** Each currency's most recent rate. */
  rates: Partial<Record<Quote, number>>;
  /** The market date of each currency's rate. Currencies can be a day apart, since sources publish at different times. */
  dates: Partial<Record<Quote, string>>;
  /** Each currency's rate on its previous market day, for showing the daily change. */
  previous: { date: string; rates: Partial<Record<Quote, number>> } | null;
  fetchedAt: string;
  stale: boolean;
}

/**
 * Gives every currency its own latest rate. Taking only the newest date would drop any currency
 * whose source has not published that day yet.
 */
export function latestFromSeries(series: RateSeries, quotes: readonly Quote[] = QUOTES): LatestRates {
  const rates: Partial<Record<Quote, number>> = {};
  const dates: Partial<Record<Quote, string>> = {};
  const previousRates: Partial<Record<Quote, number>> = {};
  let newest = '';
  let previousNewest = '';
  for (const quote of quotes) {
    const own = series.rows.filter((row) => row.quote === quote).sort((a, b) => a.date.localeCompare(b.date));
    const last = own.at(-1);
    if (!last) continue;
    rates[quote] = last.rate;
    dates[quote] = last.date;
    if (last.date > newest) newest = last.date;
    const before = own.at(-2);
    if (before) {
      previousRates[quote] = before.rate;
      if (before.date > previousNewest) previousNewest = before.date;
    }
  }
  if (!newest) throw new Error('No exchange rates are available right now');
  return {
    base: BASE,
    date: newest,
    rates,
    dates,
    previous: previousNewest ? { date: previousNewest, rates: previousRates } : null,
    fetchedAt: series.fetchedAt,
    stale: series.stale,
  };
}

export interface RateHistory {
  base: typeof BASE;
  quote: Quote;
  points: { date: string; rate: number }[];
  fetchedAt: string;
  stale: boolean;
}

export function historyFromSeries(series: RateSeries, quote: Quote, days: number): RateHistory {
  const latest = series.rows.reduce((max, row) => (row.date > max ? row.date : max), '');
  const from = latest ? daysBefore(latest, days) : '';
  const points = series.rows
    .filter((row) => row.quote === quote && row.date > from)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ date, rate }) => ({ date, rate }));
  return { base: BASE, quote, points, fetchedAt: series.fetchedAt, stale: series.stale };
}

export { isQuote };
