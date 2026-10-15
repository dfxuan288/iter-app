import { defaultClock } from '@/config/demo';
import { createSeedData } from '@/data/seed';

import { summarizeTrip, unloggedYesterday } from '../budget';
import { readClock, shiftDay, todayFor } from '../clock';
import type { Expense, Trip } from '../types';

const realNow = new Date(2026, 9, 15, 9, 30); // 15 Oct 2026, local time

describe('the app clock', () => {
  it('starts on the demo day, 15 Nov 2026', () => {
    expect(todayFor(defaultClock, realNow)).toBe('2026-11-15');
  });

  it('moves the demo date a day at a time', () => {
    const next = shiftDay(defaultClock, 1, realNow);
    expect(next).toEqual({ mode: 'demo', date: '2026-11-16' });
    expect(shiftDay(next, -2, realNow)).toEqual({ mode: 'demo', date: '2026-11-14' });
  });

  it('follows the phone when set to the real date, and steps from there', () => {
    expect(todayFor({ mode: 'real' }, realNow)).toBe('2026-10-15');
    expect(shiftDay({ mode: 'real' }, 1, realNow)).toEqual({ mode: 'demo', date: '2026-10-16' });
  });

  it('falls back to the demo day when the saved setting is missing or damaged', () => {
    expect(readClock(undefined, defaultClock)).toEqual(defaultClock);
    expect(readClock({ mode: 'demo', date: 'soon' }, defaultClock)).toEqual(defaultClock);
    expect(readClock({ mode: 'real' }, defaultClock)).toEqual({ mode: 'real' });
  });
});

describe('the next day in the demo', () => {
  const data = createSeedData();
  const trip = data.trips[0] as Trip;
  const on = (today: string, expenses: readonly Expense[] = data.expenses) => summarizeTrip({ trip, categoryBudgets: data.categoryBudgets, expenses, today });

  it('rebalances: an unspent day 7 makes day 8 (2,550 − 300 − 1,450) ÷ 3 = RM 266.66', () => {
    const day8 = on('2026-11-16');
    expect(day8.dayNumber).toBe(8);
    expect(day8.safePerDayMyr).toBe(26666);
  });

  it('asks about yesterday when nothing was logged for it, and stops asking once something is', () => {
    expect(unloggedYesterday(on('2026-11-15'))).toBeNull(); // 14 Nov has entries
    expect(unloggedYesterday(on('2026-11-16'))).toBe('2026-11-15');
    const dinner = { ...data.expenses[0], id: 'dinner', amountMyr: 5000, purchaseDate: '2026-11-15' } as Expense;
    const after = on('2026-11-16', [...data.expenses, dinner]);
    expect(unloggedYesterday(after)).toBeNull();
    // The forgotten dinner lowers today's amount: (2,550 − 300 − 1,500) ÷ 3 = RM 250.
    expect(after.safePerDayMyr).toBe(25000);
  });

  it('does not ask on the first day or outside the trip', () => {
    expect(unloggedYesterday(on('2026-11-09'))).toBeNull();
    expect(unloggedYesterday(on('2026-11-20'))).toBeNull();
  });
});
