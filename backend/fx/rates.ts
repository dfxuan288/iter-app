import type { SupabaseConfig } from '../config.js';

/**
 * Exchange rates for the app. Rates come from Frankfurter (no key needed) and are stored as
 * daily snapshots in Supabase, so Frankfurter is asked at most once a day and the app still gets
 * rates if Frankfurter is briefly unreachable. Everything is quoted against the Ringgit:
 * `rate` is how many units of the quote currency one Ringgit buys.
 */

export const BASE = 'MYR';
export const QUOTES = ['JPY', 'THB', 'SGD', 'IDR', 'VND', 'USD', 'EUR', 'KRW'] as const;
export type Quote = (typeof QUOTES)[number];

/** How far back rates are kept for the history chart. */
export const HISTORY_DAYS = 30;

const FRANKFURTER_URL = 'https://api.frankfurter.dev/v2/rates';
const UPSTREAM_TIMEOUT_MS = 8_000;

export interface RateRow {
  date: string;
  quote: Quote;
  rate: number;
}

export interface RateStore {
  /** Rows on or after `from`, plus when the store was last refreshed (ISO time), if ever. */
  read(from: string): Promise<{ rows: RateRow[]; lastFetchedAt: string | null }>;
  save(rows: RateRow[], fetchedAt: string): Promise<void>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const isQuote = (value: unknown): value is Quote => QUOTES.includes(value as Quote);
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

export async function fetchFrankfurter(from: string, to: string, fetchImpl: FetchLike = fetch): Promise<RateRow[]> {
  const url = `${FRANKFURTER_URL}?base=${BASE}&quotes=${QUOTES.join(',')}&from=${from}&to=${to}`;
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
    async read(from) {
      const query = `select=rate_date,quote,rate,fetched_at&base=eq.${BASE}&rate_date=gte.${from}&order=rate_date.asc`;
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
  store?: RateStore;
  fetchImpl?: FetchLike;
  now?: Date;
}

/**
 * Returns the last month of rates. With a store: refresh from Frankfurter once per UTC day and
 * otherwise read the database. Without one (Supabase not set up yet): fetch from Frankfurter.
 * Throws only when no source at all can supply rates.
 */
export async function loadSeries({ store, fetchImpl = fetch, now = new Date() }: LoadSeriesOptions = {}): Promise<RateSeries> {
  const today = now.toISOString().slice(0, 10);
  const from = daysBefore(today, HISTORY_DAYS);
  const nowIso = now.toISOString();

  let stored: { rows: RateRow[]; lastFetchedAt: string | null } | undefined;
  if (store) {
    try {
      stored = await store.read(from);
      if (stored.rows.length > 0 && stored.lastFetchedAt?.slice(0, 10) === today) {
        return { rows: stored.rows, fetchedAt: stored.lastFetchedAt, stale: false, servedFrom: 'database' };
      }
    } catch (error) {
      console.error('[rates] could not read stored rates', error);
    }
  }

  try {
    const rows = await fetchFrankfurter(from, today, fetchImpl);
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
  /** The market date the rates are for. */
  date: string;
  rates: Partial<Record<Quote, number>>;
  /** The previous market day, for showing the daily change. */
  previous: { date: string; rates: Partial<Record<Quote, number>> } | null;
  fetchedAt: string;
  stale: boolean;
}

function ratesOn(rows: RateRow[], date: string): Partial<Record<Quote, number>> {
  const rates: Partial<Record<Quote, number>> = {};
  for (const row of rows) if (row.date === date) rates[row.quote] = row.rate;
  return rates;
}

export function latestFromSeries(series: RateSeries): LatestRates {
  const dates = [...new Set(series.rows.map((row) => row.date))].sort();
  const latest = dates.at(-1);
  if (!latest) throw new Error('No exchange rates are available right now');
  const previous = dates.at(-2);
  return {
    base: BASE,
    date: latest,
    rates: ratesOn(series.rows, latest),
    previous: previous ? { date: previous, rates: ratesOn(series.rows, previous) } : null,
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
