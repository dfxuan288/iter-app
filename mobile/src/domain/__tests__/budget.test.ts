import { budgetRules } from '@/config/budget';
import { createSeedData, DEMO_TRIP_ID } from '@/data/seed';

import { budgetStatus, forecastRunOut, safeToSpendPerDay, splitByPercent, summarizeTrip } from '../budget';
import type { CategoryBudget, Expense, Trip } from '../types';

const RM = (ringgit: number) => Math.round(ringgit * 100);

describe('safeToSpendPerDay', () => {
  it('matches the demo in the brief: (1,500 − 400 − 300) / 4 = RM 200', () => {
    expect(safeToSpendPerDay(RM(1500), RM(400), RM(300), 4)).toBe(RM(200));
  });

  it('never goes below zero', () => {
    expect(safeToSpendPerDay(RM(500), RM(400), RM(300), 4)).toBe(0);
  });

  it('rounds down to the sen, so it never promises money that is not there', () => {
    expect(safeToSpendPerDay(RM(100), 0, 0, 3)).toBe(3333);
  });

  it('is zero when no days are left', () => {
    expect(safeToSpendPerDay(RM(1500), 0, 0, 0)).toBe(0);
  });
});

describe('budgetStatus', () => {
  const base = { essentialsLeftMyr: RM(400), reserveMyr: RM(300), plannedPerDayMyr: RM(200) };

  it('is "running short" when what remains cannot cover essentials and the reserve', () => {
    expect(budgetStatus({ ...base, remainingMyr: RM(650), safePerDayMyr: 0 })).toBe('running_short');
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
  const trip = { totalDays: 10, totalBudgetMyr: RM(4200), reserveMyr: RM(300), startDate: '2026-11-09' };

  it('reports no run-out when the pace lasts the whole trip', () => {
    const forecast = forecastRunOut({ ...trip, spentMyr: RM(2700), daysElapsed: 7 });
    expect(forecast.runOutDayNumber).toBeNull();
    expect(forecast.burnRateMyr).toBe(38571);
  });

  it('finds the first day projected spend passes the budget minus the reserve', () => {
    // RM 500 a day against RM 3,900 spendable: day 8 reaches RM 4,000.
    const forecast = forecastRunOut({ ...trip, spentMyr: RM(2500), daysElapsed: 5 });
    expect(forecast.runOutDayNumber).toBe(8);
    expect(forecast.runOutDate).toBe('2026-11-16');
  });

  it('says today when the money has already run out', () => {
    expect(forecastRunOut({ ...trip, spentMyr: RM(4000), daysElapsed: 6 }).runOutDayNumber).toBe(6);
  });

  it('makes no forecast before anything is spent', () => {
    expect(forecastRunOut({ ...trip, spentMyr: 0, daysElapsed: 3 }).runOutDayNumber).toBeNull();
    expect(forecastRunOut({ ...trip, spentMyr: RM(100), daysElapsed: 0 }).runOutDayNumber).toBeNull();
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

  it('reconciles to the agreed demo figures', () => {
    expect(summary.spentMyr).toBe(RM(2700));
    expect(summary.remainingMyr).toBe(RM(1500));
    expect(summary.essentialsLeftMyr).toBe(RM(400));
    expect(summary.safePerDayMyr).toBe(RM(200));
    expect(summary.status).toBe('on_track');
    expect(summary.forecast.runOutDayNumber).toBeNull();
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

describe('summarizeTrip in other situations', () => {
  const trip: Trip = {
    id: 't1',
    userId: 'u1',
    destinationId: 'bangkok',
    city: 'Bangkok',
    country: 'Thailand',
    localCurrency: 'THB',
    startDate: '2026-12-01',
    endDate: '2026-12-05',
    totalBudgetMyr: RM(2000),
    reserveMyr: RM(200),
    status: 'active',
    createdAt: '2026-11-01T00:00:00.000Z',
  };
  const budgets: CategoryBudget[] = [
    { tripId: 't1', category: 'stay', plannedMyr: RM(600) },
    { tripId: 't1', category: 'transport', plannedMyr: RM(200) },
    { tripId: 't1', category: 'food', plannedMyr: RM(500) },
  ];
  const expense = (overrides: Partial<Expense>): Expense => ({
    id: 'e',
    tripId: 't1',
    createdAt: '2026-12-01T10:00:00.000Z',
    note: '',
    amountOriginal: 0,
    currency: 'MYR',
    rateUsed: 1,
    rateDate: '2026-12-01',
    amountMyr: 0,
    category: 'food',
    source: 'manual',
    merchantName: 'Test',
    purchaseDate: '2026-12-01',
    ...overrides,
  });

  it('before the trip, spreads the budget over every day', () => {
    const summary = summarizeTrip({ trip, categoryBudgets: budgets, expenses: [], today: '2026-11-20' });
    expect(summary.phase).toBe('upcoming');
    expect(summary.daysLeft).toBe(5);
    // (2,000 − 800 essentials − 200 reserve) / 5
    expect(summary.safePerDayMyr).toBe(RM(200));
    expect(summary.safePerDayMyr).toBe(summary.plannedPerDayMyr);
    expect(summary.forecast.runOutDayNumber).toBeNull();
  });

  it('after the trip, has no days left and nothing safe to spend', () => {
    const summary = summarizeTrip({ trip, categoryBudgets: budgets, expenses: [], today: '2026-12-09' });
    expect(summary.phase).toBe('ended');
    expect(summary.daysLeft).toBe(0);
    expect(summary.safePerDayMyr).toBe(0);
    expect(summary.dayNumber).toBe(5);
  });

  it('stops holding money back for an essential once it has been paid', () => {
    const paidStay = expense({ id: 'e1', category: 'stay', amountMyr: RM(600) });
    const summary = summarizeTrip({ trip, categoryBudgets: budgets, expenses: [paidStay], today: '2026-12-01' });
    expect(summary.essentialsLeftMyr).toBe(RM(200));
    // (1,400 remaining − 200 − 200) / 5
    expect(summary.safePerDayMyr).toBe(RM(200));
  });

  it('does not treat overspending on an essential as extra money', () => {
    const bigStay = expense({ id: 'e1', category: 'stay', amountMyr: RM(900) });
    const summary = summarizeTrip({ trip, categoryBudgets: budgets, expenses: [bigStay], today: '2026-12-01' });
    expect(summary.essentialsLeftMyr).toBe(RM(200));
    expect(summary.safePerDayMyr).toBe(RM(140));
  });

  it('ignores expenses that belong to another trip', () => {
    const other = expense({ id: 'e9', tripId: 'someone-else', amountMyr: RM(999) });
    const summary = summarizeTrip({ trip, categoryBudgets: budgets, expenses: [other], today: '2026-12-01' });
    expect(summary.spentMyr).toBe(0);
  });

  it('shows running short and zero safe-to-spend when the budget is blown', () => {
    const blowout = expense({ id: 'e1', category: 'shopping', amountMyr: RM(1700) });
    const summary = summarizeTrip({ trip, categoryBudgets: budgets, expenses: [blowout], today: '2026-12-02' });
    expect(summary.status).toBe('running_short');
    expect(summary.safePerDayMyr).toBe(0);
    expect(summary.forecast.runOutDayNumber).not.toBeNull();
  });
});

describe('splitByPercent', () => {
  it('splits into whole ringgit that add up exactly to the amount', () => {
    const split = splitByPercent(RM(3905.55), budgetRules.suggestedSplitPercent);
    expect(Object.values(split).reduce((a, b) => a + b, 0)).toBe(RM(3905.55));
    expect(split.stay % 100).toBe(0);
  });

  it('has suggested percentages that add up to 100', () => {
    expect(Object.values(budgetRules.suggestedSplitPercent).reduce((a, b) => a + b, 0)).toBe(100);
  });
});
