import { useRef } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESSED_SCALE = 0.95;
const PRESSED_OPACITY = 0.8;
const HOVER_SCALE = 1.015;
/** The press always shows for at least this long, even on the quickest tap. */
const MIN_PRESS_MS = 70;

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
}

/**
 * A tappable surface with clear feedback: it presses in and dims under the finger, then springs back
 * with a little bounce. A quick tap still shows the whole press, so it is obvious the tap landed. On
 * a laptop it lifts slightly under the pointer. With reduced motion on, it only dims.
 */
export function PressableScale({ style, onPressIn, onPressOut, onHoverIn, onHoverOut, disabled, ...rest }: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const dim = useSharedValue(1);
  const hovered = useRef(false);
  const restingScale = () => (hovered.current && !reduceMotion ? HOVER_SCALE : 1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    opacity: disabled ? 0.55 : dim.get(),
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        if (!reduceMotion) scale.set(withTiming(PRESSED_SCALE, { duration: 90 }));
        dim.set(withTiming(PRESSED_OPACITY, { duration: 90 }));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        // Finish the press first (a fast tap may not have reached it), then spring back.
        if (!reduceMotion) scale.set(withSequence(withTiming(PRESSED_SCALE, { duration: MIN_PRESS_MS }), withSpring(restingScale(), motion.releaseSpring)));
        dim.set(withSequence(withTiming(PRESSED_OPACITY, { duration: MIN_PRESS_MS }), withTiming(1, { duration: 220 })));
        onPressOut?.(event);
      }}
      onHoverIn={(event) => {
        hovered.current = true;
        if (!reduceMotion && !disabled) scale.set(withSpring(HOVER_SCALE, motion.pressSpring));
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        hovered.current = false;
        if (!reduceMotion) scale.set(withSpring(1, motion.pressSpring));
        onHoverOut?.(event);
      }}
      style={[style, animatedStyle]}
    />
  );
}
