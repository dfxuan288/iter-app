import { isIsoDate, type IsoDate } from '@/domain/dates';
import { convertToMyr, currencies, type CurrencyCode } from '@/domain/money';
import { CATEGORIES, type AppData, type Category, type Expense, type ExpenseSource, type ReceiptDetails, type RefundState } from '@/domain/types';

/** What the add/edit form collects. `amountOriginal` is in the minor unit of `currency`. */
export interface ExpenseDraft {
  amountOriginal: number;
  currency: CurrencyCode;
  category: Category;
  merchantName: string;
  note: string;
  purchaseDate: IsoDate;
}

/** The exchange rate to store with the expense: foreign units per 1 MYR, and the date it is for. */
export interface RateQuote {
  ratePerMyr: number;
  rateDate: IsoDate;
}

export type ExpenseProblem = 'amount_missing' | 'unknown_currency' | 'unknown_category' | 'invalid_date' | 'rate_missing' | 'text_too_long' | 'not_found';

export const MAX_TEXT_LENGTH = 80;

export const expenseProblemMessages: Record<ExpenseProblem, string> = {
  amount_missing: 'Enter an amount above zero.',
  unknown_currency: 'Choose a currency.',
  unknown_category: 'Choose a category.',
  invalid_date: 'Choose the day you paid.',
  rate_missing: 'There is no exchange rate for that currency yet. Connect to the internet once, or enter the amount in Ringgit.',
  text_too_long: `Keep the name and note under ${MAX_TEXT_LENGTH} characters each.`,
  not_found: 'That expense no longer exists.',
};

export function validateExpenseDraft(draft: ExpenseDraft, rate: RateQuote | null): ExpenseProblem[] {
  const problems: ExpenseProblem[] = [];
  if (!Number.isSafeInteger(draft.amountOriginal) || draft.amountOriginal <= 0) problems.push('amount_missing');
  if (!(draft.currency in currencies)) problems.push('unknown_currency');
  if (!CATEGORIES.includes(draft.category)) problems.push('unknown_category');
  if (!isIsoDate(draft.purchaseDate)) problems.push('invalid_date');
  if (draft.merchantName.length > MAX_TEXT_LENGTH || draft.note.length > MAX_TEXT_LENGTH) problems.push('text_too_long');
  const needsRate = draft.currency !== 'MYR';
  if (needsRate && (rate === null || !Number.isFinite(rate.ratePerMyr) || rate.ratePerMyr <= 0)) problems.push('rate_missing');
  return problems;
}

export type ExpenseResult = { ok: true; data: AppData; expense: Expense } | { ok: false; problems: ExpenseProblem[] };

function build(draft: ExpenseDraft, rate: RateQuote | null, base: Pick<Expense, 'id' | 'tripId' | 'createdAt' | 'source' | 'receipt'>): Expense {
  const isHome = draft.currency === 'MYR';
  const rateUsed = isHome ? 1 : (rate as RateQuote).ratePerMyr;
  return {
    id: base.id,
    tripId: base.tripId,
    createdAt: base.createdAt,
    source: base.source,
    // A scanned expense keeps what its receipt showed, even after its details are edited.
    ...(base.receipt ? { receipt: base.receipt } : {}),
    note: draft.note.trim(),
    amountOriginal: draft.amountOriginal,
    currency: draft.currency,
    rateUsed,
    rateDate: isHome ? draft.purchaseDate : (rate as RateQuote).rateDate,
    amountMyr: convertToMyr(draft.amountOriginal, draft.currency, rateUsed),
    category: draft.category,
    merchantName: draft.merchantName.trim() || 'Expense',
    purchaseDate: draft.purchaseDate,
  };
}

/** Adds an expense to a trip. Returns new data; the input is left untouched. */
export function addExpense(
  data: AppData,
  tripId: string,
  draft: ExpenseDraft,
  rate: RateQuote | null,
  id: string,
  now: string,
  source: ExpenseSource = 'manual',
  receipt?: ReceiptDetails,
): ExpenseResult {
  const problems = validateExpenseDraft(draft, rate);
  if (!data.trips.some((trip) => trip.id === tripId)) problems.push('not_found');
  if (problems.length > 0) return { ok: false, problems };
  const expense = build(draft, rate, { id, tripId, createdAt: now, source, receipt });
  return { ok: true, expense, data: { ...data, expenses: [...data.expenses, expense] } };
}

/**
 * Changes an expense. If the amount and currency are unchanged, the exchange rate saved when it
 * was first logged is kept, so editing a note never changes what a past purchase cost in Ringgit.
 */
export function updateExpense(data: AppData, expenseId: string, draft: ExpenseDraft, rate: RateQuote | null): ExpenseResult {
  const existing = data.expenses.find((expense) => expense.id === expenseId);
  if (!existing) return { ok: false, problems: ['not_found'] };
  const sameMoney = existing.amountOriginal === draft.amountOriginal && existing.currency === draft.currency;
  const rateToUse: RateQuote | null = sameMoney ? { ratePerMyr: existing.rateUsed, rateDate: existing.rateDate } : rate;
  const problems = validateExpenseDraft(draft, rateToUse);
  if (problems.length > 0) return { ok: false, problems };
  const expense = build(draft, rateToUse, existing);
  if (existing.taxRefund) expense.taxRefund = existing.taxRefund;
  if (sameMoney) expense.rateDate = existing.rateDate;
  return { ok: true, expense, data: { ...data, expenses: data.expenses.map((e) => (e.id === expenseId ? expense : e)) } };
}

/** Records the user's answers about a purchase's tax refund (shop confirmed, claimed, received). */
export function setRefundState(data: AppData, expenseId: string, change: RefundState): AppData {
  return {
    ...data,
    expenses: data.expenses.map((e) => (e.id === expenseId ? { ...e, taxRefund: { ...e.taxRefund, ...change } } : e)),
  };
}

export function deleteExpense(data: AppData, expenseId: string): AppData {
  return { ...data, expenses: data.expenses.filter((expense) => expense.id !== expenseId) };
}

export function newExpenseId(): string {
  return `expense-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
