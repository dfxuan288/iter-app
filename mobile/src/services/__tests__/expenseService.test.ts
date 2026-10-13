import { createSeedData, DEMO_TRIP_ID } from '@/data/seed';
import { summarizeTrip } from '@/domain/budget';
import type { AppData, Trip } from '@/domain/types';

import { addExpense, deleteExpense, updateExpense, validateExpenseDraft, type ExpenseDraft, type RateQuote } from '../expenseService';

const rate: RateQuote = { ratePerMyr: 38.775, rateDate: '2026-10-13' };

const draft: ExpenseDraft = {
  amountOriginal: 1200,
  currency: 'JPY',
  category: 'food',
  merchantName: 'Ichiran',
  note: 'ramen',
  purchaseDate: '2026-11-15',
};

const summarize = (data: AppData) =>
  summarizeTrip({
    trip: data.trips.find((t) => t.id === DEMO_TRIP_ID) as Trip,
    categoryBudgets: data.categoryBudgets,
    expenses: data.expenses,
    today: '2026-11-15',
  });

describe('validateExpenseDraft', () => {
  it('accepts a sensible expense', () => {
    expect(validateExpenseDraft(draft, rate)).toEqual([]);
  });

  it('needs no exchange rate for Ringgit', () => {
    expect(validateExpenseDraft({ ...draft, currency: 'MYR', amountOriginal: 2500 }, null)).toEqual([]);
  });

  it.each([
    ['a zero amount', { amountOriginal: 0 }, rate, 'amount_missing'],
    ['a fractional amount', { amountOriginal: 12.5 }, rate, 'amount_missing'],
    ['a malformed date', { purchaseDate: 'today' }, rate, 'invalid_date'],
    ['a very long name', { merchantName: 'x'.repeat(81) }, rate, 'text_too_long'],
    ['a foreign amount with no rate', {}, null, 'rate_missing'],
    ['a foreign amount with a broken rate', {}, { ratePerMyr: 0, rateDate: '2026-10-13' }, 'rate_missing'],
  ] as const)('rejects %s', (_name, change, rateQuote, problem) => {
    expect(validateExpenseDraft({ ...draft, ...change }, rateQuote)).toContain(problem);
  });
});

describe('addExpense', () => {
  it('converts with the given rate and saves that rate with the expense', () => {
    const result = addExpense(createSeedData(), DEMO_TRIP_ID, draft, rate, 'e-new', '2026-11-15T12:00:00.000Z');
    if (!result.ok) throw new Error('expected the expense to be added');
    // ¥1,200 / 38.775 = RM 30.95
    expect(result.expense).toMatchObject({ amountMyr: 3095, rateUsed: 38.775, rateDate: '2026-10-13', source: 'manual' });
  });

  it('updates safe-to-spend straight away', () => {
    const before = createSeedData();
    // RM 80 of food: (1,500 − 80 − 400 − 300) / 4 = RM 180
    const result = addExpense(before, DEMO_TRIP_ID, { ...draft, currency: 'MYR', amountOriginal: 8000 }, null, 'e-new', 'now');
    if (!result.ok) throw new Error('expected the expense to be added');
    expect(summarize(before).safePerDayMyr).toBe(20000);
    expect(summarize(result.data).safePerDayMyr).toBe(18000);
    expect(summarize(result.data).spentMyr).toBe(278000);
  });

  it('paying for an essential does not lower safe-to-spend, because that money was already held back', () => {
    const result = addExpense(createSeedData(), DEMO_TRIP_ID, { ...draft, currency: 'MYR', amountOriginal: 10000, category: 'stay' }, null, 'e-new', 'now');
    if (!result.ok) throw new Error('expected the expense to be added');
    expect(summarize(result.data).safePerDayMyr).toBe(20000);
  });

  it('fills in a name when none is given, and trims spaces', () => {
    const result = addExpense(createSeedData(), DEMO_TRIP_ID, { ...draft, merchantName: '  ', note: ' late snack ' }, rate, 'e-new', 'now');
    if (!result.ok) throw new Error('expected the expense to be added');
    expect(result.expense.merchantName).toBe('Expense');
    expect(result.expense.note).toBe('late snack');
  });

  it('changes nothing when the draft is invalid or the trip does not exist', () => {
    const data = createSeedData();
    const snapshot = JSON.stringify(data);
    expect(addExpense(data, DEMO_TRIP_ID, { ...draft, amountOriginal: 0 }, rate, 'e', 'now').ok).toBe(false);
    expect(addExpense(data, 'no-such-trip', draft, rate, 'e', 'now').ok).toBe(false);
    expect(JSON.stringify(data)).toBe(snapshot);
  });
});

describe('updateExpense', () => {
  const seeded = createSeedData();
  const uniqlo = seeded.expenses.find((e) => e.merchantName === 'UNIQLO Ginza');
  if (!uniqlo) throw new Error('seed is missing the UNIQLO receipt');
  const asDraft: ExpenseDraft = {
    amountOriginal: uniqlo.amountOriginal,
    currency: uniqlo.currency,
    category: uniqlo.category,
    merchantName: uniqlo.merchantName,
    note: uniqlo.note,
    purchaseDate: uniqlo.purchaseDate,
  };

  it('keeps the original rate and Ringgit amount when only the details change', () => {
    const result = updateExpense(seeded, uniqlo.id, { ...asDraft, category: 'activities', note: 'gift' }, rate);
    if (!result.ok) throw new Error('expected the expense to be updated');
    expect(result.expense).toMatchObject({ amountMyr: 24713, rateUsed: 38.725, rateDate: uniqlo.rateDate, category: 'activities', source: 'scan' });
  });

  it('keeps the original rate even when no current rate is available', () => {
    expect(updateExpense(seeded, uniqlo.id, { ...asDraft, note: 'offline edit' }, null).ok).toBe(true);
  });

  it('re-converts with the current rate when the amount changes', () => {
    const result = updateExpense(seeded, uniqlo.id, { ...asDraft, amountOriginal: 10000 }, rate);
    if (!result.ok) throw new Error('expected the expense to be updated');
    expect(result.expense).toMatchObject({ amountMyr: 25790, rateUsed: 38.775, rateDate: '2026-10-13' });
  });

  it('keeps the id, creation time and the number of expenses', () => {
    const result = updateExpense(seeded, uniqlo.id, { ...asDraft, note: 'x' }, rate);
    if (!result.ok) throw new Error('expected the expense to be updated');
    expect(result.expense.id).toBe(uniqlo.id);
    expect(result.expense.createdAt).toBe(uniqlo.createdAt);
    expect(result.data.expenses).toHaveLength(seeded.expenses.length);
  });

  it('reports an expense that no longer exists', () => {
    expect(updateExpense(seeded, 'gone', asDraft, rate)).toEqual({ ok: false, problems: ['not_found'] });
  });
});

describe('deleteExpense', () => {
  it('removes the expense and gives the money back to the budget', () => {
    const data = createSeedData();
    const uniqlo = data.expenses.find((e) => e.merchantName === 'UNIQLO Ginza');
    const after = deleteExpense(data, uniqlo?.id ?? '');
    expect(after.expenses).toHaveLength(data.expenses.length - 1);
    expect(summarize(after).spentMyr).toBe(270000 - 24713);
  });

  it('does nothing for an unknown id', () => {
    const data = createSeedData();
    expect(deleteExpense(data, 'nope').expenses).toHaveLength(data.expenses.length);
  });
});
