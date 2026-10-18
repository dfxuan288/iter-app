import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { builtinRates, fxService, type RatesSnapshot } from '@/services/fxService';
import { useAppData } from '@/state/AppDataProvider';

export interface FxContextValue {
  rates: RatesSnapshot;
  /** True while a fresh copy is being fetched. */
  refreshing: boolean;
  refresh: () => Promise<void>;
}

const FxContext = createContext<FxContextValue | null>(null);

/** Keeps the current exchange rates available to every screen. */
export function FxProvider({ children }: { children: ReactNode }) {
  // A trip to a country outside the featured list needs its own currency's rate as well.
  const extra = useAppData().trip?.localCurrency;
  const [rates, setRates] = useState<RatesSnapshot>(builtinRates);
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    let active = true;
    // Show what the phone already has straight away, then replace it with today's rates.
    void fxService
      .loadSavedRates()
      .then((saved) => {
        if (active) setRates((current) => (current.origin === 'live' ? current : saved));
        return fxService.refreshRates({ extra });
      })
      .then((latest) => {
        if (!active) return;
        setRates(latest);
        setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [extra]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRates(await fxService.refreshRates({ extra }));
    setRefreshing(false);
  }, [extra]);

  const value = useMemo(() => ({ rates, refreshing, refresh }), [rates, refreshing, refresh]);
  return <FxContext value={value}>{children}</FxContext>;
}

export function useFx(): FxContextValue {
  const value = use(FxContext);
  if (!value) throw new Error('useFx must be used inside <FxProvider>');
  return value;
}
