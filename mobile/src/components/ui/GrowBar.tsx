import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated';

const GROW_MS = 380;
const STAGGER_MS = 30;

/** A chart bar that grows up from the baseline when the chart first appears, one bar after another. */
export function GrowBar({ index, style }: { index: number; style: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const grown = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      grown.set(1);
      return;
    }
    grown.set(withDelay(index * STAGGER_MS, withTiming(1, { duration: GROW_MS, easing: Easing.out(Easing.cubic) })));
  }, [grown, index, reduceMotion]);

  // Scaling (not changing the height) keeps the animation smooth; it grows from the bottom edge.
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: grown.get() }] }));
  return <Animated.View style={[style, { transformOrigin: 'bottom' }, animatedStyle]} />;
}
