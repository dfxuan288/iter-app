import { budgetRules } from '@/config/budget';
import { createSeedData, DEMO_TRIP_ID } from '@/data/seed';

import { budgetStatus, expensesAsOf, forecastRunOut, safeToSpendPerDay, splitByPercent, summarizeTrip } from '../budget';
import { CATEGORIES, type CategoryBudget, type Expense, type Trip } from '../types';

const RM = (ringgit: number) => Math.round(ringgit * 100);

describe('safeToSpendPerDay: (budget − reserve − spent so far) ÷ days left', () => {
  it('matches the demo: (2,550 − 300 − 1,450) ÷ 4 = RM 200', () => {
    expect(safeToSpendPerDay(RM(2550), RM(300), RM(1450), 4)).toBe(RM(200));
  });

  it('never goes below zero', () => {
    expect(safeToSpendPerDay(RM(1000), RM(300), RM(900), 4)).toBe(0);
  });

  it('rounds down to the sen, so it never promises money that is not there', () => {
    expect(safeToSpendPerDay(RM(100), 0, 0, 3)).toBe(3333);
  });

  it('is zero when no days are left', () => {
    expect(safeToSpendPerDay(RM(1500), 0, 0, 0)).toBe(0);
  });
});

describe('budgetStatus', () => {
  const base = { reserveMyr: RM(300), plannedPerDayMyr: RM(200) };

  it('is "running short" when what remains is less than the reserve', () => {
    expect(budgetStatus({ ...base, remainingMyr: RM(299), safePerDayMyr: 0 })).toBe('running_short');
    expect(budgetStatus({ ...base, remainingMyr: RM(300), safePerDayMyr: 0 })).not.toBe('running_short');
  });

  it('is "spending fast" when safe-to-spend falls below 70% of the planned daily amount', () => {
    expect(budgetStatus({ ...base, remainingMyr: RM(1200), safePerDayMyr: RM(139) })).toBe('spending_fast');
  });

  it('is "on track" at exactly 70% and above', () => {
    expect(budgetStatus({ ...base, remainingMyr: RM(1260), safePerDayMyr: RM(140) })).toBe('on_track');
    expect(budgetStatus({ ...base, remainingMyr: RM(1500), safePerDayMyr: RM(200) })).toBe('on_track');
  });

  it('uses the threshold from config', () => {
    expect(budgetRules.spendingFastThreshold).toBe(0.7);
  });
});

describe('forecastRunOut', () => {
  // RM 2,000 to spend over 10 days, after the reserve.
  const trip = { totalDays: 10, spendableMyr: RM(2000), oneOffMyr: 0, startDate: '2026-11-09' };

  it('reports no run-out when the pace lasts the whole trip', () => {
    const forecast = forecastRunOut({ ...trip, paceSpentMyr: RM(1190), daysElapsed: 7 });
    expect(forecast.runOutDayNumber).toBeNull();
    expect(forecast.burnRateMyr).toBe(RM(170));
  });

  it('finds the first day the projected pace passes the budget', () => {
    // RM 250 a day: day 8 reaches RM 2,000 exactly, day 9 passes it.
    const forecast = forecastRunOut({ ...trip, paceSpentMyr: RM(1250), daysElapsed: 5 });
    expect(forecast.runOutDayNumber).toBe(9);
    expect(forecast.runOutDate).toBe('2026-11-17');
  });

  it('takes spending from outside the trip days out once, instead of repeating it every day', () => {
    const forecast = forecastRunOut({ ...trip, oneOffMyr: RM(400), paceSpentMyr: RM(1190), daysElapsed: 7 });
    expect(forecast.burnRateMyr).toBe(RM(170));
    expect(forecast.runOutDayNumber).toBe(10);
  });

  it('says today when the money has already run out', () => {
    expect(forecastRunOut({ ...trip, paceSpentMyr: RM(2100), daysElapsed: 6 }).runOutDayNumber).toBe(6);
  });

  it('makes no forecast before anything is spent or before the trip starts', () => {
    expect(forecastRunOut({ ...trip, paceSpentMyr: 0, daysElapsed: 3 }).runOutDayNumber).toBeNull();
    expect(forecastRunOut({ ...trip, paceSpentMyr: RM(100), daysElapsed: 0 }).runOutDayNumber).toBeNull();
  });
});

describe('summarizeTrip with the demo data', () => {
  const data = createSeedData();
  const trip = data.trips.find((t) => t.id === DEMO_TRIP_ID) as Trip;
  const summary = summarizeTrip({ trip, categoryBudgets: data.categoryBudgets, expenses: data.expenses, today: '2026-11-15' });

  it('is day 7 of 10 with 4 days left, counting today', () => {
    expect(summary.phase).toBe('active');
    expect(summary.totalDays).toBe(10);
    expect(summary.dayNumber).toBe(7);
    expect(summary.daysLeft).toBe(4);
  });

  it('reconciles to the demo figures: RM 1,450 spent, RM 1,100 left, RM 200 a day, on track', () => {
    expect(summary.spentMyr).toBe(RM(1450));
    expect(summary.remainingMyr).toBe(RM(1100));
    expect(summary.safePerDayMyr).toBe(RM(200));
    expect(summary.status).toBe('on_track');
    expect(summary.forecast.runOutDayNumber).toBeNull();
  });

  it('opens on the morning of day 7 with all of today’s RM 200 still to spend', () => {
    expect(summary.spentTodayMyr).toBe(0);
    expect(summary.leftTodayMyr).toBe(RM(200));
  });

  it('has no hotel or flight spending', () => {
    expect(data.expenses.every((e) => (CATEGORIES as readonly string[]).includes(e.category))).toBe(true);
    expect(data.expenses.some((e) => /hotel|agoda|narita/i.test(`${e.merchantName} ${e.note}`))).toBe(false);
  });

  it('does not warn about running out after one more small expense', () => {
    const ramen = { ...data.expenses[0], id: 'ramen', category: 'food', amountMyr: RM(31), purchaseDate: '2026-11-15' } as Expense;
    const after = summarizeTrip({ trip, categoryBudgets: data.categoryBudgets, expenses: [...data.expenses, ramen], today: '2026-11-15' });
    expect(after.forecast.runOutDayNumber).toBeNull();
  });

  it('has category totals and daily totals that both add up to the amount spent', () => {
    expect(summary.categories.reduce((sum, c) => sum + c.spentMyr, 0)).toBe(summary.spentMyr);
    expect(summary.dailySpend.reduce((sum, d) => sum + d.spentMyr, 0)).toBe(summary.spentMyr);
  });

  it('plans exactly the budget minus the reserve across the categories', () => {
    expect(summary.categories.reduce((sum, c) => sum + c.plannedMyr, 0)).toBe(trip.totalBudgetMyr - trip.reserveMyr);
  });

  it('marks today and the days still to come', () => {
    expect(summary.dailySpend).toHaveLength(10);
    expect(summary.dailySpend.filter((d) => d.isToday).map((d) => d.dayNumber)).toEqual([7]);
    expect(summary.dailySpend.filter((d) => d.isFuture).map((d) => d.dayNumber)).toEqual([8, 9, 10]);
  });

  it('contains the four receipts from the brief at the right amounts', () => {
    const byMerchant = (name: string) => data.expenses.find((e) => e.merchantName === name) as Expense;
    expect(byMerchant('UNIQLO Ginza').amountOriginal).toBe(9570);
    expect(byMerchant('UNIQLO Ginza').amountMyr).toBe(24713);
    expect(byMerchant('Bic Camera Shinjuku').amountOriginal).toBe(16280);
    expect(byMerchant('Ichiran Shibuya').amountOriginal).toBe(1690);
    expect(byMerchant('Don Quijote Shibuya').amountOriginal).toBe(1212);
  });
});

/** A 4-day trip: RM 2,000 budget, RM 200 reserve, so RM 450 a day to start. */
const trip: Trip = {
  id: 't1',
  userId: 'u1',
  destinationId: 'bangkok',
  city: 'Bangkok',
  country: 'Thailand',
  localCurrency: 'THB',
  startDate: '2026-12-01',
  endDate: '2026-12-04',
  totalBudgetMyr: RM(2000),
  reserveMyr: RM(200),
  status: 'active',
  createdAt: '2026-11-01T00:00:00.000Z',
};
const budgets: CategoryBudget[] = [
  { tripId: 't1', category: 'food', plannedMyr: RM(900) },
  { tripId: 't1', category: 'transport', plannedMyr: RM(300) },
  { tripId: 't1', category: 'activities', plannedMyr: RM(300) },
  { tripId: 't1', category: 'shopping', plannedMyr: RM(300) },
];
let n = 0;
const spend = (category: string, ringgit: number, purchaseDate = '2026-12-01', tripId = 't1'): Expense =>
  ({
    id: `e${++n}`,
    tripId,
    createdAt: '2026-12-01T10:00:00.000Z',
    note: '',
    amountOriginal: RM(ringgit),
    currency: 'MYR',
    rateUsed: 1,
    rateDate: purchaseDate,
    amountMyr: RM(ringgit),
    category,
    source: 'manual',
    merchantName: 'Test',
    purchaseDate,
  }) as Expense;
const on = (today: string, expenses: Expense[]) => summarizeTrip({ trip, categoryBudgets: budgets, expenses, today });

describe('the new rule (15 Oct 2026): every category is everyday spending', () => {
  it('starts at (2,000 − 200) ÷ 4 = RM 450 a day', () => {
    expect(on('2026-12-01', []).safePerDayMyr).toBe(RM(450));
    expect(on('2026-12-01', []).plannedPerDayMyr).toBe(RM(450));
  });

  it('counts daily transport like food: it lowers tomorrow’s amount', () => {
    const grab = spend('transport', 60, '2026-12-01');
    expect(on('2026-12-01', [grab]).leftTodayMyr).toBe(RM(390));
    // (1,800 − 60) ÷ 3
    expect(on('2026-12-02', [grab]).safePerDayMyr).toBe(RM(580));
  });

  it('includes daily transport in the forecast pace', () => {
    const summary = on('2026-12-02', [spend('transport', 500, '2026-12-01'), spend('food', 500, '2026-12-02')]);
    expect(summary.forecast.burnRateMyr).toBe(RM(500));
    // RM 500 a day reaches RM 2,000 on day 4, past the RM 1,800 after the reserve.
    expect(summary.forecast.runOutDayNumber).toBe(4);
  });

  it('is running short only when what remains is less than the reserve', () => {
    expect(on('2026-12-02', [spend('shopping', 1790)]).status).not.toBe('running_short');
    expect(on('2026-12-02', [spend('shopping', 1801)]).status).toBe('running_short');
    expect(on('2026-12-02', [spend('shopping', 1801)]).safePerDayMyr).toBe(0);
  });

  it('ignores old saved hotel ("stay") expenses: they do not crash anything or count in totals', () => {
    const summary = on('2026-12-01', [spend('stay', 900), spend('food', 50)]);
    expect(summary.spentMyr).toBe(RM(50));
    expect(summary.categories.map((c) => c.category)).toEqual(['food', 'transport', 'activities', 'shopping']);
    expect(summary.leftTodayMyr).toBe(RM(400));
  });

  it('ignores expenses that belong to another trip', () => {
    expect(on('2026-12-01', [spend('food', 999, '2026-12-01', 'someone-else')]).spentMyr).toBe(0);
  });
});

describe('today’s amount is set once at the start of the day (the Home card)', () => {
  it('buying lunch lowers what is left today, not the daily amount', () => {
    const after = on('2026-12-01', [spend('food', 40)]);
    expect(after.safePerDayMyr).toBe(RM(450));
    expect(after.spentTodayMyr).toBe(RM(40));
    expect(after.leftTodayMyr).toBe(RM(410));
  });

  it('can go below zero today, and says by how much', () => {
    expect(on('2026-12-01', [spend('food', 500)]).leftTodayMyr).toBe(RM(-50));
  });

  it('rebalances the next morning: underspend raises it, overspend lowers it', () => {
    // (1,800 − 300) ÷ 3 = 500, and (1,800 − 600) ÷ 3 = 400.
    expect(on('2026-12-02', [spend('food', 300, '2026-12-01')]).safePerDayMyr).toBe(RM(500));
    expect(on('2026-12-02', [spend('food', 600, '2026-12-01')]).safePerDayMyr).toBe(RM(400));
  });

  it('before the trip, spreads what is left over every day and counts nothing as today', () => {
    const summary = on('2026-11-20', [spend('activities', 100, '2026-11-20')]);
    expect(summary.phase).toBe('upcoming');
    expect(summary.safePerDayMyr).toBe(RM(425)); // (1,800 − 100) ÷ 4
    expect(summary.spentTodayMyr).toBe(0);
  });

  it('after the trip, has no days left and nothing safe to spend', () => {
    const summary = on('2026-12-09', []);
    expect(summary.phase).toBe('ended');
    expect(summary.daysLeft).toBe(0);
    expect(summary.safePerDayMyr).toBe(0);
    expect(summary.dayNumber).toBe(4);
  });

  it('agrees with the forecast: spending exactly the daily amount never warns', () => {
    const summary = on('2026-12-03', [spend('food', 450, '2026-12-01'), spend('food', 450, '2026-12-02')]);
    expect(summary.safePerDayMyr).toBe(RM(450));
    expect(summary.forecast.runOutDayNumber).toBeNull();
  });
});

describe('splitByPercent', () => {
  it('splits into whole ringgit that add up exactly to the amount', () => {
    const split = splitByPercent(RM(3905.55), budgetRules.suggestedSplitPercent);
    expect(Object.values(split).reduce((a, b) => a + b, 0)).toBe(RM(3905.55));
    expect(split.transport % 100).toBe(0);
  });

  it('has suggested percentages for every category that add up to 100', () => {
    expect(Object.keys(budgetRules.suggestedSplitPercent).sort()).toEqual([...CATEGORIES].sort());
    expect(Object.values(budgetRules.suggestedSplitPercent).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('the demo with the app date moved back to day 1 (bug found 18 Oct 2026)', () => {
  it('counts only what was spent by that day, so "spent so far" matches the daily bars', () => {
    const data = createSeedData();
    const trip = data.trips[0]!;
    const today = trip.startDate;
    const summary = summarizeTrip({ trip, categoryBudgets: data.categoryBudgets, expenses: expensesAsOf(data.expenses, today), today });
    const barsTotal = summary.dailySpend.filter((d) => !d.isFuture).reduce((sum, d) => sum + d.spentMyr, 0);
    const bookedBefore = data.expenses.filter((e) => e.purchaseDate < trip.startDate).reduce((sum, e) => sum + e.amountMyr, 0);
    expect(summary.spentMyr).toBe(barsTotal + bookedBefore);
    expect(summary.spentMyr).toBeLessThan(145_000);
  });

  it('leaves later expenses out without changing them', () => {
    const data = createSeedData();
    expect(expensesAsOf(data.expenses, '2026-11-15')).toHaveLength(data.expenses.length);
    expect(expensesAsOf(data.expenses, '2026-11-09').every((e) => e.purchaseDate <= '2026-11-09')).toBe(true);
  });
});
