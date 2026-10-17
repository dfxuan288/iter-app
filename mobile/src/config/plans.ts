/**
 * Plans and prices (team decision, 17 Oct 2026; see docs/DECISIONS.md). This is the only file to
 * edit when prices or limits change: no screen hard-codes a price. Prices are in sen.
 * Purchases are simulated in the prototype: no real money moves.
 *
 * How it works: travellers pay only for the days they travel.
 * - Free trial: everything for the first 3 days of their first trip, up to 10 scans a day.
 * - Passes (Day Pass, 7-Day Pass): everything, unlimited scans, for that many days in a row.
 *   A pass starts by itself on the next trip day not already covered; extra passes wait as
 *   "saved for later" and expire 12 months after purchase if never started.
 * - Free version (no trial or pass covers today, during a trip): Community, planning trips and
 *   the person's own records (typing in expenses, the expense list, spent and remaining).
 * Before a trip starts, everything is open, so people can plan.
 */

export type PassKind = 'day' | 'week';

export interface PassOffer {
  kind: PassKind;
  name: string;
  /** The small label above the name. */
  label: string;
  priceSen: number;
  /** Days in a row it covers, from the day it starts. */
  days: number;
  blurb: string;
}

export const planConfig = {
  trial: {
    name: 'Free trial',
    label: 'Try ITER',
    days: 3,
    scansPerDay: 10,
    blurb: 'Try everything on your trip. Up to 10 scans a day.',
  },
  passes: {
    day: {
      kind: 'day',
      name: 'Day Pass',
      label: 'For short trips',
      priceSen: 290,
      days: 1,
      blurb: 'Good for day trips and weekend trips.',
    },
    week: {
      kind: 'week',
      name: '7-Day Pass',
      label: 'Best value',
      priceSen: 1290,
      days: 7,
      blurb: 'Good for trips of 5 days or more.',
    },
  } satisfies Record<PassKind, PassOffer>,
  /** Order the passes are shown in. */
  passOrder: ['day', 'week'] as const satisfies readonly PassKind[],
  /** Gets the "Best value" highlight. */
  bestValue: 'week' as PassKind,
  /** A pass never started expires this many months after it was bought. */
  unusedPassExpiryMonths: 12,
  /** What the trial and every pass include. */
  includes: [
    'Safe to spend per day for the rest of your trip',
    'Spending warnings before you run short',
    'AI receipt and menu scanning',
    'Tax refund check and tracker',
    'Live currency rates and converter',
    'Community: see what other travellers spent',
  ],
  freeVersion: 'No pass? Community and your own records stay free.',
} as const;

export function passOffer(kind: PassKind): PassOffer {
  return planConfig.passes[kind];
}
