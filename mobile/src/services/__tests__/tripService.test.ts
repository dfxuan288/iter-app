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
  categoryPlanMyr: { food: RM(800), transport: RM(300), activities: RM(300), shopping: RM(400) },
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
    expect(result.data.categoryBudgets.filter((b) => b.tripId === 'trip-new')).toHaveLength(4);
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
    // (2,000 − 200 reserve − 0 spent) / 5 days
    expect(summary.safePerDayMyr).toBe(RM(360));
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

describe('old saved data with hotel ("stay") entries, from before 15 Oct 2026', () => {
  const oldData = () => {
    const data = createSeedData();
    const hotel = { ...data.expenses[0], id: 'old-hotel', category: 'stay', merchantName: 'Agoda', amountMyr: RM(705.6) };
    return {
      ...data,
      expenses: [...data.expenses, hotel],
      categoryBudgets: [...data.categoryBudgets, { tripId: DEMO_TRIP_ID, category: 'stay', plannedMyr: RM(1470) }],
    };
  };

  it('loads without crashing, leaves the hotel out of the trip, and keeps it aside rather than losing it', async () => {
    const storage = memoryStorage({ 'iter.appData.v1': JSON.stringify(oldData()) });
    const result = await loadAppData(storage);
    expect(result.outcome).toBe('loaded');
    expect(result.data.expenses.some((e) => e.id === 'old-hotel')).toBe(false);
    expect(result.data.categoryBudgets.some((b) => (b.category as string) === 'stay')).toBe(false);
    const kept = JSON.parse(storage.items['iter.appData.retiredCategories'] ?? '{}');
    expect(kept.expenses.map((e: { id: string }) => e.id)).toEqual(['old-hotel']);
    expect(kept.categoryBudgets).toHaveLength(1);
    // The cleaned data is saved, so the next load is clean too.
    expect(JSON.parse(storage.items['iter.appData.v1'] ?? '{}').expenses.some((e: { id: string }) => e.id === 'old-hotel')).toBe(false);
  });

  it('shows the demo figures as if the hotel were never there', async () => {
    const { data } = await loadAppData(memoryStorage({ 'iter.appData.v1': JSON.stringify(oldData()) }));
    const trip = activeTrip(data);
    if (!trip) throw new Error('expected the demo trip');
    const summary = summarizeTrip({ trip, categoryBudgets: data.categoryBudgets, expenses: data.expenses, today: '2026-11-15' });
    expect(summary.spentMyr).toBe(RM(1450));
    expect(summary.safePerDayMyr).toBe(RM(200));
  });
});

describe('saved data from before plans existed (before 17 Oct 2026)', () => {
  it('gets the demo plan and keeps everything else', async () => {
    const { plan: _plan, ...old } = createSeedData();
    const { data, outcome } = await loadAppData(memoryStorage({ 'iter.appData.v1': JSON.stringify({ ...old, user: { ...old.user, planTier: 'trip_pass' } }) }));
    expect(outcome).toBe('loaded');
    expect(data.plan).toEqual(createSeedData().plan);
    expect(data.expenses).toHaveLength(old.expenses.length);
  });

  it('keeps a plan that was saved', async () => {
    const saved = { ...createSeedData(), plan: { trialStartedOn: '2026-12-01', passes: [] } };
    const { data } = await loadAppData(memoryStorage({ 'iter.appData.v1': JSON.stringify(saved) }));
    expect(data.plan).toEqual({ trialStartedOn: '2026-12-01', passes: [] });
  });
});

describe('"Somewhere else?" trips', () => {
  it('plans a trip to a country from the list, with its currency and the city typed', () => {
    const result = createTrip(createSeedData(), { ...draft, destinationId: 'country:GB', city: '  Edinburgh   Old Town ' }, 'trip-uk', '2026-10-18T00:00:00Z');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trip).toMatchObject({ destinationId: 'country:GB', city: 'Edinburgh Old Town', country: 'United Kingdom', localCurrency: 'GBP' });
  });

  it('uses the country name when no city is typed, and rejects unknown countries', () => {
    const result = createTrip(createSeedData(), { ...draft, destinationId: 'country:KW' }, 'trip-kw', '2026-10-18T00:00:00Z');
    expect(result.ok && result.trip.city).toBe('Kuwait');
    expect(validateTripDraft({ ...draft, destinationId: 'country:XX' })).toContain('unknown_destination');
  });
});
