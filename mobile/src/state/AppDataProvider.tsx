import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { today as currentDay } from '@/config/demo';
import { createSeedData } from '@/data/seed';
import { summarizeTrip, type TripSummary } from '@/domain/budget';
import type { IsoDate } from '@/domain/dates';
import type { AppData, Expense, ExpenseSource, ReceiptDetails, Trip } from '@/domain/types';
import { loadAppData, saveAppData, type LoadOutcome } from '@/services/appDataStore';
import { imageStore } from '@/services/imageStore';
import { addExpense, deleteExpense, newExpenseId, updateExpense, type ExpenseDraft, type ExpenseProblem, type RateQuote } from '@/services/expenseService';
import { activeTrip, createTrip, newTripId, type TripDraft, type TripDraftProblem } from '@/services/tripService';

export interface AppDataContextValue {
  /** False until saved data has been read from the phone. */
  ready: boolean;
  data: AppData;
  today: IsoDate;
  trip: Trip | undefined;
  /** Calculated figures for the active trip. */
  summary: TripSummary | undefined;
  /** The active trip's expenses, most recent first. */
  expenses: Expense[];
  loadOutcome: LoadOutcome | null;
  /** True when the last change could not be written to the phone's storage. */
  saveFailed: boolean;
  addTrip: (draft: TripDraft) => { ok: true } | { ok: false; problems: TripDraftProblem[] };
  /** Adds an expense to the active trip. `rate` is the exchange rate to save with it. */
  addExpense: (draft: ExpenseDraft, rate: RateQuote | null, extras?: { source?: ExpenseSource; receipt?: ReceiptDetails }) => ExpenseActionResult;
  updateExpense: (expenseId: string, draft: ExpenseDraft, rate: RateQuote | null) => ExpenseActionResult;
  deleteExpense: (expenseId: string) => void;
  resetDemo: () => void;
}

export type ExpenseActionResult = { ok: true } | { ok: false; problems: ExpenseProblem[] };

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(createSeedData);
  const [loadOutcome, setLoadOutcome] = useState<LoadOutcome | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void loadAppData().then((result) => {
      if (!active) return;
      setData(result.data);
      setLoadOutcome(result.outcome);
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AppDataContextValue>(() => {
    const today = currentDay();
    const trip = activeTrip(data);
    // Newest day first; within a day, the one added last comes first. (Order of adding is used rather
    // than the saved time, because the demo runs on a fixed date that real clock times do not match.)
    const tripExpenses = trip
      ? data.expenses
          .map((expense, index) => ({ expense, index }))
          .filter(({ expense }) => expense.tripId === trip.id)
          .sort((a, b) => b.expense.purchaseDate.localeCompare(a.expense.purchaseDate) || b.index - a.index)
          .map(({ expense }) => expense)
      : [];

    // Every change goes through here: update the screen at once, then write it to the phone.
    const commit = (next: AppData) => {
      setData(next);
      void saveAppData(next).then((saved) => setSaveFailed(!saved));
    };

    return {
      ready: loadOutcome !== null,
      data,
      today,
      trip,
      summary: trip
        ? summarizeTrip({ trip, categoryBudgets: data.categoryBudgets, expenses: data.expenses, today })
        : undefined,
      expenses: tripExpenses,
      loadOutcome,
      saveFailed,
      addTrip: (draft) => {
        const result = createTrip(data, draft, newTripId(), new Date().toISOString());
        if (!result.ok) return result;
        commit(result.data);
        return { ok: true };
      },
      addExpense: (draft, rate, extras = {}) => {
        if (!trip) return { ok: false, problems: ['not_found'] };
        const result = addExpense(data, trip.id, draft, rate, newExpenseId(), new Date().toISOString(), extras.source, extras.receipt);
        if (!result.ok) return result;
        commit(result.data);
        return { ok: true };
      },
      updateExpense: (expenseId, draft, rate) => {
        const result = updateExpense(data, expenseId, draft, rate);
        if (!result.ok) return result;
        commit(result.data);
        return { ok: true };
      },
      deleteExpense: (expenseId) => {
        const imageId = data.expenses.find((e) => e.id === expenseId)?.receipt?.imageId;
        commit(deleteExpense(data, expenseId));
        if (imageId) void imageStore.remove(imageId);
      },
      resetDemo: () => commit(createSeedData()),
    };
  }, [data, loadOutcome, saveFailed]);

  return <AppDataContext value={value}>{children}</AppDataContext>;
}

export function useAppData(): AppDataContextValue {
  const value = use(AppDataContext);
  if (!value) throw new Error('useAppData must be used inside <AppDataProvider>');
  return value;
}
