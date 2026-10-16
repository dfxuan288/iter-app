import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { AppText, type AppTextProps } from '@/components/ui/AppText';
import { formatMoney } from '@/domain/money';

const DURATION_MS = 450;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * A Ringgit amount that counts to its new value when it changes, e.g. after a receipt is saved
 * (brief §10: "numbers easing after each confirmed scan"). It does not count up when first shown,
 * only on changes. With reduced motion on, the new value simply appears.
 */
export function useCountTo(target: number): number {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(target);
  const from = useRef(target);

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
      const t = Math.min(1, (now - began) / DURATION_MS);
      setShown(Math.round(start + (target - start) * easeOut(t)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, reduceMotion]);

  return shown;
}

export interface AnimatedMoneyProps extends Omit<AppTextProps, 'children'> {
  /** Sen. */
  sen: number;
  /** Text around the number, e.g. (amount) => `Up to ${amount}`. */
  template?: (amount: string) => string;
  trimZeros?: boolean;
}

/** Screen readers hear the final amount straight away, not every step of the count. */
export function AnimatedMoney({ sen, template = (amount) => amount, trimZeros = true, ...text }: AnimatedMoneyProps) {
  const shown = useCountTo(sen);
  return (
    <AppText {...text} aria-label={template(formatMoney(sen, 'MYR', { trimZeros }))}>
      {template(formatMoney(shown, 'MYR', { trimZeros }))}
    </AppText>
  );
}
