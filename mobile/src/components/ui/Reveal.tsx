import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

export interface RevealProps {
  children: ReactNode;
  /** Position in the sequence: 0 arrives first, 1 just after, and so on. */
  index?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Brings a section in with a short rise and fade. Sections arrive in reading order, which
 * guides the eye from the main number down the page. Switched off when the phone is set
 * to reduce motion.
 */
export function Reveal({ children, index = 0, style }: RevealProps) {
  return (
    <Animated.View
      style={style}
      entering={FadeInDown.duration(motion.enterMs)
        .delay(index * motion.staggerMs)
        .reduceMotion(ReduceMotion.System)}>
      {children}
    </Animated.View>
  );
}
