import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { LaunchSplash } from '@/components/launch/LaunchSplash';
import { Welcome } from '@/components/welcome/Welcome';

const WELCOME_DONE_KEY = 'iter.welcome.done';

interface Launch {
  /** Plays the launch animation again (Me tab, for presentations). */
  replay: () => void;
  /** Shows the welcome screens again (Me tab). */
  showWelcome: () => void;
}

const LaunchContext = createContext<Launch>({ replay: () => undefined, showWelcome: () => undefined });

/**
 * What the app shows over itself when it opens: the launch animation every time, and the welcome
 * screens the first time (remembered on this phone). Both can be replayed from the Me tab.
 */
export function LaunchProvider({ children }: { children: ReactNode }) {
  // A new number mounts a fresh animation; null means none is showing.
  const [playing, setPlaying] = useState<number | null>(1);
  // 'checking' until the phone says whether the welcome screens were seen.
  const [welcome, setWelcome] = useState<'checking' | 'show' | 'done'>('checking');
  const welcomeRef = useRef(welcome);
  useEffect(() => {
    welcomeRef.current = welcome;
  }, [welcome]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(WELCOME_DONE_KEY)
      .then((value) => active && setWelcome(value === 'yes' ? 'done' : 'show'))
      .catch(() => active && setWelcome('done'));
    return () => {
      active = false;
    };
  }, []);

  const finishWelcome = useCallback(() => {
    setWelcome('done');
    void AsyncStorage.setItem(WELCOME_DONE_KEY, 'yes').catch(() => undefined);
  }, []);
  const replay = useCallback(() => setPlaying(Date.now()), []);
  const showWelcome = useCallback(() => setWelcome('show'), []);
  // The launch photo lands on Home's card only when Home is what comes next, not the welcome screens.
  const canLand = useCallback(() => welcomeRef.current === 'done', []);
  const value = useMemo(() => ({ replay, showWelcome }), [replay, showWelcome]);

  return (
    <LaunchContext value={value}>
      {children}
      {welcome === 'show' ? <Welcome onDone={finishWelcome} /> : null}
      {playing !== null ? <LaunchSplash key={playing} onDone={() => setPlaying(null)} canLand={canLand} /> : null}
    </LaunchContext>
  );
}

export const useLaunch = () => use(LaunchContext);
