import { describe, expect, it, vi } from 'vitest';

import { loadConfig } from '../config.js';
import {
  daysBefore,
  fetchFrankfurter,
  historyFromSeries,
  latestFromSeries,
  loadSeries,
  supabaseRateStore,
  type FetchLike,
  type RateRow,
  type RateStore,
} from '../fx/rates.js';

const NOW = new Date('2026-10-14T03:00:00.000Z');

const frankfurterBody = [
  { date: '2026-10-12', base: 'MYR', quote: 'JPY', rate: 38.7 },
  { date: '2026-10-12', base: 'MYR', quote: 'USD', rate: 0.2446 },
  { date: '2026-10-13', base: 'MYR', quote: 'JPY', rate: 38.775 },
  { date: '2026-10-13', base: 'MYR', quote: 'USD', rate: 0.24477 },
];
const rows: RateRow[] = frankfurterBody.map(({ date, quote, rate }) => ({ date, quote: quote as RateRow['quote'], rate }));

const okJson = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const frankfurterUp: FetchLike = vi.fn(async () => okJson(frankfurterBody));
const frankfurterDown: FetchLike = async () => {
  throw new Error('network down');
};

function fakeStore(initial: RateRow[] = [], lastFetchedAt: string | null = null): RateStore & { saved: RateRow[] } {
  const state = { rows: initial, lastFetchedAt, saved: [] as RateRow[] };
  return {
    get saved() {
      return state.saved;
    },
    read: async () => ({ rows: state.rows, lastFetchedAt: state.lastFetchedAt }),
    save: async (newRows) => {
      state.saved = newRows;
    },
  };
}

describe('daysBefore', () => {
  it('counts back across a month end', () => {
    expect(daysBefore('2026-10-14', 30)).toBe('2026-09-14');
    expect(daysBefore('2026-03-01', 1)).toBe('2026-02-28');
  });
});

describe('fetchFrankfurter', () => {
  it('asks for every supported currency against the Ringgit', async () => {
    const fetchImpl = vi.fn(async (_url: string) => okJson(frankfurterBody));
    await fetchFrankfurter('2026-09-14', '2026-10-14', fetchImpl);
    const url = fetchImpl.mock.calls[0]?.[0] ?? '';
    expect(url).toContain('base=MYR');
    expect(url).toContain('quotes=JPY,THB,SGD,IDR,VND,USD,EUR,KRW');
    expect(url).toContain('from=2026-09-14&to=2026-10-14');
  });

  it('drops malformed rows instead of passing them on', async () => {
    const body = [...frankfurterBody, { date: 'yesterday', quote: 'JPY', rate: 1 }, { date: '2026-10-13', quote: 'XXX', rate: 1 }, { date: '2026-10-13', quote: 'EUR', rate: -2 }, 'junk'];
    expect(await fetchFrankfurter('a', 'b', async () => okJson(body))).toHaveLength(4);
  });

  it('fails clearly on an error reply or an empty one', async () => {
    await expect(fetchFrankfurter('a', 'b', async () => new Response('no', { status: 500 }))).rejects.toThrow(/500/);
    await expect(fetchFrankfurter('a', 'b', async () => okJson([]))).rejects.toThrow(/no usable rates/);
  });
});

describe('loadSeries', () => {
  it('without a database, fetches from Frankfurter', async () => {
    const series = await loadSeries({ fetchImpl: frankfurterUp, now: NOW });
    expect(series).toMatchObject({ servedFrom: 'frankfurter', stale: false });
    expect(series.rows).toHaveLength(4);
  });

  it('serves the database without calling Frankfurter when it was refreshed today', async () => {
    const fetchImpl = vi.fn(frankfurterUp);
    const series = await loadSeries({ store: fakeStore(rows, '2026-10-14T00:05:00.000Z'), fetchImpl, now: NOW });
    expect(series.servedFrom).toBe('database');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refreshes later the same day, so currencies published late are filled in', async () => {
    const fetchImpl = vi.fn(frankfurterUp);
    const later = new Date('2026-10-14T09:00:00.000Z');
    const series = await loadSeries({ store: fakeStore(rows, '2026-10-14T00:05:00.000Z'), fetchImpl, now: later });
    expect(series.servedFrom).toBe('frankfurter');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('refreshes and saves when the database was last filled on an earlier day', async () => {
    const store = fakeStore(rows.slice(0, 2), '2026-10-13T00:05:00.000Z');
    const series = await loadSeries({ store, fetchImpl: frankfurterUp, now: NOW });
    expect(series.servedFrom).toBe('frankfurter');
    expect(store.saved).toHaveLength(4);
  });

  it('falls back to yesterday’s stored rates, marked stale, when Frankfurter is down', async () => {
    const series = await loadSeries({ store: fakeStore(rows, '2026-10-13T00:05:00.000Z'), fetchImpl: frankfurterDown, now: NOW });
    expect(series).toMatchObject({ servedFrom: 'database', stale: true, fetchedAt: '2026-10-13T00:05:00.000Z' });
  });

  it('still returns fresh rates when the database cannot be read or written', async () => {
    const broken: RateStore = {
      read: async () => {
        throw new Error('db down');
      },
      save: async () => {
        throw new Error('db down');
      },
    };
    const series = await loadSeries({ store: broken, fetchImpl: frankfurterUp, now: NOW });
    expect(series.rows).toHaveLength(4);
  });

  it('fails only when nothing at all can supply rates', async () => {
    await expect(loadSeries({ store: fakeStore(), fetchImpl: frankfurterDown, now: NOW })).rejects.toThrow(/No exchange rates/);
    await expect(loadSeries({ fetchImpl: frankfurterDown, now: NOW })).rejects.toThrow(/No exchange rates/);
  });
});

describe('shaping the reply', () => {
  const series = { rows, fetchedAt: NOW.toISOString(), stale: false, servedFrom: 'frankfurter' as const };

  it('gives the latest day and the one before it', () => {
    const latest = latestFromSeries(series);
    expect(latest.date).toBe('2026-10-13');
    expect(latest.rates).toEqual({ JPY: 38.775, USD: 0.24477 });
    expect(latest.previous).toEqual({ date: '2026-10-12', rates: { JPY: 38.7, USD: 0.2446 } });
  });

  it('keeps every currency when some have not published the newest day yet', () => {
    // As seen live: just after midnight only JPY had the 14 Oct rate.
    const ragged = { ...series, rows: [...rows, { date: '2026-10-14', quote: 'JPY' as const, rate: 38.784 }] };
    const latest = latestFromSeries(ragged);
    expect(latest.date).toBe('2026-10-14');
    expect(latest.rates).toEqual({ JPY: 38.784, USD: 0.24477 });
    expect(latest.dates).toEqual({ JPY: '2026-10-14', USD: '2026-10-13' });
    // Each currency's change is against its own previous day.
    expect(latest.previous?.rates).toEqual({ JPY: 38.775, USD: 0.2446 });
  });

  it('gives one currency’s history in date order', () => {
    expect(historyFromSeries(series, 'JPY', 30).points).toEqual([
      { date: '2026-10-12', rate: 38.7 },
      { date: '2026-10-13', rate: 38.775 },
    ]);
    expect(historyFromSeries(series, 'JPY', 1).points).toHaveLength(1);
    expect(historyFromSeries(series, 'KRW', 30).points).toEqual([]);
  });
});

describe('supabaseRateStore', () => {
  const config = { url: 'https://example.supabase.co', secretKey: 'test-secret' };

  it('reads rows and the latest refresh time, sending the key in headers only', async () => {
    const fetchImpl = vi.fn(async () =>
      okJson([
        { rate_date: '2026-10-13', quote: 'JPY', rate: '38.775', fetched_at: '2026-10-14T00:05:00+00:00' },
        { rate_date: '2026-10-12', quote: 'JPY', rate: 38.7, fetched_at: '2026-10-13T00:05:00+00:00' },
      ]),
    );
    const result = await supabaseRateStore(config, fetchImpl).read('2026-09-14');
    expect(result.rows[0]).toEqual({ date: '2026-10-13', quote: 'JPY', rate: 38.775 });
    expect(result.lastFetchedAt).toBe('2026-10-14T00:05:00+00:00');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain('test-secret');
    expect((init.headers as Record<string, string>).apikey).toBe('test-secret');
  });

  it('saves as an upsert so re-running a day never duplicates rows', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 201 }));
    await supabaseRateStore(config, fetchImpl).save(rows.slice(0, 1), NOW.toISOString());
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('on_conflict=rate_date,base,quote');
    expect((init.headers as Record<string, string>).Prefer).toContain('merge-duplicates');
    expect(JSON.parse(init.body as string)[0]).toMatchObject({ rate_date: '2026-10-12', base: 'MYR', quote: 'JPY', rate: 38.7 });
  });
});

describe('config', () => {
  it('needs both Supabase settings before using the database', () => {
    expect(loadConfig({ SUPABASE_URL: 'https://x.supabase.co' }).supabase).toBeUndefined();
    expect(loadConfig({ SUPABASE_URL: 'https://x.supabase.co/', SUPABASE_SECRET_KEY: ' k ' }).supabase).toEqual({
      url: 'https://x.supabase.co',
      secretKey: 'k',
    });
  });
});
