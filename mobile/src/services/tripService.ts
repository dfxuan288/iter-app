import { findDestination } from '@/data/destinations';
import { daysInclusive, isIsoDate, type IsoDate } from '@/domain/dates';
import { sumMinor } from '@/domain/money';
import { CATEGORIES, type AppData, type Category, type Trip } from '@/domain/types';

/** What the plan-a-trip flow collects. Amounts are sen. */
export interface TripDraft {
  destinationId: string;
  /** For a "Somewhere else?" country: the city or place the traveller typed, if any. */
  city?: string;
  startDate: IsoDate;
  endDate: IsoDate;
  totalBudgetMyr: number;
  reserveMyr: number;
  categoryPlanMyr: Record<Category, number>;
}

export type TripDraftProblem =
  | 'unknown_destination'
  | 'invalid_dates'
  | 'end_before_start'
  | 'trip_too_long'
  | 'budget_missing'
  | 'reserve_too_large'
  | 'categories_exceed_budget';

export const MAX_TRIP_DAYS = 60;

export const tripProblemMessages: Record<TripDraftProblem, string> = {
  unknown_destination: 'Choose where you are going.',
  invalid_dates: 'Choose the first and last day of your trip.',
  end_before_start: 'The last day cannot be before the first day.',
  trip_too_long: `Trips can be up to ${MAX_TRIP_DAYS} days long.`,
  budget_missing: 'Enter a total budget above RM 0.',
  reserve_too_large: 'The reserve must be smaller than the total budget.',
  categories_exceed_budget: 'The categories add up to more than your budget after the reserve.',
};

/** Checks a draft and lists everything wrong with it. An empty list means it can be saved. */
export function validateTripDraft(draft: TripDraft): TripDraftProblem[] {
  const problems: TripDraftProblem[] = [];
  if (!findDestination(draft.destinationId)) problems.push('unknown_destination');

  if (!isIsoDate(draft.startDate) || !isIsoDate(draft.endDate)) {
    problems.push('invalid_dates');
  } else if (draft.endDate < draft.startDate) {
    problems.push('end_before_start');
  } else if (daysInclusive(draft.startDate, draft.endDate) > MAX_TRIP_DAYS) {
    problems.push('trip_too_long');
  }

  const amounts = [draft.totalBudgetMyr, draft.reserveMyr, ...CATEGORIES.map((c) => draft.categoryPlanMyr[c])];
  const amountsValid = amounts.every((amount) => Number.isSafeInteger(amount) && amount >= 0);
  if (!amountsValid || draft.totalBudgetMyr <= 0) {
    problems.push('budget_missing');
  } else {
    if (draft.reserveMyr >= draft.totalBudgetMyr) problems.push('reserve_too_large');
    const planned = sumMinor(CATEGORIES.map((c) => draft.categoryPlanMyr[c]));
    if (planned > draft.totalBudgetMyr - draft.reserveMyr) problems.push('categories_exceed_budget');
  }
  return problems;
}

/** The longest place name kept, so a long paste cannot break layouts. */
export const MAX_CITY_LENGTH = 40;
const cleanCity = (city: string | undefined) => {
  const trimmed = city?.trim().replace(/\s+/g, ' ').slice(0, MAX_CITY_LENGTH);
  return trimmed ? trimmed : undefined;
};

export type CreateTripResult = { ok: true; data: AppData; trip: Trip } | { ok: false; problems: TripDraftProblem[] };

/**
 * Adds a trip and makes it the active one. Returns new data and leaves the input untouched,
 * so nothing is half-saved if validation fails. `id` and `now` are passed in to keep this pure.
 */
export function createTrip(data: AppData, draft: TripDraft, id: string, now: string): CreateTripResult {
  const problems = validateTripDraft(draft);
  const destination = findDestination(draft.destinationId);
  if (problems.length > 0 || !destination) return { ok: false, problems };

  const trip: Trip = {
    id,
    userId: data.user.id,
    destinationId: destination.id,
    city: cleanCity(draft.city) ?? destination.city,
    country: destination.country,
    localCurrency: destination.currency,
    startDate: draft.startDate,
    endDate: draft.endDate,
    totalBudgetMyr: draft.totalBudgetMyr,
    reserveMyr: draft.reserveMyr,
    status: 'active',
    createdAt: now,
  };

  return {
    ok: true,
    trip,
    data: {
      ...data,
      // Only one trip is active at a time; the previous one moves to history.
      trips: [...data.trips.map((t) => (t.status === 'active' ? { ...t, status: 'completed' as const } : t)), trip],
      categoryBudgets: [
        ...data.categoryBudgets,
        ...CATEGORIES.map((category) => ({ tripId: id, category, plannedMyr: draft.categoryPlanMyr[category] })),
      ],
      activeTripId: id,
    },
  };
}

/** Ticks or unticks an item on a trip's tax refund departure checklist. */
export function toggleRefundChecklist(data: AppData, tripId: string, itemId: string): AppData {
  return {
    ...data,
    trips: data.trips.map((trip) => {
      if (trip.id !== tripId) return trip;
      const ticked = trip.refundChecklist ?? [];
      return { ...trip, refundChecklist: ticked.includes(itemId) ? ticked.filter((id) => id !== itemId) : [...ticked, itemId] };
    }),
  };
}

export function newTripId(): string {
  return `trip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function activeTrip(data: AppData): Trip | undefined {
  return data.trips.find((trip) => trip.id === data.activeTripId);
}

/** Every trip, newest first (by first day). */
export function tripsNewestFirst(data: AppData): Trip[] {
  return [...data.trips].sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt));
}

/** Makes another trip the one Home, Scan and the rest work with. Returns the data unchanged if there is no such trip. */
export function switchTrip(data: AppData, tripId: string): AppData {
  return data.trips.some((trip) => trip.id === tripId) ? { ...data, activeTripId: tripId } : data;
}

/**
 * Removes a trip with its expenses and category plans. If it was the current trip, the newest
 * remaining one becomes current (or none). Also returns the receipt photos to delete from the phone.
 */
export function removeTrip(data: AppData, tripId: string): { data: AppData; imageIds: string[] } {
  if (!data.trips.some((trip) => trip.id === tripId)) return { data, imageIds: [] };
  const imageIds = data.expenses
    .filter((e) => e.tripId === tripId)
    .map((e) => e.receipt?.imageId)
    .filter((id): id is string => typeof id === 'string');
  const rest: AppData = {
    ...data,
    trips: data.trips.filter((trip) => trip.id !== tripId),
    categoryBudgets: data.categoryBudgets.filter((budget) => budget.tripId !== tripId),
    expenses: data.expenses.filter((expense) => expense.tripId !== tripId),
  };
  const activeTripId = data.activeTripId === tripId ? (tripsNewestFirst(rest)[0]?.id ?? null) : data.activeTripId;
  return { data: { ...rest, activeTripId }, imageIds };
}
