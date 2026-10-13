import AsyncStorage from '@react-native-async-storage/async-storage';

import { createSeedData } from '@/data/seed';
import type { AppData } from '@/domain/types';

/**
 * Saves and loads everything ITER keeps on the phone. Nothing here throws: storage can fail
 * (private browsing, a full disk), and the app must keep working with what it has in memory.
 */

const STORAGE_KEY = 'iter.appData.v1';
/** If saved data cannot be read, the raw text is kept here so it is not lost. */
const BACKUP_KEY = 'iter.appData.unreadable';

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
    if (isAppData(parsed)) return { data: parsed, outcome: 'loaded' };
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
