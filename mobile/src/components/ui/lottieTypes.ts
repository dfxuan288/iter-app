import type { AnimationObject } from 'lottie-react-native';
import type { StyleProp, ViewStyle } from 'react-native';

/** Lottie animation data, e.g. `require('@/assets/lottie/saved.json')`. */
export type LottieSource = AnimationObject;

export interface LottieProps {
  source: LottieSource;
  /** Width, in points. Also the height unless `height` is given. */
  size: number;
  height?: number;
  /** Repeat for ever (empty-state pictures) or play once (a tick after saving). */
  loop?: boolean;
  /** What a screen reader says. Leave out for decoration, which screen readers then skip. */
  label?: string;
  /** Called when a one-off animation ends. */
  onFinish?: () => void;
  style?: StyleProp<ViewStyle>;
}
