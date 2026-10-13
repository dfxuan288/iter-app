import { createSeedData, DEMO_TRIP_ID } from '@/data/seed';
import { summarizeTrip } from '@/domain/budget';

import { loadAppData, saveAppData, type KeyValueStorage } from '../appDataStore';
import { activeTrip, createTrip, validateTripDraft, type TripDraft } from '../tripService';

const RM = (ringgit: number) => ringgit * 100;

const draft: TripDraft = {
  destinationId: 'bangkok',
  startDate: '2026-12-01',
  endDate: '2026-12-05',
  totalBudgetMyr: RM(2000),
  reserveMyr: RM(200),
  categoryPlanMyr: { food: RM(500), transport: RM(200), stay: RM(600), activities: RM(200), shopping: RM(300) },
};

describe('validateTripDraft', () => {
  it('accepts a sensible trip', () => {
    expect(validateTripDraft(draft)).toEqual([]);
  });

  it('accepts a one-day trip and categories that leave some budget unassigned', () => {
    expect(validateTripDraft({ ...draft, endDate: draft.startDate })).toEqual([]);
    expect(validateTripDraft({ ...draft, categoryPlanMyr: { ...draft.categoryPlanMyr, shopping: 0 } })).toEqual([]);
  });

  it.each([
    ['an unknown destination', { destinationId: 'atlantis' }, 'unknown_destination'],
    ['a malformed date', { startDate: 'tomorrow' }, 'invalid_dates'],
    ['an end before the start', { endDate: '2026-11-30' }, 'end_before_start'],
    ['a trip longer than the limit', { endDate: '2027-03-01' }, 'trip_too_long'],
    ['a zero budget', { totalBudgetMyr: 0 }, 'budget_missing'],
    ['a negative reserve', { reserveMyr: -100 }, 'budget_missing'],
    ['a reserve as big as the budget', { reserveMyr: RM(2000) }, 'reserve_too_large'],
    ['categories above the budget after the reserve', { reserveMyr: RM(300) }, 'categories_exceed_budget'],
  ] as const)('rejects %s', (_name, change, problem) => {
    expect(validateTripDraft({ ...draft, ...change })).toContain(problem);
  });
});

describe('createTrip', () => {
  it('adds the trip, makes it active and moves the previous trip to history', () => {
    const before = createSeedData();
    const result = createTrip(before, draft, 'trip-new', '2026-11-15T08:00:00.000Z');
    if (!result.ok) throw new Error('expected the trip to be created');

    expect(activeTrip(result.data)?.id).toBe('trip-new');
    expect(result.trip.localCurrency).toBe('THB');
    expect(result.trip.city).toBe('Bangkok');
    expect(result.data.trips.find((t) => t.id === DEMO_TRIP_ID)?.status).toBe('completed');
    expect(result.data.categoryBudgets.filter((b) => b.tripId === 'trip-new')).toHaveLength(5);
  });

  it('keeps every existing expense and does not change the data it was given', () => {
    const before = createSeedData();
    const snapshot = JSON.stringify(before);
    const result = createTrip(before, draft, 'trip-new', '2026-11-15T08:00:00.000Z');
    if (!result.ok) throw new Error('expected the trip to be created');
    expect(result.data.expenses).toHaveLength(before.expenses.length);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('starts a new trip with nothing spent and the planned amount safe to spend', () => {
    const result = createTrip(createSeedData(), draft, 'trip-new', '2026-11-15T08:00:00.000Z');
    if (!result.ok) throw new Error('expected the trip to be created');
    const summary = summarizeTrip({
      trip: result.trip,
      categoryBudgets: result.data.categoryBudgets,
      expenses: result.data.expenses,
      today: '2026-11-15',
    });
    expect(summary.spentMyr).toBe(0);
    // (2,000 − 800 essentials − 200 reserve) / 5 days
    expect(summary.safePerDayMyr).toBe(RM(200));
  });

  it('changes nothing when the draft is invalid', () => {
    const result = createTrip(createSeedData(), { ...draft, totalBudgetMyr: 0 }, 'trip-new', 'now');
    expect(result.ok).toBe(false);
  });
});

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { items: Record<string, string> } {
  const items = { ...initial };
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

describe('appDataStore', () => {
  it('starts from the demo data the first time', async () => {
    const result = await loadAppData(memoryStorage());
    expect(result.outcome).toBe('first_run');
    expect(result.data.activeTripId).toBe(DEMO_TRIP_ID);
  });

  it('gives back exactly what was saved', async () => {
    const storage = memoryStorage();
    const created = createTrip(createSeedData(), draft, 'trip-new', 'now');
    if (!created.ok) throw new Error('expected the trip to be created');
    expect(await saveAppData(created.data, storage)).toBe(true);
    const loaded = await loadAppData(storage);
    expect(loaded.outcome).toBe('loaded');
    expect(loaded.data).toEqual(created.data);
  });

  it('recovers from unreadable saved data and keeps a backup of it', async () => {
    const storage = memoryStorage({ 'iter.appData.v1': '{not json' });
    const result = await loadAppData(storage);
    expect(result.outcome).toBe('recovered');
    expect(result.data.activeTripId).toBe(DEMO_TRIP_ID);
    expect(storage.items['iter.appData.unreadable']).toBe('{not json');
  });

  it('recovers from saved data of the wrong shape', async () => {
    const storage = memoryStorage({ 'iter.appData.v1': JSON.stringify({ version: 99 }) });
    expect((await loadAppData(storage)).outcome).toBe('recovered');
  });

  it('keeps working when storage cannot be read or written', async () => {
    const broken: KeyValueStorage = {
      getItem: async () => {
        throw new Error('blocked');
      },
      setItem: async () => {
        throw new Error('full');
      },
      removeItem: async () => undefined,
    };
    const result = await loadAppData(broken);
    expect(result.outcome).toBe('storage_unavailable');
    expect(result.data.activeTripId).toBe(DEMO_TRIP_ID);
    expect(await saveAppData(result.data, broken)).toBe(false);
  });
});
