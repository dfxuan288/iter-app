import type { KeyValueStorage } from '../appDataStore';
import { builtinRates, dailyChangePercent, fxService, rateQuoteFor, type RatesSnapshot } from '../fxService';

function memoryStorage(): KeyValueStorage & { items: Record<string, string> } {
  const items: Record<string, string> = {};
  return {
    items,
    getItem: async (key) => items[key] ?? null,
    setItem: async (key, value) => {
      items[key] = value;
    },
    removeItem: async (key) => {
      delete items[key];
    },
  };
}

const ok = (body: unknown) => jest.fn(async () => ({ ok: true, status: 200, json: async () => body }) as unknown as Response);
const offline = jest.fn(async () => {
  throw new TypeError('Network request failed');
});

const apiReply = {
  base: 'MYR',
  date: '2026-10-13',
  rates: { JPY: 38.775, USD: 0.24477, XXX: 5, EUR: -1 },
  previous: { date: '2026-10-12', rates: { JPY: 38.785, USD: 0.24484 } },
};

describe('fxService.refreshRates', () => {
  it('returns live rates, keeps only valid currencies, and saves them on the phone', async () => {
    const storage = memoryStorage();
    const snapshot = await fxService.refreshRates({ storage, fetchImpl: ok(apiReply) });
    expect(snapshot.origin).toBe('live');
    expect(snapshot.rates).toEqual({ JPY: 38.775, USD: 0.24477 });
    expect(Object.keys(storage.items)).toHaveLength(1);
  });

  it('offline, falls back to the last saved rates and says so', async () => {
    const storage = memoryStorage();
    await fxService.refreshRates({ storage, fetchImpl: ok(apiReply) });
    const snapshot = await fxService.refreshRates({ storage, fetchImpl: offline });
    expect(snapshot).toMatchObject({ origin: 'saved', date: '2026-10-13' });
    expect(snapshot.rates.JPY).toBe(38.775);
  });

  it('offline on a phone that has never been online, uses the built-in rates', async () => {
    const snapshot = await fxService.refreshRates({ storage: memoryStorage(), fetchImpl: offline });
    expect(snapshot).toEqual(builtinRates);
    expect(snapshot.origin).toBe('builtin');
  });

  it('ignores a reply that is not rates, rather than saving it', async () => {
    const storage = memoryStorage();
    const snapshot = await fxService.refreshRates({ storage, fetchImpl: ok({ hello: 'world' }) });
    expect(snapshot.origin).toBe('builtin');
    expect(Object.keys(storage.items)).toHaveLength(0);
  });

  it('survives a corrupted saved copy', async () => {
    const storage = memoryStorage();
    storage.items['iter.fx.latest.v1'] = '{broken';
    expect((await fxService.loadSavedRates({ storage })).origin).toBe('builtin');
  });
});

describe('fxService.loadHistory', () => {
  const points = Array.from({ length: 12 }, (_, i) => ({ date: `2026-10-${String(i + 2).padStart(2, '0')}`, rate: 38.7 + i / 100 }));

  it('returns the full month, or just the last seven days', async () => {
    const month = await fxService.loadHistory('JPY', 30, { storage: memoryStorage(), fetchImpl: ok({ points }) });
    expect(month).toMatchObject({ fresh: true });
    expect(month.points).toHaveLength(12);
    const week = await fxService.loadHistory('JPY', 7, { storage: memoryStorage(), fetchImpl: ok({ points }) });
    expect(week.points.map((p) => p.date)).toEqual(['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13']);
  });

  it('offline, shows the saved history for that currency', async () => {
    const storage = memoryStorage();
    await fxService.loadHistory('JPY', 30, { storage, fetchImpl: ok({ points }) });
    const result = await fxService.loadHistory('JPY', 30, { storage, fetchImpl: offline });
    expect(result.fresh).toBe(false);
    expect(result.points).toHaveLength(12);
    expect((await fxService.loadHistory('USD', 30, { storage, fetchImpl: offline })).points).toEqual([]);
  });
});

describe('rate helpers', () => {
  const snapshot: RatesSnapshot = {
    date: '2026-10-13',
    rates: { JPY: 38.775, USD: 0.24477 },
    previous: { date: '2026-10-12', rates: { JPY: 38.785 } },
    origin: 'live',
  };

  it('quotes the rate to store with an expense', () => {
    expect(rateQuoteFor(snapshot, 'JPY')).toEqual({ ratePerMyr: 38.775, rateDate: '2026-10-13' });
    expect(rateQuoteFor(snapshot, 'MYR')).toEqual({ ratePerMyr: 1, rateDate: '2026-10-13' });
    expect(rateQuoteFor(snapshot, 'KRW')).toBeNull();
  });

  it('reports the daily change from the traveller’s side: fewer yen per ringgit means yen got dearer', () => {
    expect(dailyChangePercent(snapshot, 'JPY')).toBeCloseTo(0.0258, 3);
    expect(dailyChangePercent(snapshot, 'USD')).toBeNull();
  });
});
