import { isoDateFromLocal, type IsoDate } from '@/domain/dates';

/**
 * The demo clock. The prototype pretends today is a fixed date in the middle of Amanda's Tokyo
 * trip, so the demo always opens on "day 7 of 10" and Japan's November 2026 tax-refund rules
 * apply (docs/DECISIONS.md). Set DEMO_TODAY to null to use the phone's real date instead.
 */
export const DEMO_TODAY: IsoDate | null = '2026-11-15';

/** Exchange rates used for the seeded expenses: foreign units per 1 MYR on 8 Oct 2026 (brief §9.7). */
export const SEED_RATE_DATE: IsoDate = '2026-10-08';
export const seedRatesPerMyr = {
  JPY: 38.725,
  THB: 8.2354,
  SGD: 0.31301,
  IDR: 4375.35,
  VND: 6351,
  USD: 0.24474,
  EUR: 0.21792,
  KRW: 292.4,
} as const;

export function today(): IsoDate {
  return DEMO_TODAY ?? isoDateFromLocal(new Date());
}
