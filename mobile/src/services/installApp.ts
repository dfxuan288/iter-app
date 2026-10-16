import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/**
 * "Download ITER": putting the web app on the phone's home screen, so it opens full screen like
 * an app. Android browsers offer an install prompt the app can show from its own button; iPhones
 * do not, so the app explains the two taps instead (Share, then Add to Home Screen).
 */

export type InstallWay =
  /** Already opened from the home screen. */
  | 'installed'
  /** The browser has an install prompt ready (Chrome, Edge, Samsung Internet). */
  | 'prompt'
  /** iPhone or iPad: Share, then Add to Home Screen. */
  | 'ios'
  /** Another browser or a laptop: use the browser's own menu. */
  | 'manual'
  /** Not a web browser (the native app). */
  | 'none';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
let deferred: InstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

// Listen from the moment the app loads: the browser offers the prompt once, early, and it would be missed otherwise.
if (isWeb) {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    justInstalled = true;
    notify();
  });
}

export function installWay(): InstallWay {
  if (!isWeb) return 'none';
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches === true || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone || justInstalled) return 'installed';
  if (deferred) return 'prompt';
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return iOS ? 'ios' : 'manual';
}

/** Shows the browser's install prompt. Returns true if the user accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  notify();
  try {
    await event.prompt();
    return (await event.userChoice).outcome === 'accepted';
  } catch {
    return false;
  }
}

/** The current way to install, updating when the browser makes a prompt available or the app is installed. */
export function useInstallWay(): InstallWay {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    installWay,
    () => 'none',
  );
}
