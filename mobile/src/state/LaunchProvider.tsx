import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';

import { LaunchSplash } from '@/components/launch/LaunchSplash';

interface Launch {
  /** Plays the launch animation again (Me tab, for presentations). */
  replay: () => void;
}

const LaunchContext = createContext<Launch>({ replay: () => undefined });

/** Plays the launch animation over the app once when it opens, and again on request. */
export function LaunchProvider({ children }: { children: ReactNode }) {
  // A new number mounts a fresh animation; null means none is showing.
  const [playing, setPlaying] = useState<number | null>(1);
  const replay = useCallback(() => setPlaying(Date.now()), []);
  const value = useMemo(() => ({ replay }), [replay]);
  return (
    <LaunchContext value={value}>
      {children}
      {playing !== null ? <LaunchSplash key={playing} onDone={() => setPlaying(null)} /> : null}
    </LaunchContext>
  );
}

export const useLaunch = () => use(LaunchContext);
