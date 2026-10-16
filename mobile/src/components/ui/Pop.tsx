import { useEffect, useRef, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

export interface PopProps {
  /** Pops each time this turns on, e.g. when a post is liked. Not when first shown. */
  on: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** A quick swell and settle, as a small reward for an action. Off when the phone is set to reduce motion. */
export function Pop({ on, children, style }: PopProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const was = useRef(on);

  useEffect(() => {
    const before = was.current;
    was.current = on;
    if (reduceMotion || !on || before) return;
    scale.set(withSequence(withTiming(1.3, { duration: 110 }), withSpring(1, { damping: 11, stiffness: 320 })));
  }, [on, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
