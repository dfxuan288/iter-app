import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { LottieProps } from './lottieTypes';

export type { LottieProps } from './lottieTypes';

/**
 * A Lottie animation (web app). Uses Airbnb's small "light" Lottie player, which ships inside the
 * app, rather than lottie-react-native's web player, which downloads a 1.9 MB engine from another
 * site the first time it plays (slow on roaming data, and it fails offline).
 */
export function Lottie({ source, size, height = size, loop = false, label, onFinish, style }: LottieProps) {
  const reduceMotion = useReducedMotion();
  const box = useRef<View>(null);
  const finish = useRef(onFinish);
  useEffect(() => {
    finish.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    // On the web a View is a <div>: the player draws into it.
    const container = box.current as unknown as HTMLElement | null;
    if (!container) return;
    let player: { destroy: () => void } | null = null;
    let cancelled = false;

    void import('lottie-web/build/player/lottie_light')
      .then(({ default: lottie }) => {
        if (cancelled) return;
        const animation = lottie.loadAnimation({
          container,
          renderer: 'svg',
          loop: loop && !reduceMotion,
          autoplay: !reduceMotion,
          // The player writes into the data it is given, so each copy on screen gets its own.
          animationData: JSON.parse(JSON.stringify(source)),
        });
        // With reduced motion the finished picture shows straight away, with no movement.
        if (reduceMotion) animation.addEventListener('DOMLoaded', () => animation.goToAndStop(animation.totalFrames - 1, true));
        animation.addEventListener('complete', () => finish.current?.());
        player = animation;
      })
      // If the player cannot load, the space simply stays empty: never a crash.
      .catch((error: unknown) => {
        if (__DEV__) console.warn('Lottie could not play', error);
      });

    return () => {
      cancelled = true;
      player?.destroy();
    };
  }, [source, loop, reduceMotion]);

  return (
    <View
      ref={box}
      style={[{ width: size, height }, style]}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
