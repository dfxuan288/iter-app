import { describe, expect, it, vi } from 'vitest';

import { currencies } from '../../mobile/src/domain/money.js';
import { scanHandler } from '../handlers/scan.js';
import { MODELS, type ReadImage } from '../scan/claude.js';
import { MINOR_DIGITS, normalizeCurrency } from '../scan/currency.js';
import { checkMenu, checkReceipt } from '../scan/normalize.js';
import { contextLine } from '../scan/prompts.js';
import { SAMPLE_MENUS, SAMPLE_RECEIPTS } from '../scan/samples.js';
import { scanWithSecondLook } from '../scan/scan.js';
import type { ReceiptExtraction } from '../scan/schema.js';
import type { ScanStore } from '../scan/store.js';

const drugstore = SAMPLE_RECEIPTS['drugstore-ginza'];
const konbini = SAMPLE_RECEIPTS['convenience-store-shibuya'];
const trip = { currencyHint: 'JPY' as const, tripStart: '2026-11-09', tripEnd: '2026-11-18' };
const codes = (checks: { code: string }[]) => checks.map((check) => check.code);

describe('currencies', () => {
  it('match the app’s currency table exactly', () => {
    expect(Object.fromEntries(Object.values(currencies).map((c) => [c.code, c.minorDigits]))).toEqual(MINOR_DIGITS);
  });

  it('understand symbols and words as well as codes', () => {
    expect(normalizeCurrency('¥')).toBe('JPY');
    expect(normalizeCurrency(' thb ')).toBe('THB');
    expect(normalizeCurrency('円')).toBe('JPY');
    expect(normalizeCurrency('KPW')).toBeNull();
    expect(normalizeCurrency('£')).toBe('GBP');
    expect(normalizeCurrency(null)).toBeNull();
  });
});

describe('checkReceipt', () => {
  it('accepts a tax-added receipt whose numbers add up, in minor units', () => {
    const { result, checks, uncertainFields } = checkReceipt(drugstore, trip);
    expect(checks).toEqual([]);
    expect(uncertainFields).toEqual([]);
    expect(result).toMatchObject({ currency: 'JPY', subtotalMinor: 6670, totalMinor: 7328, taxIncluded: false, purchaseDate: '2026-11-15' });
    expect(result?.taxLines.map((line) => line.amountMinor)).toEqual([622, 36]);
  });

  it('accepts a tax-included receipt without adding the tax twice', () => {
    const { result, checks } = checkReceipt(konbini, trip);
    expect(checks).toEqual([]);
    expect(result?.totalMinor).toBe(842);
  });

  it('converts two-decimal currencies to cents', () => {
    const thai: ReceiptExtraction = {
      ...drugstore,
      currency: 'THB',
      items: [{ name: 'Pad Thai', nameOriginal: null, quantity: 1, unitPrice: 180, lineTotal: 180, taxRatePercent: null }],
      subtotal: 180,
      taxLines: [{ ratePercent: 7, amount: 13.86 }],
      serviceCharge: 18,
      total: 211.86,
    };
    const { result, checks } = checkReceipt(thai, {});
    expect(checks).toEqual([]);
    expect(result).toMatchObject({ currency: 'THB', subtotalMinor: 18000, serviceChargeMinor: 1800, totalMinor: 21186 });
  });

  it('flags items that do not add up, and highlights them', () => {
    const wrong = { ...drugstore, items: drugstore.items.slice(1) };
    const { checks, uncertainFields } = checkReceipt(wrong, trip);
    expect(codes(checks)).toEqual(['items_do_not_add_up']);
    expect(uncertainFields).toContain('items');
  });

  it('flags a total that does not match subtotal plus tax', () => {
    expect(codes(checkReceipt({ ...drugstore, total: 7000 }, trip).checks)).toContain('total_does_not_add_up');
  });

  it('allows small rounding differences', () => {
    expect(checkReceipt({ ...drugstore, total: 7329 }, trip).checks).toEqual([]);
  });

  it('adds up a missing total from the parts, and flags it', () => {
    const { result, checks } = checkReceipt({ ...drugstore, total: null }, trip);
    expect(result?.totalMinor).toBe(7328);
    expect(codes(checks)).toEqual(['total_missing']);
  });

  it('assumes the trip currency when none is printed, and says so', () => {
    const { result, checks } = checkReceipt({ ...konbini, currency: null }, trip);
    expect(result?.currency).toBe('JPY');
    expect(codes(checks)).toEqual(['currency_assumed']);
  });

  it('refuses a currency ITER does not support rather than guessing', () => {
    const { result, checks } = checkReceipt({ ...konbini, currency: 'KPW' }, trip);
    expect(result).toBeNull();
    expect(codes(checks)).toEqual(['currency_unsupported']);
  });

  it('flags a date outside the trip or a missing date', () => {
    expect(codes(checkReceipt({ ...konbini, purchaseDate: '2026-10-01' }, trip).checks)).toEqual(['date_outside_trip']);
    expect(codes(checkReceipt({ ...konbini, purchaseDate: 'last Tuesday' }, trip).checks)).toEqual(['date_missing']);
  });

  it('returns nothing for a photo that is not a receipt', () => {
    expect(checkReceipt({ ...konbini, isReceipt: false }, trip)).toMatchObject({ result: null, checks: [{ code: 'not_a_receipt' }] });
  });

  it('keeps the AI’s own doubts for the review screen, but only real field names', () => {
    const { uncertainFields } = checkReceipt({ ...konbini, uncertainFields: ['purchaseDate', 'made_up'] }, trip);
    expect(uncertainFields).toEqual(['purchaseDate']);
  });
});

describe('checkMenu', () => {
  it('turns prices into minor units and keeps the tax and service rates for the app to apply', () => {
    const { result, checks } = checkMenu(SAMPLE_MENUS['thai-menu'], { currencyHint: 'THB' });
    expect(checks).toEqual([]);
    expect(result?.dishes[0]).toMatchObject({ translation: 'Pad Thai with prawns', priceMinor: 18000 });
    expect(result).toMatchObject({ addedTaxPercent: 7, serviceChargePercent: 10, pricesExcludeTax: true });
  });

  it('flags a menu with no readable dishes', () => {
    expect(codes(checkMenu({ ...SAMPLE_MENUS['ramen-menu'], dishes: [] }, trip).checks)).toEqual(['no_dishes']);
  });
});

describe('contextLine', () => {
  it('tells the AI the trip currency and dates', () => {
    expect(contextLine(trip)).toContain('JPY');
    expect(contextLine(trip)).toContain('2026-11-09');
  });
});

/** A fake AI: answers per model, or throws. */
function fakeReader(answers: Partial<Record<string, ReceiptExtraction | Error>>) {
  return vi.fn(async (_kind: string, model: string) => {
    const answer = answers[model];
    if (!answer || answer instanceof Error) throw answer ?? new Error('no answer');
    return answer;
  }) as unknown as ReadImage & ReturnType<typeof vi.fn>;
}

const image = { data: 'x', mediaType: 'image/jpeg' as const };

describe('scanWithSecondLook', () => {
  it('keeps a confident reading that adds up, without asking Sonnet', async () => {
    const read = fakeReader({ [MODELS.first]: drugstore });
    const attempt = await scanWithSecondLook('receipt', image, trip, read);
    expect(attempt).toMatchObject({ modelUsed: MODELS.first, escalated: false });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('asks Sonnet when Haiku is unsure', async () => {
    const read = fakeReader({ [MODELS.first]: { ...drugstore, confidence: 0.5 }, [MODELS.careful]: drugstore });
    expect(await scanWithSecondLook('receipt', image, trip, read)).toMatchObject({ modelUsed: MODELS.careful, escalated: true });
  });

  it('asks Sonnet when the numbers do not add up', async () => {
    const read = fakeReader({ [MODELS.first]: { ...drugstore, total: 9999 }, [MODELS.careful]: drugstore });
    const attempt = await scanWithSecondLook('receipt', image, trip, read);
    expect(attempt.modelUsed).toBe(MODELS.careful);
    expect(attempt.checked.checks).toEqual([]);
  });

  it('keeps Haiku’s reading if Sonnet’s is worse', async () => {
    const read = fakeReader({ [MODELS.first]: { ...drugstore, confidence: 0.6 }, [MODELS.careful]: { ...drugstore, total: 1, subtotal: 2 } });
    expect(await scanWithSecondLook('receipt', image, trip, read)).toMatchObject({ modelUsed: MODELS.first, escalated: true });
  });

  it('accepts a confident "this is not a receipt" without paying for Sonnet', async () => {
    const read = fakeReader({ [MODELS.first]: { ...drugstore, isReceipt: false, confidence: 0.95 } });
    await scanWithSecondLook('receipt', image, trip, read);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('falls back to Sonnet when Haiku fails, and throws only when both fail', async () => {
    expect(await scanWithSecondLook('receipt', image, trip, fakeReader({ [MODELS.careful]: drugstore }))).toMatchObject({ modelUsed: MODELS.careful });
    await expect(scanWithSecondLook('receipt', image, trip, fakeReader({}))).rejects.toThrow('Neither model');
  });
});

// A real (tiny) JPEG header followed by padding is enough to pass the request checks.
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300, 1)]).toString('base64');

function scanRequest(body: Record<string, unknown> = {}, deviceId = 'device-123456') {
  return new Request('http://localhost/api/scan-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Device-Id': deviceId },
    body: JSON.stringify({ image: jpeg, mediaType: 'image/jpeg', currencyHint: 'JPY', tripStart: '2026-11-09', tripEnd: '2026-11-18', ...body }),
  });
}

function fakeStore(options: { allowed?: boolean; cached?: ReceiptExtraction } = {}) {
  const cached = options.cached ? { extraction: options.cached, modelUsed: MODELS.first } : null;
  return {
    claim: vi.fn(async () => ({ allowed: options.allowed ?? true, deviceUsed: 3, globalCapReached: false })),
    release: vi.fn(async () => undefined),
    readCache: vi.fn(async () => cached) as unknown as ScanStore['readCache'] & ReturnType<typeof vi.fn>,
    writeCache: vi.fn(async () => undefined),
  };
}

describe('POST /api/scan-receipt', () => {
  it('reads the photo, counts it, caches it and replies in minor units', async () => {
    const store = fakeStore();
    const handler = scanHandler('receipt', { read: fakeReader({ [MODELS.first]: drugstore }), store });
    const response = await handler(scanRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ kind: 'receipt', source: 'ai', modelUsed: MODELS.first, result: { totalMinor: 7328 }, scansLeftToday: 27 });
    expect(store.claim).toHaveBeenCalledWith('device-123456', 'receipt', expect.any(String), 30, 1000);
    expect(store.writeCache).toHaveBeenCalledTimes(1);
  });

  it('answers a photo it has read before from the cache, free and without counting it', async () => {
    const store = fakeStore({ cached: konbini });
    const read = fakeReader({});
    const response = await scanHandler('receipt', { read, store })(scanRequest());
    expect(await response.json()).toMatchObject({ source: 'cache', result: { totalMinor: 842 } });
    expect(read).not.toHaveBeenCalled();
    expect(store.claim).not.toHaveBeenCalled();
  });

  it('stops at the daily limit', async () => {
    const response = await scanHandler('receipt', { read: fakeReader({}), store: fakeStore({ allowed: false }) })(scanRequest());
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: 'limit_reached' });
  });

  it('never breaks a demo: a sample answers from its printed contents when the AI fails', async () => {
    const store = fakeStore();
    const response = await scanHandler('receipt', { read: fakeReader({}), store })(scanRequest({ sampleId: 'drugstore-ginza' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ source: 'demo', result: { merchantName: 'Matsumoto Kiyoshi Ginza', totalMinor: 7328 } });
    expect(store.release).toHaveBeenCalledTimes(1);
  });

  it('gives a failed scan back and says so when it is not a sample', async () => {
    const store = fakeStore();
    const response = await scanHandler('receipt', { read: fakeReader({}), store })(scanRequest());
    expect(response.status).toBe(502);
    expect(store.release).toHaveBeenCalledTimes(1);
  });

  it('replies 422 for a photo that is not a receipt', async () => {
    const read = fakeReader({ [MODELS.first]: { ...drugstore, isReceipt: false, confidence: 0.9 } });
    const response = await scanHandler('receipt', { read, store: fakeStore() })(scanRequest());
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: 'not_a_receipt' });
  });

  it('turns away requests without a device id or with a file that is not the image it claims to be', async () => {
    const handler = scanHandler('receipt', { read: fakeReader({ [MODELS.first]: drugstore }), store: fakeStore() });
    expect((await handler(scanRequest({}, 'x'))).status).toBe(400);
    expect((await handler(scanRequest({ mediaType: 'image/png' }))).status).toBe(400);
    expect((await handler(scanRequest({ image: 'not base64!' }))).status).toBe(400);
    expect((await handler(scanRequest({ mediaType: 'image/gif' }))).status).toBe(400);
  });

  it('still scans when the counter is unreachable', async () => {
    const store = { ...fakeStore(), claim: vi.fn(async () => Promise.reject(new Error('down'))) };
    const response = await scanHandler('receipt', { read: fakeReader({ [MODELS.first]: drugstore }), store })(scanRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ scansLeftToday: null });
  });
});
