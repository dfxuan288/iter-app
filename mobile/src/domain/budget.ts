import { budgetRules } from '@/config/budget';
import { addDays, daysInclusive, diffDays, eachDay, type IsoDate } from '@/domain/dates';
import { sumMinor } from '@/domain/money';
import { CATEGORIES, isCategory, type Category, type CategoryBudget, type Expense, type Trip } from '@/domain/types';

/**
 * The safe-to-spend calculation (brief §9.1 to §9.3). Pure functions: the same inputs always
 * give the same answer, nothing is read from storage or the clock, and all amounts are sen.
 */

/** Where today falls relative to the trip. */
export type TripPhase = 'upcoming' | 'active' | 'ended';

export type BudgetStatus = 'on_track' | 'spending_fast' | 'running_short';

export interface DailySpend {
  date: IsoDate;
  /** 1 for the first day of the trip. */
  dayNumber: number;
  spentMyr: number;
  isToday: boolean;
  isFuture: boolean;
}

export interface CategoryProgress {
  category: Category;
  plannedMyr: number;
  spentMyr: number;
  /** Planned minus spent, never below zero. */
  unspentMyr: number;
}

export interface Forecast {
  /** Average spend per trip day so far, daily transport included. */
  burnRateMyr: number;
  /** The trip day on which the money (after the reserve) runs out at this pace, if it does. */
  runOutDayNumber: number | null;
  runOutDate: IsoDate | null;
}

export interface TripSummary {
  phase: TripPhase;
  totalDays: number;
  /** Today's day of the trip, clamped to 1..totalDays. */
  dayNumber: number;
  /** Days still to pay for, including today. Zero once the trip has ended. */
  daysLeft: number;
  spentMyr: number;
  remainingMyr: number;
  reserveMyr: number;
  /**
   * Today's allowance: the money left at the start of today (after the reserve), shared over the
   * days left including today. It is set once per day, so spending during the day does not shrink it.
   */
  safePerDayMyr: number;
  /** Spending dated today. */
  spentTodayMyr: number;
  /** Today's allowance minus what was spent today. Negative when today went over. */
  leftTodayMyr: number;
  /** Safe-to-spend per day as the trip was planned, before anything was spent. */
  plannedPerDayMyr: number;
  status: BudgetStatus;
  categories: CategoryProgress[];
  dailySpend: DailySpend[];
  forecast: Forecast;
}

/**
 * The expenses that have happened by `today`. With the demo's date control set to an earlier day,
 * expenses dated later have not happened yet, so they are left out of every figure until the date
 * reaches them (nothing is deleted).
 */
export function expensesAsOf<T extends { purchaseDate: IsoDate }>(expenses: readonly T[], today: IsoDate): T[] {
  return expenses.filter((expense) => expense.purchaseDate <= today);
}

export interface TripSummaryInput {
  trip: Trip;
  categoryBudgets: readonly CategoryBudget[];
  expenses: readonly Expense[];
  today: IsoDate;
}

function phaseOf(trip: Trip, today: IsoDate): TripPhase {
  if (today < trip.startDate) return 'upcoming';
  if (today > trip.endDate) return 'ended';
  return 'active';
}

export function summarizeCategories(
  tripId: string,
  categoryBudgets: readonly CategoryBudget[],
  expenses: readonly Expense[],
): CategoryProgress[] {
  return CATEGORIES.map((category) => {
    const plannedMyr = sumMinor(
      categoryBudgets.filter((b) => b.tripId === tripId && b.category === category).map((b) => b.plannedMyr),
    );
    const spentMyr = sumMinor(expenses.filter((e) => e.category === category).map((e) => e.amountMyr));
    return { category, plannedMyr, spentMyr, unspentMyr: Math.max(0, plannedMyr - spentMyr) };
  });
}

/**
 * safePerDay = max(0, (budget − reserve − spent so far) / daysLeft), rounded down to the sen.
 * The trip budget covers everyday spending only: hotels and flights are not part of it
 * (team decision, 15 Oct 2026; see docs/DECISIONS.md).
 */
export function safeToSpendPerDay(budgetMyr: number, reserveMyr: number, spentMyr: number, daysLeft: number): number {
  if (daysLeft <= 0) return 0;
  return Math.max(0, Math.floor((budgetMyr - reserveMyr - spentMyr) / daysLeft));
}

export function budgetStatus(input: { remainingMyr: number; reserveMyr: number; safePerDayMyr: number; plannedPerDayMyr: number }): BudgetStatus {
  if (input.remainingMyr < input.reserveMyr) return 'running_short';
  if (input.safePerDayMyr < input.plannedPerDayMyr * budgetRules.spendingFastThreshold) return 'spending_fast';
  return 'on_track';
}

/**
 * Projects spending forward at the average pace so far, on the same money as safe-to-spend
 * (the budget minus the reserve).
 *
 * - `paceSpentMyr`: spending dated from the first day of the trip up to today, daily transport
 *   included. This sets the pace.
 * - `oneOffMyr`: spending dated outside those days (bought before the trip, or logged ahead). It
 *   comes out of the budget once and is not projected forward.
 *
 * The run-out day is the first day where one-offs plus the projected pace pass the budget.
 */
export function forecastRunOut(input: {
  paceSpentMyr: number;
  oneOffMyr: number;
  spendableMyr: number;
  daysElapsed: number;
  totalDays: number;
  startDate: IsoDate;
}): Forecast {
  const { paceSpentMyr, oneOffMyr, spendableMyr, daysElapsed, totalDays, startDate } = input;
  if (daysElapsed <= 0) return { burnRateMyr: 0, runOutDayNumber: null, runOutDate: null };
  const burnRate = Math.max(0, paceSpentMyr) / daysElapsed;
  for (let day = daysElapsed; day <= totalDays; day++) {
    if (oneOffMyr + burnRate * day > spendableMyr) {
      return { burnRateMyr: Math.round(burnRate), runOutDayNumber: day, runOutDate: addDays(startDate, day - 1) };
    }
  }
  return { burnRateMyr: Math.round(burnRate), runOutDayNumber: null, runOutDate: null };
}

export function summarizeTrip({ trip, categoryBudgets, expenses, today }: TripSummaryInput): TripSummary {
  // Expenses in a category ITER no longer has (hotel stays, removed 15 Oct 2026) are left out.
  const tripExpenses = expenses.filter((e) => e.tripId === trip.id && isCategory(e.category));
  const phase = phaseOf(trip, today);
  const totalDays = daysInclusive(trip.startDate, trip.endDate);
  const dayNumber = Math.min(totalDays, Math.max(1, diffDays(trip.startDate, today) + 1));
  // Before the trip every day is still ahead; "days left" counts today while the trip is running.
  const daysLeft = phase === 'upcoming' ? totalDays : phase === 'ended' ? 0 : totalDays - dayNumber + 1;
  const daysElapsed = phase === 'upcoming' ? 0 : dayNumber;
  const total = (list: readonly Expense[]) => sumMinor(list.map((e) => e.amountMyr));

  const spentMyr = total(tripExpenses);
  const remainingMyr = trip.totalBudgetMyr - spentMyr;
  const categories = summarizeCategories(trip.id, categoryBudgets, tripExpenses);

  const spentTodayMyr = phase === 'active' ? total(tripExpenses.filter((e) => e.purchaseDate === today)) : 0;
  // Fixed for the whole day: what was left this morning, over the days left including today.
  const safePerDayMyr = safeToSpendPerDay(trip.totalBudgetMyr, trip.reserveMyr, spentMyr - spentTodayMyr, daysLeft);
  const leftTodayMyr = phase === 'active' ? safePerDayMyr - spentTodayMyr : safePerDayMyr;
  const plannedPerDayMyr = safeToSpendPerDay(trip.totalBudgetMyr, trip.reserveMyr, 0, totalDays);

  const isTripDaySoFar = (e: Expense) => e.purchaseDate >= trip.startDate && e.purchaseDate <= today;
  const dailySpend = eachDay(trip.startDate, trip.endDate).map((date, index) => ({
    date,
    dayNumber: index + 1,
    spentMyr: total(tripExpenses.filter((e) => e.purchaseDate === date)),
    isToday: date === today,
    isFuture: date > today,
  }));

  return {
    phase,
    totalDays,
    dayNumber,
    daysLeft,
    spentMyr,
    remainingMyr,
    reserveMyr: trip.reserveMyr,
    safePerDayMyr,
    spentTodayMyr,
    leftTodayMyr,
    plannedPerDayMyr,
    status: budgetStatus({ remainingMyr, reserveMyr: trip.reserveMyr, safePerDayMyr, plannedPerDayMyr }),
    categories,
    dailySpend,
    forecast: forecastRunOut({
      paceSpentMyr: total(tripExpenses.filter(isTripDaySoFar)),
      oneOffMyr: total(tripExpenses.filter((e) => !isTripDaySoFar(e))),
      spendableMyr: trip.totalBudgetMyr - trip.reserveMyr,
      daysElapsed,
      totalDays,
      startDate: trip.startDate,
    }),
  };
}

/** Splits an amount across the categories by the given percentages, giving any leftover sen to the first. */
export function splitByPercent(amountMyr: number, percents: Record<Category, number>): Record<Category, number> {
  const result = {} as Record<Category, number>;
  let assigned = 0;
  for (const category of CATEGORIES) {
    // Whole ringgit, so the suggested plan is easy to read and edit.
    const share = Math.floor((amountMyr * percents[category]) / 100 / 100) * 100;
    result[category] = share;
    assigned += share;
  }
  const first = CATEGORIES[0];
  result[first] += Math.max(0, amountMyr - assigned);
  return result;
}

/**
 * Yesterday's date when nothing at all was logged for it during the trip, so Home can ask
 * "Forgot something?". Null on the first day, outside the trip, or when yesterday has entries.
 */
export function unloggedYesterday(summary: Pick<TripSummary, 'phase' | 'dayNumber' | 'dailySpend'>): IsoDate | null {
  if (summary.phase !== 'active' || summary.dayNumber < 2) return null;
  const yesterday = summary.dailySpend.find((day) => day.dayNumber === summary.dayNumber - 1);
  return yesterday && yesterday.spentMyr === 0 ? yesterday.date : null;
}
