import { createSeedData } from '@/data/seed';

import { summarizeTrip } from '../budget';
import { wrapTrip, type WrapInput } from '../wrapped';

const data = createSeedData();
const trip = data.trips[0]!;
const expenses = data.expenses.filter((e) => e.tripId === trip.id);

function inputOn(today: string): WrapInput {
  const summary = summarizeTrip({ trip, categoryBudgets: data.categoryBudgets, expenses: data.expenses, today });
  return { trip, expenses, dailySpend: summary.dailySpend, phase: summary.phase, dayNumber: summary.dayNumber, totalDays: summary.totalDays, refundMyr: 6066 };
}

describe('wrapTrip', () => {
  it('wraps the demo trip so far on day 7', () => {
    const wrap = wrapTrip(inputOn('2026-11-15'))!;
    expect(wrap.final).toBe(false);
    expect(wrap.daysCounted).toBe(7);
    expect(wrap.spentMyr).toBe(145_000);
    expect(wrap.leftMyr).toBe(255_000 - 145_000);
    expect(wrap.averagePerDayMyr).toBe(Math.round(145_000 / 7));
    expect(wrap.refundMyr).toBe(6066);
  });

  it('finds the biggest day and the biggest spend, which are real expenses', () => {
    const wrap = wrapTrip(inputOn('2026-11-15'))!;
    const dayTotal = expenses.filter((e) => e.purchaseDate === wrap.biggestDay!.date).reduce((sum, e) => sum + e.amountMyr, 0);
    expect(wrap.biggestDay!.spentMyr).toBe(dayTotal);
    expect(Math.max(...expenses.map((e) => e.amountMyr))).toBe(wrap.biggestSpend!.amountMyr);
  });

  it('orders categories biggest first, with shares that add up to about 100%', () => {
    const wrap = wrapTrip(inputOn('2026-11-15'))!;
    const amounts = wrap.categories.map((c) => c.spentMyr);
    expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
    const total = wrap.categories.reduce((sum, c) => sum + c.percent, 0);
    expect(total).toBeGreaterThanOrEqual(98);
    expect(total).toBeLessThanOrEqual(102);
  });

  it('counts every day once the trip is over', () => {
    const wrap = wrapTrip(inputOn('2026-11-19'))!;
    expect(wrap.final).toBe(true);
    expect(wrap.daysCounted).toBe(10);
  });

  it('has nothing to wrap before the trip starts', () => {
    expect(wrapTrip(inputOn('2026-11-01'))).toBeNull();
  });

  it('copes with a trip with no expenses', () => {
    const wrap = wrapTrip({ ...inputOn('2026-11-15'), expenses: [], dailySpend: [] })!;
    expect(wrap.spentMyr).toBe(0);
    expect(wrap.biggestDay).toBeNull();
    expect(wrap.biggestSpend).toBeNull();
    expect(wrap.categories).toEqual([]);
  });
});
