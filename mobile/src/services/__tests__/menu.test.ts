import type { KeyValueStorage } from '../appDataStore';
import { addMenu, applyMenuOutcome, loadMenus, MAX_MENUS, removeMenu, saveMenus, type MenuRecord } from '../menuStore';
import { parseMenuReply, scanMenu } from '../scanService';

/** A reply as the backend sends it for the Thai sample menu. */
const reply = {
  kind: 'menu',
  source: 'ai',
  modelUsed: 'claude-haiku-5-5',
  result: {
    restaurantName: 'Krua Thai',
    currency: 'THB',
    language: 'th',
    dishes: [
      { original: 'ผัดไทยกุ้ง', translation: 'Pad Thai with prawns', description: 'Stir-fried noodles.', priceMinor: 18000, containsPork: 'no', containsAlcohol: 'no' },
      { original: 'หมูสะเต๊ะ', translation: 'Pork satay', description: '', priceMinor: 15000, containsPork: 'yes', containsAlcohol: 'maybe' },
      { original: '', translation: 'Nameless', priceMinor: 100 },
      { original: 'น้ำเปล่า', translation: 'Water', description: '', priceMinor: null, containsPork: 'no', containsAlcohol: 'no' },
    ],
    pricesExcludeTax: true,
    addedTaxPercent: 7,
    serviceChargePercent: 10,
    notes: ['Prices are "++".', ''],
    confidence: 0.9,
  },
  checks: [],
};

const ok = (body: unknown, status = 200) =>
  jest.fn(async () => ({ ok: status < 300, status, json: async () => body }) as unknown as Response) as unknown as typeof fetch;
const trip = { localCurrency: 'JPY', startDate: '2026-11-09', endDate: '2026-11-18' } as const;

describe('parseMenuReply', () => {
  it('keeps the dishes, flags and charges, and drops broken lines', () => {
    const scan = parseMenuReply(reply);
    expect(scan?.menu).toMatchObject({ restaurantName: 'Krua Thai', currency: 'THB', pricesExcludeTax: true, addedTaxPercent: 7, serviceChargePercent: 10 });
    expect(scan?.menu.dishes.map((d) => d.translation)).toEqual(['Pad Thai with prawns', 'Pork satay', 'Water']);
    expect(scan?.menu.dishes[1]).toMatchObject({ containsPork: 'yes', containsAlcohol: 'unknown' });
    expect(scan?.menu.dishes[2]?.priceMinor).toBeNull();
    expect(scan?.menu.notes).toEqual(['Prices are "++".']);
  });

  it('rejects a reply with no usable dishes or an unsupported currency', () => {
    expect(parseMenuReply({ result: { ...reply.result, dishes: [] } })).toBeNull();
    expect(parseMenuReply({ result: { ...reply.result, currency: 'GBP' } })).toBeNull();
    expect(parseMenuReply('nonsense')).toBeNull();
  });

  it('ignores impossible charge rates', () => {
    expect(parseMenuReply({ result: { ...reply.result, serviceChargePercent: 150, addedTaxPercent: -7 } })?.menu).toMatchObject({ serviceChargePercent: null, addedTaxPercent: null });
  });
});

describe('scanMenu', () => {
  it('sends the photo with the sample’s own currency when it differs from the trip', async () => {
    const fetchImpl = ok(reply) as unknown as jest.Mock;
    const outcome = await scanMenu({ image: 'abc', sampleId: 'thai-menu', currencyHint: 'THB', trip }, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(outcome.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/scan-menu$/);
    expect(JSON.parse(init.body as string)).toMatchObject({ currencyHint: 'THB', sampleId: 'thai-menu' });
  });

  it('explains a photo that is not a menu', async () => {
    const outcome = await scanMenu({ image: 'abc', trip }, { fetchImpl: ok({ error: 'not_a_menu' }, 422) });
    expect(outcome).toMatchObject({ ok: false, retryLater: false, canRetry: false, message: expect.stringMatching(/does not look like a menu/) });
  });
});

describe('the menu store', () => {
  const record = (id: string): Omit<MenuRecord, 'status'> => ({ id, tripId: 't', createdAt: 'now', imageId: `${id}-keep`, scanImageId: `${id}-scan` });

  it('keeps the newest menus first, up to the limit, and says which were dropped', () => {
    let menus: MenuRecord[] = [];
    let dropped: MenuRecord[] = [];
    for (let i = 0; i <= MAX_MENUS; i++) ({ menus, dropped } = addMenu(menus, record(`m${i}`)));
    expect(menus).toHaveLength(MAX_MENUS);
    expect(menus[0]?.id).toBe(`m${MAX_MENUS}`);
    expect(dropped.map((m) => m.id)).toEqual(['m0']);
  });

  it('records a reading, and forgets the scan copy of the photo once read', () => {
    const scan = parseMenuReply(reply);
    if (!scan) throw new Error('expected a scan');
    const { menus } = addMenu([], record('a'));
    expect(applyMenuOutcome(menus, 'a', { ok: true, scan })[0]).toMatchObject({ status: 'ready', scanImageId: null });
  });

  it('tells the user when they are offline, and lets them try again', () => {
    const { menus } = addMenu([], record('a'));
    expect(applyMenuOutcome(menus, 'a', { ok: false, retryLater: true })[0]).toMatchObject({ status: 'failed', failure: { canRetry: true, message: expect.stringMatching(/offline/) } });
  });

  it('survives closing the app mid-read, offering to try again', async () => {
    const items: Record<string, string> = {};
    const storage: KeyValueStorage = { getItem: async (k) => items[k] ?? null, setItem: async (k, v) => void (items[k] = v), removeItem: async () => undefined };
    await saveMenus(addMenu([], record('a')).menus, storage);
    expect((await loadMenus(storage))[0]).toMatchObject({ status: 'failed', failure: { canRetry: true } });
    expect(removeMenu(await loadMenus(storage), 'a')).toEqual([]);
  });
});
