import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
}

/** A tappable surface that presses in slightly under the finger, as feedback that the tap landed. */
export function PressableScale({ style, onPressIn, onPressOut, disabled, ...rest }: PressableScaleProps) {
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.get() ? 0.97 : 1, motion.pressSpring) }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        pressed.set(1);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.set(0);
        onPressOut?.(event);
      }}
      style={[style, animatedStyle, disabled ? { opacity: 0.55 } : null]}
    />
  );
}
