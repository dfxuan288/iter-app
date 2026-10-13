import type { Category } from '@/domain/types';

/**
 * Rules behind the safe-to-spend number. Change them here, then run `npm test`:
 * the tests will show whether the demo figures still add up.
 */
export const budgetRules = {
  /**
   * Categories treated as essentials. Whatever is still unspent in these is held back from
   * safe-to-spend, because it is already committed (brief §13 Q4).
   */
  essentialCategories: ['stay', 'transport'] as readonly Category[],

  /**
   * "Spending fast" shows when safe-to-spend drops below this share of the daily allowance the
   * trip started with (brief §13 Q5; renamed from "Ahead of plan", see docs/DECISIONS.md).
   */
  spendingFastThreshold: 0.7,

  /** Suggested split of the budget (after the reserve) when planning a trip. Adds up to 100. */
  suggestedSplitPercent: {
    food: 25,
    transport: 10,
    stay: 40,
    activities: 10,
    shopping: 15,
  } satisfies Record<Category, number>,

  /** Suggested reserve, as a share of the total budget. */
  suggestedReservePercent: 7,
} as const;
