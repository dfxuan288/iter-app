import { budgetRules } from '@/config/budget';
import { addDays, daysInclusive, diffDays, eachDay, type IsoDate } from '@/domain/dates';
import { sumMinor } from '@/domain/money';
import { CATEGORIES, type Category, type CategoryBudget, type Expense, type Trip } from '@/domain/types';

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
  /** Average day-to-day spend (everything except essentials) per trip day so far. */
  burnRateMyr: number;
  /** The trip day on which the day-to-day money runs out at this pace, if it does. */
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
  essentialsLeftMyr: number;
  reserveMyr: number;
  /** What can be spent per remaining day without touching essentials or the reserve. */
  safePerDayMyr: number;
  /** Safe-to-spend per day as the trip was planned, before anything was spent. */
  plannedPerDayMyr: number;
  status: BudgetStatus;
  categories: CategoryProgress[];
  dailySpend: DailySpend[];
  forecast: Forecast;
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

/** safePerDay = max(0, (remaining − essentialsLeft − reserve) / daysLeft), rounded down to the sen. */
export function safeToSpendPerDay(remainingMyr: number, essentialsLeftMyr: number, reserveMyr: number, daysLeft: number): number {
  if (daysLeft <= 0) return 0;
  return Math.max(0, Math.floor((remainingMyr - essentialsLeftMyr - reserveMyr) / daysLeft));
}

export function budgetStatus(input: {
  remainingMyr: number;
  essentialsLeftMyr: number;
  reserveMyr: number;
  safePerDayMyr: number;
  plannedPerDayMyr: number;
}): BudgetStatus {
  if (input.remainingMyr < input.essentialsLeftMyr + input.reserveMyr) return 'running_short';
  if (input.safePerDayMyr < input.plannedPerDayMyr * budgetRules.spendingFastThreshold) return 'spending_fast';
  return 'on_track';
}

/**
 * Projects day-to-day spending forward at the average pace so far. It works on the same money as
 * safe-to-spend: the budget minus the reserve minus what was planned for essentials (stay, transport).
 *
 * - `paceSpentMyr`: day-to-day spending dated from the first day of the trip up to today. Only this
 *   sets the pace, so paying for the hotel never looks like a habit.
 * - `oneOffMyr`: money that comes out of the day-to-day budget once and is not repeated: overspending
 *   on an essential (a dearer hotel than planned) and day-to-day things bought before the trip.
 *
 * The run-out day is the first day where one-offs plus the projected pace pass the day-to-day budget.
 */
export function forecastRunOut(input: {
  paceSpentMyr: number;
  oneOffMyr: number;
  dayToDayBudgetMyr: number;
  daysElapsed: number;
  totalDays: number;
  startDate: IsoDate;
}): Forecast {
  const { paceSpentMyr, oneOffMyr, dayToDayBudgetMyr, daysElapsed, totalDays, startDate } = input;
  if (daysElapsed <= 0) return { burnRateMyr: 0, runOutDayNumber: null, runOutDate: null };
  const burnRate = Math.max(0, paceSpentMyr) / daysElapsed;
  for (let day = daysElapsed; day <= totalDays; day++) {
    if (oneOffMyr + burnRate * day > dayToDayBudgetMyr) {
      return { burnRateMyr: Math.round(burnRate), runOutDayNumber: day, runOutDate: addDays(startDate, day - 1) };
    }
  }
  return { burnRateMyr: Math.round(burnRate), runOutDayNumber: null, runOutDate: null };
}

export function summarizeTrip({ trip, categoryBudgets, expenses, today }: TripSummaryInput): TripSummary {
  const tripExpenses = expenses.filter((e) => e.tripId === trip.id);
  const phase = phaseOf(trip, today);
  const totalDays = daysInclusive(trip.startDate, trip.endDate);
  const dayNumber = Math.min(totalDays, Math.max(1, diffDays(trip.startDate, today) + 1));
  // Before the trip every day is still ahead; "days left" counts today while the trip is running.
  const daysLeft = phase === 'upcoming' ? totalDays : phase === 'ended' ? 0 : totalDays - dayNumber + 1;
  const daysElapsed = phase === 'upcoming' ? 0 : dayNumber;

  const spentMyr = sumMinor(tripExpenses.map((e) => e.amountMyr));
  const remainingMyr = trip.totalBudgetMyr - spentMyr;
  const categories = summarizeCategories(trip.id, categoryBudgets, tripExpenses);
  const isEssential = (category: Category) => budgetRules.essentialCategories.includes(category);
  const essentials = categories.filter((c) => isEssential(c.category));
  const essentialsLeftMyr = sumMinor(essentials.map((c) => c.unspentMyr));
  const plannedEssentialsMyr = sumMinor(essentials.map((c) => c.plannedMyr));

  // The forecast uses the same money as safe-to-spend (see forecastRunOut).
  const essentialOverspendMyr = sumMinor(essentials.map((c) => Math.max(0, c.spentMyr - c.plannedMyr)));
  const dayToDay = tripExpenses.filter((e) => !isEssential(e.category));
  const isTripDaySoFar = (e: Expense) => e.purchaseDate >= trip.startDate && e.purchaseDate <= today;
  const paceSpentMyr = sumMinor(dayToDay.filter(isTripDaySoFar).map((e) => e.amountMyr));
  const otherDayToDayMyr = sumMinor(dayToDay.filter((e) => !isTripDaySoFar(e)).map((e) => e.amountMyr));

  const safePerDayMyr = safeToSpendPerDay(remainingMyr, essentialsLeftMyr, trip.reserveMyr, daysLeft);
  const plannedPerDayMyr = safeToSpendPerDay(trip.totalBudgetMyr, plannedEssentialsMyr, trip.reserveMyr, totalDays);

  const dailySpend = eachDay(trip.startDate, trip.endDate).map((date, index) => ({
    date,
    dayNumber: index + 1,
    spentMyr: sumMinor(tripExpenses.filter((e) => e.purchaseDate === date).map((e) => e.amountMyr)),
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
    essentialsLeftMyr,
    reserveMyr: trip.reserveMyr,
    safePerDayMyr,
    plannedPerDayMyr,
    status: budgetStatus({ remainingMyr, essentialsLeftMyr, reserveMyr: trip.reserveMyr, safePerDayMyr, plannedPerDayMyr }),
    categories,
    dailySpend,
    forecast: forecastRunOut({
      paceSpentMyr,
      oneOffMyr: essentialOverspendMyr + otherDayToDayMyr,
      dayToDayBudgetMyr: trip.totalBudgetMyr - trip.reserveMyr - plannedEssentialsMyr,
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
