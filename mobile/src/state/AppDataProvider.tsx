import { createContext, use, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { defaultClock } from '@/config/demo';
import type { PassKind } from '@/config/plans';
import { createSeedData } from '@/data/seed';
import { expensesAsOf, summarizeTrip, type TripSummary } from '@/domain/budget';
import { readClock, shiftDay, todayFor, type AppClock } from '@/domain/clock';
import type { IsoDate } from '@/domain/dates';
import { accessOn, activatePlan, addPass, recordScan, scansLeftToday, type Access } from '@/domain/plan';
import type { AppData, Expense, ExpenseSource, ReceiptDetails, RefundState, Trip } from '@/domain/types';
import { loadAppData, saveAppData, type LoadOutcome } from '@/services/appDataStore';
import { imageStore } from '@/services/imageStore';
import { addExpense, deleteExpense, newExpenseId, setRefundState, updateExpense, type ExpenseDraft, type ExpenseProblem, type RateQuote } from '@/services/expenseService';
import { activeTrip, createTrip, newTripId, removeTrip, switchTrip, toggleRefundChecklist, type TripDraft, type TripDraftProblem } from '@/services/tripService';

export interface AppDataContextValue {
  /** False until saved data has been read from the phone. */
  ready: boolean;
  data: AppData;
  today: IsoDate;
  trip: Trip | undefined;
  /** Calculated figures for the active trip. */
  summary: TripSummary | undefined;
  /** The active trip's expenses up to today, most recent first. */
  expenses: Expense[];
  /** Every trip's expenses up to today (later-dated ones are hidden while the app date is earlier). */
  expensesToDate: Expense[];
  /** How many of the active trip's expenses are dated after today (only with the demo date moved back). */
  laterExpenseCount: number;
  loadOutcome: LoadOutcome | null;
  /** True when the last change could not be written to the phone's storage. */
  saveFailed: boolean;
  addTrip: (draft: TripDraft) => { ok: true } | { ok: false; problems: TripDraftProblem[] };
  /** Adds an expense to the active trip. `rate` is the exchange rate to save with it. */
  addExpense: (
    draft: ExpenseDraft,
    rate: RateQuote | null,
    extras?: { source?: ExpenseSource; receipt?: ReceiptDetails; taxRefund?: RefundState },
  ) => ExpenseActionResult;
  updateExpense: (expenseId: string, draft: ExpenseDraft, rate: RateQuote | null) => ExpenseActionResult;
  deleteExpense: (expenseId: string) => void;
  /** Saves the user's answers about a purchase's tax refund. */
  updateRefund: (expenseId: string, change: RefundState) => void;
  toggleRefundChecklist: (tripId: string, itemId: string) => void;
  /** Makes another saved trip the current one. */
  switchTrip: (tripId: string) => void;
  /** Deletes a trip with its expenses and receipt photos. */
  removeTrip: (tripId: string) => void;
  resetDemo: () => void;
  /** What "today" is inside the app: the demo date, or the phone's real date. */
  clock: AppClock;
  /** Moves the demo date a day forward (1) or back (-1). */
  shiftDay: (days: number) => void;
  setClock: (clock: AppClock) => void;
  /** What today's plan allows: everything, or the free version (see domain/plan.ts). */
  access: Access;
  /** Scans left today: `null` means no limit. */
  scansLeft: number | null;
  /** Simulated purchase: no money moves. The pass starts by itself when a trip day needs it. */
  buyPass: (kind: PassKind) => void;
  /** Counts a scan sent today, for the free trial's daily limit. */
  recordScan: () => void;
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

  // The trial or a saved pass starts by itself on a trip day that is not covered (domain/plan.ts).
  // This is worked out from the data each time; it is written to the phone with the next change.
  const current = useMemo(() => {
    const today = todayFor(readClock(data.clock, defaultClock), new Date());
    const plan = activatePlan(data.plan, activeTrip(data), today);
    return plan === data.plan ? data : { ...data, plan };
  }, [data]);

  // Scans finish after a wait; this lets them count against the latest data, not the data from when they started.
  const latest = useRef(current);
  useEffect(() => {
    latest.current = current;
    // Save a plan that just started (for example the trial on day 1), so it is not started again elsewhere.
    if (current !== data && loadOutcome !== null) void saveAppData(current).then((saved) => setSaveFailed(!saved));
  }, [current, data, loadOutcome]);

  const value = useMemo<AppDataContextValue>(() => {
    const data = current;
    const clock = readClock(data.clock, defaultClock);
    const today = todayFor(clock, new Date());
    const trip = activeTrip(data);
    // Newest day first; within a day, the one added last comes first. (Order of adding is used rather
    // than the saved time, because the demo runs on a fixed date that real clock times do not match.)
    const expensesToDate = expensesAsOf(data.expenses, today);
    const tripExpenses = trip
      ? expensesToDate
          .map((expense, index) => ({ expense, index }))
          .filter(({ expense }) => expense.tripId === trip.id)
          .sort((a, b) => b.expense.purchaseDate.localeCompare(a.expense.purchaseDate) || b.index - a.index)
          .map(({ expense }) => expense)
      : [];

    // Every change goes through here: update the screen at once, then write it to the phone.
    const commit = (next: AppData) => {
      latest.current = next;
      setData(next);
      void saveAppData(next).then((saved) => setSaveFailed(!saved));
    };

    return {
      ready: loadOutcome !== null,
      data,
      today,
      trip,
      summary: trip
        ? summarizeTrip({ trip, categoryBudgets: data.categoryBudgets, expenses: expensesToDate, today })
        : undefined,
      expenses: tripExpenses,
      expensesToDate,
      laterExpenseCount: trip ? data.expenses.filter((e) => e.tripId === trip.id && e.purchaseDate > today).length : 0,
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
        commit(extras.taxRefund ? setRefundState(result.data, result.expense.id, extras.taxRefund) : result.data);
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
      updateRefund: (expenseId, change) => commit(setRefundState(data, expenseId, change)),
      toggleRefundChecklist: (tripId, itemId) => commit(toggleRefundChecklist(data, tripId, itemId)),
      switchTrip: (tripId) => commit(switchTrip(data, tripId)),
      removeTrip: (tripId) => {
        const result = removeTrip(data, tripId);
        commit(result.data);
        result.imageIds.forEach((id) => void imageStore.remove(id));
      },
      resetDemo: () => commit(createSeedData()),
      clock,
      shiftDay: (days) => commit({ ...data, clock: shiftDay(clock, days, new Date()) }),
      setClock: (next) => commit({ ...data, clock: next }),
      access: accessOn(data.plan, trip, today),
      scansLeft: scansLeftToday(data.plan, trip, today),
      buyPass: (kind) => commit({ ...data, plan: activatePlan(addPass(data.plan, kind, newPassId(), today), trip, today) }),
      recordScan: () => {
        const now = latest.current;
        commit({ ...now, plan: recordScan(now.plan, todayFor(readClock(now.clock, defaultClock), new Date())) });
      },
    };
  }, [current, loadOutcome, saveFailed]);

  // Nothing is shown until the phone's saved data has been read (it takes a moment). Otherwise a
  // screen could briefly show the demo data, and a tap in that moment would save over the real data.
  if (loadOutcome === null) return null;
  return <AppDataContext value={value}>{children}</AppDataContext>;
}

const newPassId = () => `pass-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function useAppData(): AppDataContextValue {
  const value = use(AppDataContext);
  if (!value) throw new Error('useAppData must be used inside <AppDataProvider>');
  return value;
}
