import { SEED_RATE_DATE, seedRatesPerMyr } from '@/config/demo';
import type { IsoDate } from '@/domain/dates';
import { convertToMyr, toMinor } from '@/domain/money';
import type { AppData, Category, CategoryBudget, Expense, ExpenseSource, ReceiptDetails, Trip, User } from '@/domain/types';

/**
 * The demo account: Amanda T. on day 7 of a 10-day Tokyo trip (brief §11, docs/DECISIONS.md).
 * Everything shown in the app is calculated from these expenses, and a test checks that they
 * reconcile: RM 1,450 spent, RM 1,100 remaining, RM 200 a day safe to spend:
 * (RM 2,550 budget − RM 300 reserve − RM 1,450 spent) ÷ 4 days left = RM 200.
 * The budget covers everyday spending only: hotels and flights are not tracked (15 Oct 2026).
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
  totalBudgetMyr: toMinor(2550, 'MYR'),
  reserveMyr: toMinor(300, 'MYR'),
  status: 'active',
  createdAt: '2026-10-28T12:00:00.000Z',
};

/** Adds up to the budget minus the reserve (RM 2,250). */
const plannedRinggit: Record<Category, number> = {
  food: 700,
  transport: 350,
  activities: 400,
  shopping: 800,
};

const categoryBudgets: CategoryBudget[] = (Object.keys(plannedRinggit) as Category[]).map((category) => ({
  tripId: DEMO_TRIP_ID,
  category,
  plannedMyr: toMinor(plannedRinggit[category], 'MYR'),
}));

type SeedRow = [date: IsoDate, merchant: string, note: string, category: Category, source: ExpenseSource, amount: number, currency: 'JPY' | 'MYR'];

// Yen amounts are whole yen. The Ringgit row is a ticket booked from home, in ringgit.
// The demo opens on the morning of day 7 with nothing spent yet today, so today's RM 200 shows in
// full until something is scanned.
const rows: SeedRow[] = [
  ['2026-11-09', 'JR East', 'Suica top-up', 'transport', 'manual', 3000, 'JPY'],
  ['2026-11-09', 'Matsuya Shinjuku', 'Beef bowl set', 'food', 'manual', 980, 'JPY'],
  ['2026-11-10', '7-Eleven Shinjuku', 'Breakfast and drinks', 'food', 'scan', 620, 'JPY'],
  ['2026-11-10', 'Shibuya Sky', 'Observation deck', 'activities', 'manual', 2100, 'JPY'],
  ['2026-11-10', 'Uobei Shibuya', 'Conveyor sushi', 'food', 'manual', 1450, 'JPY'],
  ['2026-11-11', 'JR East', 'Suica top-up', 'transport', 'manual', 2000, 'JPY'],
  ['2026-11-11', 'Tsukiji Outer Market', 'Street food', 'food', 'manual', 2300, 'JPY'],
  ['2026-11-11', 'Senso-ji', 'Fortune and charm', 'activities', 'manual', 1000, 'JPY'],
  ['2026-11-11', 'FamilyMart Asakusa', 'Snacks', 'food', 'scan', 540, 'JPY'],
  ['2026-11-12', 'Bic Camera Shinjuku', 'Electronics', 'shopping', 'scan', 16280, 'JPY'],
  ['2026-11-12', 'CoCo Ichibanya', 'Curry rice', 'food', 'manual', 880, 'JPY'],
  ['2026-11-12', 'Klook', 'teamLab Planets ticket', 'activities', 'manual', 76.41, 'MYR'],
  ['2026-11-13', 'JR East', 'Suica top-up', 'transport', 'manual', 3000, 'JPY'],
  ['2026-11-13', 'Afuri Harajuku', 'Yuzu ramen', 'food', 'manual', 1100, 'JPY'],
  ['2026-11-13', 'Gyukatsu Motomura', 'Beef cutlet set', 'food', 'manual', 1980, 'JPY'],
  ['2026-11-14', 'UNIQLO Ginza', 'HEATTECH ×2, Ultra Light Down jacket', 'shopping', 'scan', 9570, 'JPY'],
  ['2026-11-14', 'Ichiran Shibuya', 'Tonkotsu ramen, extra noodles', 'food', 'scan', 1690, 'JPY'],
  ['2026-11-14', 'Lawson Ginza', 'Onigiri and coffee', 'food', 'manual', 760, 'JPY'],
  ['2026-11-14', 'Tokyo Metro', '24-hour ticket ×2 and fares', 'transport', 'manual', 1480, 'JPY'],
  ['2026-11-14', 'Don Quijote Shibuya', 'Umaibo snacks, LuLuLun face masks', 'shopping', 'scan', 1212, 'JPY'],
  ['2026-11-14', 'Sushiro Shibuya', 'Lunch', 'food', 'manual', 1250, 'JPY'],
];

/**
 * What the four scanned receipts showed (brief §11 tax refund demo). Two are refundable:
 * UNIQLO (¥869 tax) and Bic Camera (¥1,480 tax), up to about RM 60.66 at the seed rate.
 * Ichiran is a restaurant meal; Don Quijote is under the ¥5,000 minimum.
 */
const receipt = (fields: Pick<ReceiptDetails, 'merchantNameOriginal' | 'items' | 'subtotal' | 'taxLines' | 'total' | 'taxIncluded' | 'taxFreeShop'>): ReceiptDetails => ({
  imageId: null,
  currency: 'JPY',
  serviceCharge: null,
  language: 'ja',
  confidence: 0.95,
  readBy: 'ai',
  modelUsed: 'claude-haiku-5-5',
  ...fields,
});

const scannedReceipts: Record<string, ReceiptDetails> = {
  'UNIQLO Ginza': receipt({
    merchantNameOriginal: 'ユニクロ 銀座店',
    items: [
      { name: 'HEATTECH crew neck T-shirt', nameOriginal: 'ヒートテッククルーネックT', quantity: 2, lineTotal: 2580 },
      { name: 'Ultra Light Down jacket', nameOriginal: 'ウルトラライトダウンジャケット', quantity: 1, lineTotal: 6990 },
    ],
    subtotal: 9570,
    taxLines: [{ ratePercent: 10, amount: 869 }],
    total: 9570,
    taxIncluded: true,
    taxFreeShop: 'yes',
  }),
  'Bic Camera Shinjuku': receipt({
    merchantNameOriginal: 'ビックカメラ 新宿西口店',
    items: [{ name: 'Wireless earbuds', nameOriginal: 'ワイヤレスイヤホン', quantity: 1, lineTotal: 14800 }],
    subtotal: 14800,
    taxLines: [{ ratePercent: 10, amount: 1480 }],
    total: 16280,
    taxIncluded: false,
    taxFreeShop: 'yes',
  }),
  'Ichiran Shibuya': receipt({
    merchantNameOriginal: '一蘭 渋谷店',
    items: [
      { name: 'Classic tonkotsu ramen', nameOriginal: '天然とんこつラーメン', quantity: 1, lineTotal: 1480 },
      { name: 'Extra noodles', nameOriginal: '替玉', quantity: 1, lineTotal: 210 },
    ],
    subtotal: 1690,
    taxLines: [{ ratePercent: 10, amount: 153 }],
    total: 1690,
    taxIncluded: true,
    taxFreeShop: 'no',
  }),
  'Don Quijote Shibuya': receipt({
    merchantNameOriginal: 'ドン・キホーテ 渋谷本店',
    items: [
      { name: 'Umaibo snack assortment', nameOriginal: 'うまい棒 詰め合わせ', quantity: 1, lineTotal: 450 },
      { name: 'LuLuLun face masks, 7-pack', nameOriginal: 'ルルルン フェイスマスク 7枚', quantity: 1, lineTotal: 660 },
    ],
    subtotal: 1110,
    taxLines: [
      { ratePercent: 8, amount: 36 },
      { ratePercent: 10, amount: 66 },
    ],
    total: 1212,
    taxIncluded: false,
    taxFreeShop: 'yes',
  }),
};

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
    ...(scannedReceipts[merchantName] ? { receipt: scannedReceipts[merchantName] } : {}),
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
