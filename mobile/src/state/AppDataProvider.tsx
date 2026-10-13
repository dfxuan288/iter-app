import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { today as currentDay } from '@/config/demo';
import { createSeedData } from '@/data/seed';
import { summarizeTrip, type TripSummary } from '@/domain/budget';
import type { IsoDate } from '@/domain/dates';
import type { AppData, Expense, Trip } from '@/domain/types';
import { loadAppData, saveAppData, type LoadOutcome } from '@/services/appDataStore';
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
  resetDemo: () => void;
}

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
    const tripExpenses = trip ? data.expenses.filter((e) => e.tripId === trip.id) : [];

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
      expenses: [...tripExpenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      loadOutcome,
      saveFailed,
      addTrip: (draft) => {
        const result = createTrip(data, draft, newTripId(), new Date().toISOString());
        if (!result.ok) return result;
        commit(result.data);
        return { ok: true };
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
