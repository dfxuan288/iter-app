import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStorage } from '@/services/appDataStore';

/**
 * A random id for this phone, sent with scans so the backend can apply its daily per-device
 * limit. It identifies nothing about the person and is not used for anything else.
 */

const KEY = 'iter.deviceId';
let cached: string | null = null;

function randomId(): string {
  const random = () => Math.random().toString(36).slice(2, 10);
  return `iter-${Date.now().toString(36)}-${random()}${random()}`;
}

export async function getDeviceId(storage: KeyValueStorage = AsyncStorage): Promise<string> {
  if (cached) return cached;
  try {
    const saved = await storage.getItem(KEY);
    if (saved && /^[A-Za-z0-9_-]{8,64}$/.test(saved)) {
      cached = saved;
      return saved;
    }
  } catch {
    // Storage unavailable: a fresh id still works for this session.
  }
  const id = randomId();
  cached = id;
  try {
    await storage.setItem(KEY, id);
  } catch {
    // Not being able to keep the id only means the limit counts this session separately.
  }
  return id;
}

/** For tests only. */
export function forgetDeviceIdForTests(): void {
  cached = null;
}
