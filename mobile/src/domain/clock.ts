import { addDays, isIsoDate, isoDateFromLocal, type IsoDate } from '@/domain/dates';

/**
 * What "today" is inside ITER. The demo runs on a chosen date (15 Nov 2026 by default, day 7 of
 * the Tokyo trip), which a presenter can move a day at a time to show the next day rebalancing.
 * "Real" follows the phone's own calendar, for trips planned with real dates.
 */
export type AppClock = { mode: 'demo'; date: IsoDate } | { mode: 'real' };

export function todayFor(clock: AppClock, now: Date): IsoDate {
  return clock.mode === 'demo' ? clock.date : isoDateFromLocal(now);
}

/** Moves the demo date by `days`. From the real date, it starts at today's real date. */
export function shiftDay(clock: AppClock, days: number, now: Date): AppClock {
  return { mode: 'demo', date: addDays(todayFor(clock, now), days) };
}

/** A saved clock, checked before it is trusted. Anything unusable falls back to `fallback`. */
export function readClock(value: unknown, fallback: AppClock): AppClock {
  if (typeof value !== 'object' || value === null) return fallback;
  const v = value as Record<string, unknown>;
  if (v.mode === 'real') return { mode: 'real' };
  if (v.mode === 'demo' && typeof v.date === 'string' && isIsoDate(v.date)) return { mode: 'demo', date: v.date };
  return fallback;
}
