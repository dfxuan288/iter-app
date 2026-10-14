import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStorage } from '@/services/appDataStore';
import { parseReceiptReply, type ReceiptScan, type ScanOutcome } from '@/services/scanService';

/**
 * Receipt photos between the camera and a saved expense. Each one is saved on the phone first,
 * so nothing is lost if the connection drops or the app closes:
 *   waiting  -> not sent yet (offline, or the server did not answer); sent automatically later
 *   scanning -> being read now
 *   ready    -> read; waiting for the user to check and save it (nothing is saved silently)
 *   failed   -> could not be read; the user can retry, retake or type it in
 * The functions below are pure: they return a new list and leave the old one untouched.
 */

export type PendingStatus = 'waiting' | 'scanning' | 'ready' | 'failed';

export interface PendingScan {
  id: string;
  tripId: string;
  createdAt: string;
  /** The copy sent for scanning; deleted once the scan is saved or discarded. */
  scanImageId: string;
  /** The smaller copy kept with the expense, if it could be stored. */
  keepImageId: string | null;
  /** Set for the demo sample receipts. */
  sampleId?: string;
  status: PendingStatus;
  attempts: number;
  scan?: ReceiptScan;
  failure?: { code: string; message: string; canRetry: boolean };
}

export type ScanQueue = PendingScan[];

export function addPending(queue: ScanQueue, item: Omit<PendingScan, 'status' | 'attempts'>): ScanQueue {
  return [...queue, { ...item, status: 'waiting', attempts: 0 }];
}

const update = (queue: ScanQueue, id: string, change: (item: PendingScan) => PendingScan): ScanQueue =>
  queue.map((item) => (item.id === id ? change(item) : item));

export function markScanning(queue: ScanQueue, id: string): ScanQueue {
  return update(queue, id, (item) => ({ ...item, status: 'scanning', attempts: item.attempts + 1, failure: undefined }));
}

export function applyOutcome(queue: ScanQueue, id: string, outcome: ScanOutcome): ScanQueue {
  return update(queue, id, (item) => {
    if (outcome.ok) return { ...item, status: 'ready', scan: outcome.scan, failure: undefined };
    if (outcome.retryLater) return { ...item, status: 'waiting' };
    return { ...item, status: 'failed', failure: { code: outcome.code, message: outcome.message, canRetry: outcome.canRetry } };
  });
}

/** Puts a failed scan back in line, for the "Try again" button. */
export function retry(queue: ScanQueue, id: string): ScanQueue {
  return update(queue, id, (item) => (item.status === 'failed' ? { ...item, status: 'waiting', failure: undefined } : item));
}

export function removePending(queue: ScanQueue, id: string): ScanQueue {
  return queue.filter((item) => item.id !== id);
}

/** The next photo to send, oldest first. */
export function nextToScan(queue: ScanQueue): PendingScan | undefined {
  return queue.find((item) => item.status === 'waiting');
}

/** A scan cut off by the app closing goes back to waiting rather than looking stuck. */
export function resumeInterrupted(queue: ScanQueue): ScanQueue {
  return queue.map((item) => (item.status === 'scanning' ? { ...item, status: 'waiting' } : item));
}

const STORAGE_KEY = 'iter.scanQueue.v1';

function isPending(value: unknown): value is PendingScan {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.tripId === 'string' &&
    typeof v.scanImageId === 'string' &&
    ['waiting', 'scanning', 'ready', 'failed'].includes(v.status as string)
  );
}

export async function loadQueue(storage: KeyValueStorage = AsyncStorage): Promise<ScanQueue> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return resumeInterrupted(
      parsed.filter(isPending).map((item) => {
        // A saved reading is checked again, so a damaged one is re-scanned rather than trusted.
        const scan = item.scan ? (parseReceiptReply({ source: item.scan.readBy, modelUsed: item.scan.modelUsed, result: item.scan.receipt, checks: item.scan.checks, uncertainFields: item.scan.uncertainFields }) ?? undefined) : undefined;
        return item.status === 'ready' && !scan ? { ...item, status: 'waiting' as const, scan: undefined } : { ...item, scan };
      }),
    );
  } catch {
    return [];
  }
}

/** Returns false when the queue could not be written. */
export async function saveQueue(queue: ScanQueue, storage: KeyValueStorage = AsyncStorage): Promise<boolean> {
  try {
    await storage.setItem(STORAGE_KEY, JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}

export function newScanId(): string {
  return `scan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
