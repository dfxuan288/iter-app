import type { DailySpend } from '@/domain/budget';
import type { IsoDate } from '@/domain/dates';
import { sumMinor } from '@/domain/money';
import { CATEGORIES, type Category, type Expense, type Trip } from '@/domain/types';

/**
 * Trip Wrapped: the highlights of a trip, told as a few cards (like Spotify Wrapped). Pure: every
 * figure is worked out from the trip's own expenses.
 */
export interface TripWrap {
  /** True once the trip is over; before that the cards say "so far". */
  final: boolean;
  /** Trip days covered: all of them once it is over, up to today while it is on. */
  daysCounted: number;
  totalDays: number;
  spentMyr: number;
  budgetMyr: number;
  /** Budget minus spent. Negative when the trip went over. */
  leftMyr: number;
  averagePerDayMyr: number;
  biggestDay: { date: IsoDate; dayNumber: number; spentMyr: number; topMerchant: string | null } | null;
  /** Categories with spending, biggest first, with their share of the total in whole percent. */
  categories: { category: Category; spentMyr: number; percent: number }[];
  biggestSpend: { merchant: string; amountMyr: number; date: IsoDate; category: Category } | null;
  expenseCount: number;
  scannedCount: number;
  refundMyr: number;
}

export interface WrapInput {
  trip: Trip;
  /** The trip's own expenses. */
  expenses: readonly Expense[];
  dailySpend: readonly DailySpend[];
  phase: 'upcoming' | 'active' | 'ended';
  dayNumber: number;
  totalDays: number;
  refundMyr: number;
}

/** `null` before the trip starts: there is nothing to wrap yet. */
export function wrapTrip(input: WrapInput): TripWrap | null {
  if (input.phase === 'upcoming') return null;
  const { trip, expenses } = input;
  const final = input.phase === 'ended';
  const daysCounted = final ? input.totalDays : input.dayNumber;
  const spentMyr = sumMinor(expenses.map((e) => e.amountMyr));

  const pastDays = input.dailySpend.filter((day) => !day.isFuture && day.spentMyr > 0);
  const top = pastDays.reduce<DailySpend | null>((best, day) => (!best || day.spentMyr > best.spentMyr ? day : best), null);
  const biggestDay = top
    ? {
        date: top.date,
        dayNumber: top.dayNumber,
        spentMyr: top.spentMyr,
        topMerchant: biggest(expenses.filter((e) => e.purchaseDate === top.date))?.merchantName ?? null,
      }
    : null;

  const categories = CATEGORIES.map((category) => ({ category, spentMyr: sumMinor(expenses.filter((e) => e.category === category).map((e) => e.amountMyr)) }))
    .filter((c) => c.spentMyr > 0)
    .sort((a, b) => b.spentMyr - a.spentMyr)
    .map((c) => ({ ...c, percent: spentMyr > 0 ? Math.round((c.spentMyr / spentMyr) * 100) : 0 }));

  const largest = biggest(expenses);
  return {
    final,
    daysCounted,
    totalDays: input.totalDays,
    spentMyr,
    budgetMyr: trip.totalBudgetMyr,
    leftMyr: trip.totalBudgetMyr - spentMyr,
    averagePerDayMyr: daysCounted > 0 ? Math.round(spentMyr / daysCounted) : 0,
    biggestDay,
    categories,
    biggestSpend: largest ? { merchant: largest.merchantName, amountMyr: largest.amountMyr, date: largest.purchaseDate, category: largest.category } : null,
    expenseCount: expenses.length,
    scannedCount: expenses.filter((e) => e.source === 'scan').length,
    refundMyr: input.refundMyr,
  };
}

function biggest(expenses: readonly Expense[]): Expense | null {
  return expenses.reduce<Expense | null>((best, e) => (!best || e.amountMyr > best.amountMyr ? e : best), null);
}
