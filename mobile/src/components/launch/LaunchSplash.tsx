import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeOut, ReduceMotion, useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { colors } from '@/theme/tokens';

/**
 * Launch screen for the phone apps: the ITER wordmark on navy, fading into the app. The full
 * animation (the city photo inside the ITER mark, the dive and the count) is in LaunchSplash.web.tsx,
 * the version ITER ships today; it needs CSS masks, which phone apps would get from a masking library.
 */
export function LaunchSplash({ onDone }: { onDone: () => void; canLand?: () => boolean }) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const timer = setTimeout(onDone, reduceMotion ? 0 : 900);
    return () => clearTimeout(timer);
  }, [onDone, reduceMotion]);
  return (
    <Animated.View style={styles.root} exiting={FadeOut.duration(300).reduceMotion(ReduceMotion.System)} pointerEvents="none">
      <AppText variant="title" color="inverse" style={styles.word}>
        ITER
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 50, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  word: { letterSpacing: 8 },
});
