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
   * "Spending fast" shows when safe-to-spend drops below this share of the daily allowance the
   * trip started with (brief §13 Q5; renamed from "Ahead of plan", see docs/DECISIONS.md).
   */
  spendingFastThreshold: 0.7,

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
