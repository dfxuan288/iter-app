import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { CurrencyCode } from '@/domain/money';
import { imageStore } from '@/services/imageStore';
import { prepareReceiptPhoto } from '@/services/imagePrep';
import { addMenu, applyMenuOutcome, loadMenus, markReading, newMenuId, removeMenu, saveMenus, type MenuRecord } from '@/services/menuStore';
import { scanMenu } from '@/services/scanService';
import { useAppData } from '@/state/AppDataProvider';

/**
 * Photographed menus and their translations (brief §7.5 Menu). Unlike receipts, a menu is
 * needed there and then, so it is read straight away; without a connection the user is told
 * and can try again, rather than it waiting in the background.
 */

export interface MenuContextValue {
  menus: MenuRecord[];
  startMenuScan: (photo: { uri: string; sampleId?: string; currencyHint?: CurrencyCode }) => Promise<{ ok: true; id: string } | { ok: false; message: string }>;
  retry: (id: string) => void;
  remove: (id: string) => void;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  const { data, trip, scansLeft, recordScan } = useAppData();
  const [menus, setMenus] = useState<MenuRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const tripsRef = useRef(data.trips);

  useEffect(() => {
    tripsRef.current = data.trips;
  }, [data.trips]);

  useEffect(() => {
    let active = true;
    void loadMenus().then((saved) => {
      if (!active) return;
      setMenus(saved);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loaded) void saveMenus(menus);
  }, [menus, loaded]);

  const read = useCallback(async (record: Pick<MenuRecord, 'id' | 'tripId' | 'scanImageId' | 'sampleId' | 'currencyHint'>) => {
    const image = record.scanImageId ? await imageStore.load(record.scanImageId) : null;
    const menuTrip = tripsRef.current.find((t) => t.id === record.tripId);
    const outcome =
      image && menuTrip
        ? await scanMenu({ image: image.replace(/^data:image\/[a-z]+;base64,/, ''), sampleId: record.sampleId, currencyHint: record.currencyHint, trip: menuTrip })
        : ({ ok: false, retryLater: false, code: 'photo_missing', message: 'The photo is no longer on this phone. Take it again.', canRetry: false } as const);
    setMenus((current) => applyMenuOutcome(current, record.id, outcome));
    if (outcome.ok && record.scanImageId) void imageStore.remove(record.scanImageId);
  }, []);

  const startMenuScan = useCallback<MenuContextValue['startMenuScan']>(
    async ({ uri, sampleId, currencyHint }) => {
      if (!trip) return { ok: false, message: 'Plan a trip first.' };
      if (scansLeft === 0) return { ok: false, message: 'No scans left today. See Plans in the Me tab for a pass with unlimited scans.' };
      let prepared;
      try {
        prepared = await prepareReceiptPhoto(uri);
      } catch {
        return { ok: false, message: 'That photo could not be opened. Try another one.' };
      }
      const id = newMenuId();
      const scanImageId = `${id}-scan`;
      if (!(await imageStore.save(scanImageId, prepared.scan.base64))) {
        return { ok: false, message: 'There is no room on this phone to keep the photo. Free some space and try again.' };
      }
      const imageId = (await imageStore.save(`${id}-keep`, prepared.keep.base64)) ? `${id}-keep` : null;
      const record = { id, tripId: trip.id, createdAt: new Date().toISOString(), imageId, scanImageId, sampleId, currencyHint };
      setMenus((current) => {
        const { menus: next, dropped } = addMenu(current, record);
        for (const old of dropped) {
          if (old.imageId) void imageStore.remove(old.imageId);
          if (old.scanImageId) void imageStore.remove(old.scanImageId);
        }
        return next;
      });
      void read(record);
      recordScan();
      return { ok: true, id };
    },
    [trip, read, scansLeft, recordScan],
  );

  const value = useMemo<MenuContextValue>(
    () => ({
      menus,
      startMenuScan,
      retry: (id) => {
        const record = menus.find((m) => m.id === id);
        if (!record) return;
        setMenus((current) => markReading(current, id));
        void read(record);
      },
      remove: (id) => {
        const record = menus.find((m) => m.id === id);
        setMenus((current) => removeMenu(current, id));
        if (record?.imageId) void imageStore.remove(record.imageId);
        if (record?.scanImageId) void imageStore.remove(record.scanImageId);
      },
    }),
    [menus, startMenuScan, read],
  );

  return <MenuContext value={value}>{children}</MenuContext>;
}

export function useMenus(): MenuContextValue {
  const value = use(MenuContext);
  if (!value) throw new Error('useMenus must be used inside <MenuProvider>');
  return value;
}
