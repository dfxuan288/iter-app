import type { Category } from '@/domain/types';

/**
 * Rules behind the safe-to-spend number. Change them here, then run `npm test`:
 * the tests will show whether the demo figures still add up.
 *
 * Safe to spend per day = (trip budget − reserve − spent so far) ÷ days left. Every category is
 * everyday spending; nothing is held back (team decision, 15 Oct 2026).
 */
export const budgetRules = {
  /**
   * "Spending fast" shows when today goes over today's amount, or when the days after today would
   * get less than this share of the planned daily amount (team review, 20 Oct 2026).
   */
  spendingFastThreshold: 0.7,

  /**
   * "Running short" shows when the days after today would get less than this share of the planned
   * daily amount (team review, 20 Oct 2026). Using the reserve is always "running short".
   */
  runningShortThreshold: 0.4,

  /** Suggested split of the budget (after the reserve) when planning a trip. Adds up to 100. */
  suggestedSplitPercent: {
    food: 40,
    transport: 15,
    activities: 20,
    shopping: 25,
  } satisfies Record<Category, number>,

  /** Suggested reserve, as a share of the total budget. */
  suggestedReservePercent: 7,
} as const;
