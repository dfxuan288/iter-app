import AsyncStorage from '@react-native-async-storage/async-storage';

import { createSeedData, createSeedPlan } from '@/data/seed';
import { readPlan } from '@/domain/plan';
import { isCategory, type AppData, type CategoryBudget, type Expense } from '@/domain/types';

/**
 * Saves and loads everything ITER keeps on the phone. Nothing here throws: storage can fail
 * (private browsing, a full disk), and the app must keep working with what it has in memory.
 */

const STORAGE_KEY = 'iter.appData.v1';
/** If saved data cannot be read, the raw text is kept here so it is not lost. */
const BACKUP_KEY = 'iter.appData.unreadable';
/** Expenses and plans in categories ITER no longer has (hotel stays, 15 Oct 2026) are kept here. */
const RETIRED_KEY = 'iter.appData.retiredCategories';

export interface Retired {
  expenses: Expense[];
  categoryBudgets: CategoryBudget[];
}

/**
 * Takes out anything saved in a category ITER no longer tracks, such as 'stay' from before hotels
 * were removed. Returns the cleaned data and what was taken out, so it can be kept rather than lost.
 */
export function withoutRetiredCategories(data: AppData): { data: AppData; retired: Retired } {
  const retired: Retired = {
    expenses: data.expenses.filter((e) => !isCategory(e.category)),
    categoryBudgets: data.categoryBudgets.filter((b) => !isCategory(b.category)),
  };
  if (retired.expenses.length === 0 && retired.categoryBudgets.length === 0) return { data, retired };
  return {
    data: { ...data, expenses: data.expenses.filter((e) => isCategory(e.category)), categoryBudgets: data.categoryBudgets.filter((b) => isCategory(b.category)) },
    retired,
  };
}

/** The few storage operations needed, so tests can supply a fake. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export type LoadOutcome =
  | 'loaded' // saved data was found and is in use
  | 'first_run' // nothing saved yet: started from the demo data
  | 'recovered' // saved data was unreadable: started from the demo data, original kept as a backup
  | 'storage_unavailable'; // storage could not be read at all: running in memory only

export interface LoadResult {
  data: AppData;
  outcome: LoadOutcome;
}

/**
 * Data saved before plans existed (before 17 Oct 2026) has no plan: it gets the demo's plan, since
 * every saved copy so far started from the demo. A damaged plan is replaced the same way.
 */
export function withPlan(data: AppData): AppData {
  const plan = readPlan((data as Partial<AppData>).plan);
  return plan ? { ...data, plan } : { ...data, plan: createSeedPlan() };
}

function isAppData(value: unknown): value is AppData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    typeof v.user === 'object' &&
    v.user !== null &&
    Array.isArray(v.trips) &&
    Array.isArray(v.categoryBudgets) &&
    Array.isArray(v.expenses) &&
    (v.activeTripId === null || typeof v.activeTripId === 'string')
  );
}

export async function loadAppData(storage: KeyValueStorage = AsyncStorage): Promise<LoadResult> {
  let raw: string | null;
  try {
    raw = await storage.getItem(STORAGE_KEY);
  } catch {
    return { data: createSeedData(), outcome: 'storage_unavailable' };
  }
  if (raw === null) return { data: createSeedData(), outcome: 'first_run' };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isAppData(parsed)) {
      const { data, retired } = withoutRetiredCategories(withPlan(parsed));
      if (retired.expenses.length > 0 || retired.categoryBudgets.length > 0) {
        try {
          const earlier = JSON.parse((await storage.getItem(RETIRED_KEY)) ?? 'null') as Retired | null;
          await storage.setItem(
            RETIRED_KEY,
            JSON.stringify({ expenses: [...(earlier?.expenses ?? []), ...retired.expenses], categoryBudgets: [...(earlier?.categoryBudgets ?? []), ...retired.categoryBudgets] }),
          );
          await storage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
          // Keeping the old entries is a best effort; the app runs on the cleaned data either way.
        }
      }
      return { data, outcome: 'loaded' };
    }
  } catch {
    // Fall through to recovery.
  }
  try {
    await storage.setItem(BACKUP_KEY, raw);
  } catch {
    // The backup is a best effort; the app still starts.
  }
  return { data: createSeedData(), outcome: 'recovered' };
}

/** Returns false if the data could not be written, so the UI can warn the user. */
export async function saveAppData(data: AppData, storage: KeyValueStorage = AsyncStorage): Promise<boolean> {
  try {
    await storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
