import { budgetRules } from '@/config/budget';
import { createSeedData, DEMO_TRIP_ID } from '@/data/seed';

import { budgetStatus, expensesAsOf, safeToSpendPerDay, splitByPercent, summarizeTrip } from '../budget';
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

describe('budgetStatus (team review, 20 Oct 2026)', () => {
  const planned = { plannedPerDayMyr: RM(200) };

  it('is "running short" once the reserve is being used, or when the days ahead get under 40% of the plan', () => {
    expect(budgetStatus({ ...planned, spendableLeftMyr: -1, tomorrowPerDayMyr: 0, overTodayMyr: 0 })).toBe('running_short');
    expect(budgetStatus({ ...planned, spendableLeftMyr: RM(500), tomorrowPerDayMyr: RM(79), overTodayMyr: 0 })).toBe('running_short');
    expect(budgetStatus({ ...planned, spendableLeftMyr: RM(500), tomorrowPerDayMyr: RM(80), overTodayMyr: 0 })).not.toBe('running_short');
  });

  it('is "spending fast" when today goes over its amount, even by a little', () => {
    expect(budgetStatus({ ...planned, spendableLeftMyr: RM(900), tomorrowPerDayMyr: RM(190), overTodayMyr: 1 })).toBe('spending_fast');
  });

  it('is "spending fast" when the days ahead get under 70% of the plan', () => {
    expect(budgetStatus({ ...planned, spendableLeftMyr: RM(900), tomorrowPerDayMyr: RM(139), overTodayMyr: 0 })).toBe('spending_fast');
    expect(budgetStatus({ ...planned, spendableLeftMyr: RM(900), tomorrowPerDayMyr: RM(140), overTodayMyr: 0 })).toBe('on_track');
  });

  it('on the last day, judges by today and the reserve only', () => {
    expect(budgetStatus({ ...planned, spendableLeftMyr: 0, tomorrowPerDayMyr: null, overTodayMyr: 0 })).toBe('on_track');
    expect(budgetStatus({ ...planned, spendableLeftMyr: 0, tomorrowPerDayMyr: null, overTodayMyr: 1 })).toBe('spending_fast');
  });

  it('uses the thresholds from config', () => {
    expect(budgetRules.spendingFastThreshold).toBe(0.7);
    expect(budgetRules.runningShortThreshold).toBe(0.4);
  });
});

describe('the demo on day 7, reacting to what is spent today (the CTO review cases)', () => {
  const data = createSeedData();
  const trip = data.trips[0] as Trip;
  const spendToday = (ringgit: number) => {
    const extra = { ...data.expenses[0], id: 'today', category: 'shopping', amountMyr: RM(ringgit), purchaseDate: '2026-11-15' } as Expense;
    return summarizeTrip({ trip, categoryBudgets: data.categoryBudgets, expenses: [...data.expenses, extra], today: '2026-11-15' });
  };

  it.each([
    [0, 'on_track', 26666],
    [200, 'on_track', 20000],
    [250, 'spending_fast', 18333],
    [300, 'spending_fast', 16666],
    [560, 'running_short', 8000],
    [801, 'running_short', 0],
  ])('spending RM %d today: %s, tomorrow gets %d sen a day', (ringgit, status, tomorrow) => {
    const summary = spendToday(ringgit);
    expect(summary.status).toBe(status);
    expect(summary.tomorrowPerDayMyr).toBe(tomorrow);
    // The big daily number stays fixed all day.
    expect(summary.safePerDayMyr).toBe(RM(200));
  });

  it('spending past all the spending money means the reserve is in use', () => {
    expect(spendToday(801).spendableLeftMyr).toBe(RM(-1));
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
    // (2,550 − 300 − 1,450) ÷ 3 days after today
    expect(summary.tomorrowPerDayMyr).toBe(26666);
  });

  it('opens on the morning of day 7 with all of today’s RM 200 still to spend', () => {
    expect(summary.spentTodayMyr).toBe(0);
    expect(summary.leftTodayMyr).toBe(RM(200));
  });

  it('has no hotel or flight spending', () => {
    expect(data.expenses.every((e) => (CATEGORIES as readonly string[]).includes(e.category))).toBe(true);
    expect(data.expenses.some((e) => /hotel|agoda|narita/i.test(`${e.merchantName} ${e.note}`))).toBe(false);
  });

  it('stays on track after one more small expense', () => {
    const ramen = { ...data.expenses[0], id: 'ramen', category: 'food', amountMyr: RM(31), purchaseDate: '2026-11-15' } as Expense;
    const after = summarizeTrip({ trip, categoryBudgets: data.categoryBudgets, expenses: [...data.expenses, ramen], today: '2026-11-15' });
    expect(after.status).toBe('on_track');
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

  it('counts daily transport in what the days ahead get', () => {
    // Day 2 of 4: (1,800 − 500 − 500) ÷ 2 days after today = 400, under 70% of 450.
    const summary = on('2026-12-02', [spend('transport', 500, '2026-12-01'), spend('food', 500, '2026-12-02')]);
    expect(summary.tomorrowPerDayMyr).toBe(RM(400));
    expect(summary.status).toBe('spending_fast');
  });

  it('warns "running short" while there is still money to save, not only once it is gone', () => {
    // Spent before today: 1,500, so today's amount is (1,800 − 1,500) ÷ 3 = 100 and the days ahead would get 150.
    const summary = on('2026-12-02', [spend('shopping', 1500, '2026-12-01')]);
    expect(summary.spendableLeftMyr).toBe(RM(300));
    expect(summary.tomorrowPerDayMyr).toBe(RM(150));
    expect(summary.status).toBe('running_short');
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

  it('spending exactly the daily amount every day never warns', () => {
    const summary = on('2026-12-03', [spend('food', 450, '2026-12-01'), spend('food', 450, '2026-12-02'), spend('food', 450, '2026-12-03')]);
    expect(summary.safePerDayMyr).toBe(RM(450));
    expect(summary.tomorrowPerDayMyr).toBe(RM(450));
    expect(summary.status).toBe('on_track');
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
