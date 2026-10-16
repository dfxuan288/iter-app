import LottieView from 'lottie-react-native';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { LottieProps } from './lottieTypes';

export type { LottieProps } from './lottieTypes';

/** A Lottie animation (phone apps). The web version is in Lottie.web.tsx. */
export function Lottie({ source, size, height = size, loop = false, label, onFinish, style }: LottieProps) {
  const reduceMotion = useReducedMotion();
  return (
    <View
      style={[{ width: size, height }, style]}
      accessible={label !== undefined}
      accessibilityLabel={label}
      importantForAccessibility={label === undefined ? 'no-hide-descendants' : 'yes'}>
      <LottieView
        source={source}
        autoPlay={!reduceMotion}
        loop={loop && !reduceMotion}
        // With reduced motion the finished picture shows straight away, with no movement.
        progress={reduceMotion ? 1 : undefined}
        onAnimationFinish={(cancelled) => {
          if (!cancelled) onFinish?.();
        }}
        style={{ width: size, height }}
      />
    </View>
  );
}
