import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { imageStore } from '@/services/imageStore';
import { prepareReceiptPhoto } from '@/services/imagePrep';
import {
  addPending,
  applyOutcome,
  loadQueue,
  markScanning,
  newScanId,
  nextToScan,
  removePending,
  retry as retryPending,
  saveQueue,
  type PendingScan,
  type ScanQueue,
} from '@/services/scanQueue';
import { scanReceipt } from '@/services/scanService';
import { useAppData } from '@/state/AppDataProvider';

/**
 * Looks after receipt photos between the camera and a saved expense (see services/scanQueue).
 * Photos are stored first, then sent one at a time. Without a connection they wait, and are sent
 * automatically when the phone is back online (brief §5.1 offline-first).
 */

export interface ScanQueueContextValue {
  items: ScanQueue;
  /** False when the phone has no connection, or ITER's server could not be reached on the last try. */
  online: boolean;
  /** Stores the photo and starts reading it. Returns the scan's id, to open its review screen. */
  startScan: (photo: { uri: string; sampleId?: string }) => Promise<{ ok: true; id: string } | { ok: false; message: string }>;
  retry: (id: string) => void;
  /** Removes a scan and its photos, e.g. "Discard" on the review screen. */
  discard: (id: string) => void;
  /** Removes a scan whose expense was saved. Its kept photo now belongs to the expense. */
  finish: (id: string) => void;
}

const ScanQueueContext = createContext<ScanQueueContextValue | null>(null);

/** How often to look for a connection while photos are waiting. */
const RETRY_EVERY_MS = 30_000;

const browserOnline = () => (Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.onLine !== false : true);

export function ScanQueueProvider({ children }: { children: ReactNode }) {
  const { data, trip } = useAppData();
  const [queue, setQueue] = useState<ScanQueue>([]);
  const [loaded, setLoaded] = useState(false);
  const [online, setOnline] = useState(browserOnline);
  // Set when the server could not be reached; cleared by the next "online" event or timer tick.
  const [waitingForNetwork, setWaitingForNetwork] = useState(false);
  const busy = useRef(false);
  const tripsRef = useRef(data.trips);

  useEffect(() => {
    tripsRef.current = data.trips;
  }, [data.trips]);

  useEffect(() => {
    let active = true;
    void loadQueue().then((saved) => {
      if (!active) return;
      setQueue(saved);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Every change is written to the phone, so a photo is never lost.
  useEffect(() => {
    if (loaded) void saveQueue(queue);
  }, [queue, loaded]);

  // Listen for the connection coming back, and look again every half minute.
  useEffect(() => {
    const retryNow = () => {
      setOnline(browserOnline());
      setWaitingForNetwork(false);
    };
    const timer = setInterval(retryNow, RETRY_EVERY_MS);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const offline = () => setOnline(false);
      window.addEventListener('online', retryNow);
      window.addEventListener('offline', offline);
      return () => {
        clearInterval(timer);
        window.removeEventListener('online', retryNow);
        window.removeEventListener('offline', offline);
      };
    }
    return () => clearInterval(timer);
  }, []);

  // Send the next waiting photo, one at a time.
  useEffect(() => {
    const item = nextToScan(queue);
    if (!loaded || !online || waitingForNetwork || busy.current || !item) return;
    busy.current = true;
    void (async () => {
      setQueue((current) => markScanning(current, item.id));
      const image = await imageStore.load(item.scanImageId);
      const itemTrip = tripsRef.current.find((t) => t.id === item.tripId);
      const outcome =
        image && itemTrip
          ? await scanReceipt({ image: image.replace(/^data:image\/[a-z]+;base64,/, ''), sampleId: item.sampleId, trip: itemTrip })
          : ({
              ok: false,
              retryLater: false,
              code: 'photo_missing',
              message: itemTrip ? 'The photo is no longer on this phone. Take it again.' : 'The trip for this receipt no longer exists.',
              canRetry: false,
            } as const);
      setQueue((current) => applyOutcome(current, item.id, outcome));
      if (!outcome.ok && outcome.retryLater) setWaitingForNetwork(true);
      busy.current = false;
    })();
  }, [queue, loaded, online, waitingForNetwork]);

  const startScan = useCallback<ScanQueueContextValue['startScan']>(
    async ({ uri, sampleId }) => {
      if (!trip) return { ok: false, message: 'Plan a trip first, so the receipt has somewhere to go.' };
      let prepared;
      try {
        prepared = await prepareReceiptPhoto(uri);
      } catch {
        return { ok: false, message: 'That photo could not be opened. Try another one.' };
      }
      const id = newScanId();
      const scanImageId = `${id}-scan`;
      if (!(await imageStore.save(scanImageId, prepared.scan.base64))) {
        return { ok: false, message: 'There is no room on this phone to keep the photo. Free some space and try again.' };
      }
      const keepImageId = (await imageStore.save(`${id}-keep`, prepared.keep.base64)) ? `${id}-keep` : null;
      setQueue((current) => addPending(current, { id, tripId: trip.id, createdAt: new Date().toISOString(), scanImageId, keepImageId, sampleId }));
      setWaitingForNetwork(false);
      return { ok: true, id };
    },
    [trip],
  );

  const value = useMemo<ScanQueueContextValue>(() => {
    const find = (id: string): PendingScan | undefined => queue.find((item) => item.id === id);
    return {
      items: queue,
      online: online && !waitingForNetwork,
      startScan,
      retry: (id) => {
        setQueue((current) => retryPending(current, id));
        setWaitingForNetwork(false);
      },
      discard: (id) => {
        const item = find(id);
        setQueue((current) => removePending(current, id));
        if (item) {
          void imageStore.remove(item.scanImageId);
          if (item.keepImageId) void imageStore.remove(item.keepImageId);
        }
      },
      finish: (id) => {
        const item = find(id);
        setQueue((current) => removePending(current, id));
        if (item) void imageStore.remove(item.scanImageId);
      },
    };
  }, [queue, online, waitingForNetwork, startScan]);

  return <ScanQueueContext value={value}>{children}</ScanQueueContext>;
}

export function useScanQueue(): ScanQueueContextValue {
  const value = use(ScanQueueContext);
  if (!value) throw new Error('useScanQueue must be used inside <ScanQueueProvider>');
  return value;
}
