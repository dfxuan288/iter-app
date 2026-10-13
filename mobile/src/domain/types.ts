import type { IsoDate } from '@/domain/dates';
import type { CurrencyCode } from '@/domain/money';

/** Shapes of the data ITER stores (brief §8). Amounts are integers in minor units. */

export const CATEGORIES = ['food', 'transport', 'stay', 'activities', 'shopping'] as const;
export type Category = (typeof CATEGORIES)[number];

export const categoryLabels: Record<Category, string> = {
  food: 'Food',
  transport: 'Transport',
  stay: 'Stay',
  activities: 'Activities',
  shopping: 'Shopping',
};

export type PlanTier = 'free' | 'trip_pass' | 'premium';

export interface User {
  id: string;
  displayName: string;
  email: string;
  homeCurrency: 'MYR';
  planTier: PlanTier;
  createdAt: string;
}

export type TripStatus = 'active' | 'completed';

export interface Trip {
  id: string;
  userId: string;
  /** Key into the destinations config. */
  destinationId: string;
  city: string;
  country: string;
  localCurrency: CurrencyCode;
  startDate: IsoDate;
  endDate: IsoDate;
  /** Sen. */
  totalBudgetMyr: number;
  /** Sen. Money set aside and never counted as spendable. */
  reserveMyr: number;
  status: TripStatus;
  createdAt: string;
}

export interface CategoryBudget {
  tripId: string;
  category: Category;
  /** Sen. */
  plannedMyr: number;
}

export type ExpenseSource = 'scan' | 'manual' | 'menu';

export interface Expense {
  id: string;
  tripId: string;
  createdAt: string;
  note: string;
  /** In the minor unit of `currency`. */
  amountOriginal: number;
  currency: CurrencyCode;
  /** Foreign units per 1 MYR at the time of purchase. Saved so past entries never change. */
  rateUsed: number;
  rateDate: IsoDate;
  /** Sen. */
  amountMyr: number;
  category: Category;
  source: ExpenseSource;
  merchantName: string;
  purchaseDate: IsoDate;
}

/** Everything saved on the phone. `version` lets later releases upgrade older saved data. */
export interface AppData {
  version: 1;
  user: User;
  trips: Trip[];
  categoryBudgets: CategoryBudget[];
  expenses: Expense[];
  activeTripId: string | null;
}
