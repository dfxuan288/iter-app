import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CurrencyCode } from '@/domain/money';
import type { KeyValueStorage } from '@/services/appDataStore';
import { parseMenuReply, type MenuOutcome, type MenuScan } from '@/services/scanService';

/**
 * Menus the user has photographed (brief §8 MenuScan). The most recent ones are kept on the phone
 * so a menu can be opened again during the meal. Pure functions, plus loading and saving.
 */

export interface MenuRecord {
  id: string;
  tripId: string;
  createdAt: string;
  /** The smaller photo kept to show the menu again. */
  imageId: string | null;
  /** The copy sent for reading; deleted once the menu has been read. */
  scanImageId: string | null;
  sampleId?: string;
  currencyHint?: CurrencyCode;
  status: 'reading' | 'ready' | 'failed';
  scan?: MenuScan;
  failure?: { message: string; canRetry: boolean };
}

/** How many menus are kept. Older ones (and their photos) are removed. */
export const MAX_MENUS = 10;

const OFFLINE_MESSAGE = 'You are offline. Menus need a connection to translate. Try again when you are back online.';

export function addMenu(menus: MenuRecord[], record: Omit<MenuRecord, 'status'>): { menus: MenuRecord[]; dropped: MenuRecord[] } {
  const all = [{ ...record, status: 'reading' as const }, ...menus];
  return { menus: all.slice(0, MAX_MENUS), dropped: all.slice(MAX_MENUS) };
}

const update = (menus: MenuRecord[], id: string, change: (m: MenuRecord) => MenuRecord) => menus.map((m) => (m.id === id ? change(m) : m));

export function markReading(menus: MenuRecord[], id: string): MenuRecord[] {
  return update(menus, id, (m) => ({ ...m, status: 'reading', failure: undefined }));
}

export function applyMenuOutcome(menus: MenuRecord[], id: string, outcome: MenuOutcome): MenuRecord[] {
  return update(menus, id, (m) => {
    if (outcome.ok) return { ...m, status: 'ready', scan: outcome.scan, scanImageId: null, failure: undefined };
    if (outcome.retryLater) return { ...m, status: 'failed', failure: { message: OFFLINE_MESSAGE, canRetry: true } };
    return { ...m, status: 'failed', failure: { message: outcome.message, canRetry: outcome.canRetry } };
  });
}

export function removeMenu(menus: MenuRecord[], id: string): MenuRecord[] {
  return menus.filter((m) => m.id !== id);
}

const STORAGE_KEY = 'iter.menus.v1';

function isRecord(value: unknown): value is MenuRecord {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.tripId === 'string' && ['reading', 'ready', 'failed'].includes(v.status as string);
}

export async function loadMenus(storage: KeyValueStorage = AsyncStorage): Promise<MenuRecord[]> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecord).map((m): MenuRecord => {
      // A saved reading is checked again before it is trusted.
      const scan = m.scan ? (parseMenuReply({ source: m.scan.readBy, result: m.scan.menu, checks: m.scan.checks }) ?? undefined) : undefined;
      if (m.status === 'ready' && scan) return { ...m, scan };
      // Interrupted while reading (the app closed), or a damaged reading: offer to try again.
      if (m.status !== 'failed') return { ...m, status: 'failed', scan: undefined, failure: { message: 'This menu was not finished. Try again.', canRetry: m.scanImageId !== null } };
      return { ...m, scan: undefined };
    });
  } catch {
    return [];
  }
}

export async function saveMenus(menus: MenuRecord[], storage: KeyValueStorage = AsyncStorage): Promise<boolean> {
  try {
    await storage.setItem(STORAGE_KEY, JSON.stringify(menus));
    return true;
  } catch {
    return false;
  }
}

export function newMenuId(): string {
  return `menu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
