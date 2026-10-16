import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Lottie } from '@/components/ui/Lottie';
import { colors, radius, shadow, spacing } from '@/theme/tokens';

const SHOW_MS = 2000;
const savedTick = require('@/assets/lottie/saved.json');

interface SavedToast {
  /** Shows a short confirmation at the top of the screen, e.g. "Receipt saved". */
  showSaved: (message: string) => void;
}

const SavedToastContext = createContext<SavedToast>({ showSaved: () => undefined });

/**
 * A small "Saved" message with a tick that draws itself, shown for two seconds after something is
 * saved. It sits over whichever screen the app returns to, so the save is confirmed where the
 * person lands. Screen readers announce the message.
 */
export function SavedToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSaved = useCallback((message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message });
    timer.current = setTimeout(() => setToast(null), SHOW_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(() => ({ showSaved }), [showSaved]);

  return (
    <SavedToastContext.Provider value={value}>
      {children}
      <View style={[styles.layer, { top: insets.top + spacing.md }]} pointerEvents="none">
        {toast ? (
          <Animated.View key={toast.id} entering={arrive} exiting={leave} style={styles.toast} role="alert" aria-live="polite">
            <Lottie source={savedTick} size={36} />
            <AppText variant="bodyStrong">{toast.message}</AppText>
          </Animated.View>
        ) : null}
      </View>
    </SavedToastContext.Provider>
  );
}

export const useSavedToast = () => useContext(SavedToastContext);

const arrive = FadeInUp.springify().damping(18).stiffness(240).reduceMotion(ReduceMotion.System);
const leave = FadeOutUp.duration(200).reduceMotion(ReduceMotion.System);

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.raised,
  },
});
