import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { AppText, type AppTextProps } from '@/components/ui/AppText';
import { formatMoney } from '@/domain/money';

const DURATION_MS = 450;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * A Ringgit amount that counts to its new value when it changes, e.g. after a receipt is saved
 * (brief §10: "numbers easing after each confirmed scan"). It does not count up when first shown,
 * only on changes, unless `fromZero` is set (e.g. Trip Wrapped's big numbers). With reduced motion
 * on, the value simply appears.
 */
export function useCountTo(target: number, fromZero = false): number {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(fromZero && !reduceMotion ? 0 : target);
  const from = useRef(fromZero ? 0 : target);
  // A first count-up from zero is a reveal, so it takes a little longer than an update.
  const duration = fromZero ? 1100 : DURATION_MS;

  useEffect(() => {
    const start = from.current;
    from.current = target;
    if (reduceMotion || start === target) {
      setShown(target);
      return;
    }
    let frame = 0;
    const began = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / duration);
      setShown(Math.round(start + (target - start) * easeOut(t)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, reduceMotion, duration]);

  return shown;
}

export interface AnimatedMoneyProps extends Omit<AppTextProps, 'children'> {
  /** Sen. */
  sen: number;
  /** Text around the number, e.g. (amount) => `Up to ${amount}`. */
  template?: (amount: string) => string;
  trimZeros?: boolean;
  /** Count up from zero when first shown. */
  fromZero?: boolean;
}

/** Screen readers hear the final amount straight away, not every step of the count. */
export function AnimatedMoney({ sen, template = (amount) => amount, trimZeros = true, fromZero = false, ...text }: AnimatedMoneyProps) {
  const shown = useCountTo(sen, fromZero);
  return (
    <AppText {...text} aria-label={template(formatMoney(sen, 'MYR', { trimZeros }))}>
      {template(formatMoney(shown, 'MYR', { trimZeros }))}
    </AppText>
  );
}
