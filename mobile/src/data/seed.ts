import { SEED_RATE_DATE, seedRatesPerMyr } from '@/config/demo';
import type { IsoDate } from '@/domain/dates';
import { convertToMyr, toMinor } from '@/domain/money';
import type { AppData, Category, CategoryBudget, Expense, ExpenseSource, Trip, User } from '@/domain/types';

/**
 * The demo account: Amanda T. on day 7 of a 10-day Tokyo trip (brief §11, docs/DECISIONS.md).
 * Everything shown in the app is calculated from these expenses, and a test checks that they
 * reconcile: RM 2,700 spent, RM 1,500 remaining, RM 200 a day safe to spend.
 */

export const DEMO_USER_ID = 'user-amanda';
export const DEMO_TRIP_ID = 'trip-tokyo-2026';

const user: User = {
  id: DEMO_USER_ID,
  displayName: 'Amanda T.',
  email: 'amanda@example.com',
  homeCurrency: 'MYR',
  planTier: 'trip_pass',
  createdAt: '2026-10-20T09:00:00.000Z',
};

const trip: Trip = {
  id: DEMO_TRIP_ID,
  userId: DEMO_USER_ID,
  destinationId: 'tokyo',
  city: 'Tokyo',
  country: 'Japan',
  localCurrency: 'JPY',
  startDate: '2026-11-09',
  endDate: '2026-11-18',
  totalBudgetMyr: toMinor(4200, 'MYR'),
  reserveMyr: toMinor(300, 'MYR'),
  status: 'active',
  createdAt: '2026-10-28T12:00:00.000Z',
};

const plannedRinggit: Record<Category, number> = {
  food: 900,
  transport: 440,
  stay: 1470,
  activities: 400,
  shopping: 690,
};

const categoryBudgets: CategoryBudget[] = (Object.keys(plannedRinggit) as Category[]).map((category) => ({
  tripId: DEMO_TRIP_ID,
  category,
  plannedMyr: toMinor(plannedRinggit[category], 'MYR'),
}));

type SeedRow = [date: IsoDate, merchant: string, note: string, category: Category, source: ExpenseSource, amount: number, currency: 'JPY' | 'MYR'];

// Yen amounts are whole yen. Ringgit rows are online bookings paid from home, in ringgit.
// The demo opens on the morning of day 7: only the metro ticket (transport, within plan) is dated
// today, so today's allowance shows in full (RM 200 left of RM 200) until something is scanned.
const rows: SeedRow[] = [
  ['2026-11-09', 'Agoda', 'Hotel, first 6 nights', 'stay', 'manual', 705.6, 'MYR'],
  ['2026-11-09', 'Klook', 'Narita Express ticket', 'transport', 'manual', 89.19, 'MYR'],
  ['2026-11-09', 'JR East', 'Suica top-up', 'transport', 'manual', 3000, 'JPY'],
  ['2026-11-09', 'Matsuya Shinjuku', 'Beef bowl set', 'food', 'manual', 980, 'JPY'],
  ['2026-11-10', 'Agoda', 'Hotel, nights 7 and 8', 'stay', 'manual', 470.4, 'MYR'],
  ['2026-11-10', '7-Eleven Shinjuku', 'Breakfast and drinks', 'food', 'scan', 620, 'JPY'],
  ['2026-11-10', 'Shibuya Sky', 'Observation deck', 'activities', 'manual', 2100, 'JPY'],
  ['2026-11-10', 'Uobei Shibuya', 'Conveyor sushi', 'food', 'manual', 1450, 'JPY'],
  ['2026-11-11', 'JR East', 'Suica top-up', 'transport', 'manual', 2000, 'JPY'],
  ['2026-11-11', 'Tsukiji Outer Market', 'Street food', 'food', 'manual', 2300, 'JPY'],
  ['2026-11-11', 'Senso-ji', 'Fortune and charm', 'activities', 'manual', 1000, 'JPY'],
  ['2026-11-11', 'FamilyMart Asakusa', 'Snacks', 'food', 'scan', 540, 'JPY'],
  ['2026-11-12', 'Bic Camera Shinjuku', 'Electronics', 'shopping', 'scan', 16280, 'JPY'],
  ['2026-11-12', 'CoCo Ichibanya', 'Curry rice', 'food', 'manual', 880, 'JPY'],
  ['2026-11-12', 'Klook', 'teamLab Planets ticket', 'activities', 'manual', 61.22, 'MYR'],
  ['2026-11-13', 'JR East', 'Suica top-up', 'transport', 'manual', 3000, 'JPY'],
  ['2026-11-13', 'Afuri Harajuku', 'Yuzu ramen', 'food', 'manual', 1100, 'JPY'],
  ['2026-11-13', 'Gyukatsu Motomura', 'Beef cutlet set', 'food', 'manual', 1980, 'JPY'],
  ['2026-11-14', 'UNIQLO Ginza', 'HEATTECH ×2, Ultra Light Down jacket', 'shopping', 'scan', 9570, 'JPY'],
  ['2026-11-14', 'Ichiran Shibuya', 'Tonkotsu ramen, extra noodles', 'food', 'scan', 1690, 'JPY'],
  ['2026-11-14', 'Lawson Ginza', 'Onigiri and coffee', 'food', 'manual', 760, 'JPY'],
  ['2026-11-15', 'Tokyo Metro', '24-hour ticket ×2 and fares', 'transport', 'manual', 1480, 'JPY'],
  ['2026-11-14', 'Don Quijote Shibuya', 'Umaibo snacks, LuLuLun face masks', 'shopping', 'scan', 1212, 'JPY'],
  ['2026-11-14', 'Sushiro Shibuya', 'Lunch', 'food', 'manual', 1250, 'JPY'],
];

const expenses: Expense[] = rows.map(([purchaseDate, merchantName, note, category, source, amount, currency], index) => {
  const amountOriginal = toMinor(amount, currency);
  const rateUsed = currency === 'MYR' ? 1 : seedRatesPerMyr.JPY;
  return {
    id: `expense-seed-${String(index + 1).padStart(2, '0')}`,
    tripId: DEMO_TRIP_ID,
    // Spread through the day so "most recent first" has a stable order.
    createdAt: `${purchaseDate}T${String(9 + (index % 10)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}:00.000Z`,
    note,
    amountOriginal,
    currency,
    rateUsed,
    rateDate: SEED_RATE_DATE,
    amountMyr: convertToMyr(amountOriginal, currency, rateUsed),
    category,
    source,
    merchantName,
    purchaseDate,
  };
});

/** A fresh copy of the demo data, so resetting the demo never shares objects with live state. */
export function createSeedData(): AppData {
  return {
    version: 1,
    user: { ...user },
    trips: [{ ...trip }],
    categoryBudgets: categoryBudgets.map((budget) => ({ ...budget })),
    expenses: expenses.map((expense) => ({ ...expense })),
    activeTripId: DEMO_TRIP_ID,
  };
}
