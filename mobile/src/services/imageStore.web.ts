/**
 * Keeps receipt photos in the browser's IndexedDB, which holds far more than the few megabytes
 * of ordinary web storage. Same interface as imageStore.ts. Nothing here throws.
 */

const DB_NAME = 'iter-images';
const STORE = 'images';

let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'));
  }).catch((error: unknown) => {
    opening = null;
    throw error;
  });
  return opening;
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export const imageStore = {
  /** Returns false when the photo could not be kept. */
  async save(id: string, base64Jpeg: string): Promise<boolean> {
    try {
      await run('readwrite', (store) => store.put(base64Jpeg, id));
      return true;
    } catch {
      return false;
    }
  },

  /** A data URI ready for an <Image>, or null when the photo is not here. */
  async load(id: string): Promise<string | null> {
    try {
      const data = await run<unknown>('readonly', (store) => store.get(id));
      return typeof data === 'string' ? `data:image/jpeg;base64,${data}` : null;
    } catch {
      return null;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await run('readwrite', (store) => store.delete(id));
    } catch {
      // A leftover photo costs a little space and nothing else.
    }
  },
};
