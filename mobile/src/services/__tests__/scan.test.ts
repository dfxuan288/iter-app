import { createSeedData, DEMO_TRIP_ID } from '@/data/seed';
import type { Trip } from '@/domain/types';

import type { KeyValueStorage } from '../appDataStore';
import { addExpense, updateExpense } from '../expenseService';
import { draftFromScan, receiptDetailsFromScan, reviewHighlights } from '../receiptReview';
import { addPending, applyOutcome, loadQueue, markScanning, nextToScan, removePending, retry, saveQueue, type ScanQueue } from '../scanQueue';
import { parseReceiptReply, scanReceipt } from '../scanService';

/** A reply as the backend sends it for the drugstore sample (see backend/scan/samples.ts). */
const reply = {
  kind: 'receipt',
  source: 'ai',
  modelUsed: 'claude-haiku-5-5',
  escalated: false,
  scansLeftToday: 29,
  result: {
    merchantName: 'Matsumoto Kiyoshi Ginza',
    merchantNameOriginal: 'マツモトキヨシ 銀座店',
    purchaseDate: '2026-11-15',
    currency: 'JPY',
    items: [
      { name: 'Anessa sunscreen', nameOriginal: 'アネッサ 日焼け止め', quantity: 1, unitPriceMinor: 2980, lineTotalMinor: 2980, taxRatePercent: 10 },
      { name: 'Pocky', nameOriginal: null, quantity: 3, unitPriceMinor: 150, lineTotalMinor: 450, taxRatePercent: 8 },
      { name: 'broken line', lineTotalMinor: 'lots' },
    ],
    subtotalMinor: 6670,
    taxLines: [{ ratePercent: 10, amountMinor: 622 }, { ratePercent: 8, amountMinor: 36 }],
    serviceChargeMinor: null,
    totalMinor: 7328,
    taxIncluded: false,
    suggestedCategory: 'shopping',
    taxFreeShop: 'yes',
    language: 'ja',
    confidence: 0.92,
  },
  checks: [],
  uncertainFields: [],
};

const ok = (body: unknown, status = 200) =>
  jest.fn(async () => ({ ok: status < 300, status, json: async () => body }) as unknown as Response) as unknown as typeof fetch;
const offline = (async () => {
  throw new TypeError('Network request failed');
}) as unknown as typeof fetch;
const trip = { localCurrency: 'JPY', startDate: '2026-11-09', endDate: '2026-11-18' } as const;

describe('parseReceiptReply', () => {
  it('accepts a good reply and drops malformed lines', () => {
    const scan = parseReceiptReply(reply);
    expect(scan?.receipt).toMatchObject({ merchantName: 'Matsumoto Kiyoshi Ginza', currency: 'JPY', totalMinor: 7328, taxFreeShop: 'yes' });
    expect(scan?.receipt.items).toHaveLength(2);
    expect(scan?.readBy).toBe('ai');
  });

  it('rejects replies the app cannot use', () => {
    expect(parseReceiptReply(null)).toBeNull();
    expect(parseReceiptReply({ result: { ...reply.result, currency: 'GBP' } })).toBeNull();
    expect(parseReceiptReply({ result: { ...reply.result, totalMinor: 73.28 } })).toBeNull();
    expect(parseReceiptReply({ result: { ...reply.result, totalMinor: 0 } })).toBeNull();
  });

  it('falls back to safe values for unexpected fields', () => {
    const scan = parseReceiptReply({ ...reply, source: '??', result: { ...reply.result, suggestedCategory: 'gifts', purchaseDate: 'Sunday', confidence: 7 } });
    expect(scan).toMatchObject({ readBy: 'ai', receipt: { suggestedCategory: 'shopping', purchaseDate: null, confidence: 1 } });
  });
});

describe('scanReceipt', () => {
  it('returns the reading', async () => {
    const outcome = await scanReceipt({ image: 'abc', trip }, { fetchImpl: ok(reply) });
    expect(outcome.ok && outcome.scan.receipt.totalMinor).toBe(7328);
  });

  it('asks to try later when offline, so the photo waits instead of failing', async () => {
    expect(await scanReceipt({ image: 'abc', trip }, { fetchImpl: offline })).toEqual({ ok: false, retryLater: true });
  });

  it('passes on the server’s explanation, and whether retrying could help', async () => {
    const notReceipt = await scanReceipt({ image: 'abc', trip }, { fetchImpl: ok({ error: 'not_a_receipt', message: 'That does not look like a receipt.' }, 422) });
    expect(notReceipt).toEqual({ ok: false, retryLater: false, code: 'not_a_receipt', message: 'That does not look like a receipt.', canRetry: false });
    const serverDown = await scanReceipt({ image: 'abc', trip }, { fetchImpl: ok({}, 502) });
    expect(serverDown).toMatchObject({ ok: false, retryLater: false, canRetry: true });
  });

  it('sends the photo with the trip’s currency and dates, and a device id', async () => {
    const fetchImpl = ok(reply) as unknown as jest.Mock;
    await scanReceipt({ image: 'abc', sampleId: 'drugstore-ginza', trip }, { fetchImpl: fetchImpl as unknown as typeof fetch });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/scan-receipt$/);
    expect(JSON.parse(init.body as string)).toMatchObject({ image: 'abc', mediaType: 'image/jpeg', sampleId: 'drugstore-ginza', currencyHint: 'JPY', tripStart: '2026-11-09' });
    expect((init.headers as Record<string, string>)['X-Device-Id']).toMatch(/^iter-/);
  });
});

describe('the scan queue', () => {
  const base = { tripId: 't', createdAt: 'now', keepImageId: 'k' };
  const queue: ScanQueue = addPending(addPending([], { ...base, id: 'a', scanImageId: 'a-scan' }), { ...base, id: 'b', scanImageId: 'b-scan' });
  const scan = parseReceiptReply(reply);

  it('sends the oldest waiting photo first', () => {
    expect(nextToScan(queue)?.id).toBe('a');
    expect(nextToScan(markScanning(queue, 'a'))?.id).toBe('b');
  });

  it('keeps a photo waiting when there is no connection', () => {
    const after = applyOutcome(markScanning(queue, 'a'), 'a', { ok: false, retryLater: true });
    expect(after[0]).toMatchObject({ status: 'waiting', attempts: 1 });
  });

  it('marks a reading as ready to check, or a failure with its message', () => {
    if (!scan) throw new Error('expected a scan');
    expect(applyOutcome(queue, 'a', { ok: true, scan })[0]).toMatchObject({ status: 'ready', scan });
    const failed = applyOutcome(queue, 'a', { ok: false, retryLater: false, code: 'scan_failed', message: 'Try again', canRetry: true });
    expect(failed[0]).toMatchObject({ status: 'failed', failure: { message: 'Try again' } });
    expect(retry(failed, 'a')[0]).toMatchObject({ status: 'waiting', failure: undefined });
  });

  it('survives closing the app: saved, reloaded, and an interrupted scan goes back to waiting', async () => {
    const items: Record<string, string> = {};
    const storage: KeyValueStorage = { getItem: async (k) => items[k] ?? null, setItem: async (k, v) => void (items[k] = v), removeItem: async (k) => void delete items[k] };
    await saveQueue(markScanning(queue, 'a'), storage);
    const loaded = await loadQueue(storage);
    expect(loaded.map((item) => item.status)).toEqual(['waiting', 'waiting']);
    expect(removePending(loaded, 'a').map((item) => item.id)).toEqual(['b']);
  });

  it('ignores a damaged saved queue rather than crashing', async () => {
    const storage: KeyValueStorage = { getItem: async () => '{oops', setItem: async () => undefined, removeItem: async () => undefined };
    expect(await loadQueue(storage)).toEqual([]);
  });
});

describe('reviewing a scan', () => {
  const scan = parseReceiptReply(reply);
  if (!scan) throw new Error('expected a scan');
  const tokyo = createSeedData().trips[0] as Trip;

  it('fills the form with what the receipt says', () => {
    expect(draftFromScan(scan, '2026-11-15')).toEqual({
      amountOriginal: 7328,
      currency: 'JPY',
      category: 'shopping',
      merchantName: 'Matsumoto Kiyoshi Ginza',
      note: '',
      purchaseDate: '2026-11-15',
    });
  });

  it('uses today when no date could be read, and asks the user to check it', () => {
    const undated = { ...scan, receipt: { ...scan.receipt, purchaseDate: null } };
    expect(draftFromScan(undated, '2026-11-16').purchaseDate).toBe('2026-11-16');
    expect(reviewHighlights(undated, tokyo).date).toMatch(/today/);
  });

  it('highlights the fields that failed a check or that the AI was unsure of', () => {
    const doubtful = {
      ...scan,
      checks: [{ code: 'items_do_not_add_up', field: 'items', severity: 'error' as const, message: 'The items do not add up to the subtotal.' }],
      uncertainFields: ['merchantName', 'items'],
    };
    expect(reviewHighlights(doubtful, tokyo)).toEqual({ amount: 'The items do not add up to the subtotal.', merchant: 'Hard to read. Check this.' });
    expect(reviewHighlights(scan, tokyo)).toEqual({});
  });

  it('saves the receipt with the expense, and keeps it when the expense is edited', () => {
    const details = receiptDetailsFromScan(scan, 'photo-1');
    const added = addExpense(createSeedData(), DEMO_TRIP_ID, draftFromScan(scan, '2026-11-15'), { ratePerMyr: 38.7, rateDate: '2026-10-14' }, 'e1', 'now', 'scan', details);
    if (!added.ok) throw new Error('expected the expense to be added');
    expect(added.expense).toMatchObject({ source: 'scan', amountMyr: 18935, receipt: { imageId: 'photo-1', total: 7328, taxFreeShop: 'yes' } });
    const edited = updateExpense(added.data, 'e1', { ...draftFromScan(scan, '2026-11-15'), note: 'Gifts' }, null);
    expect(edited.ok && edited.expense.receipt?.items).toHaveLength(2);
  });
});
