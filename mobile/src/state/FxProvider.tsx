import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { builtinRates, fxService, type RatesSnapshot } from '@/services/fxService';

export interface FxContextValue {
  rates: RatesSnapshot;
  /** True while a fresh copy is being fetched. */
  refreshing: boolean;
  refresh: () => Promise<void>;
}

const FxContext = createContext<FxContextValue | null>(null);

/** Keeps the current exchange rates available to every screen. */
export function FxProvider({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<RatesSnapshot>(builtinRates);
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    let active = true;
    // Show what the phone already has straight away, then replace it with today's rates.
    void fxService
      .loadSavedRates()
      .then((saved) => {
        if (active) setRates((current) => (current.origin === 'live' ? current : saved));
        return fxService.refreshRates();
      })
      .then((latest) => {
        if (!active) return;
        setRates(latest);
        setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRates(await fxService.refreshRates());
    setRefreshing(false);
  }, []);

  const value = useMemo(() => ({ rates, refreshing, refresh }), [rates, refreshing, refresh]);
  return <FxContext value={value}>{children}</FxContext>;
}

export function useFx(): FxContextValue {
  const value = use(FxContext);
  if (!value) throw new Error('useFx must be used inside <FxProvider>');
  return value;
}
