import type { IsoDate } from '@/domain/dates';
import type { CurrencyCode } from '@/domain/money';
import type { Category } from '@/domain/types';

/**
 * Tourist tax refund rules, one entry per country (brief §9.6). Rules change, so every entry
 * carries where it came from and when it was last checked; the app shows "Estimated · rules
 * verified {date}". To add a country, add an entry here once its rules have been verified.
 * Amounts are in the minor unit of `currency`.
 */
export interface TaxRule {
  country: string;
  currency: CurrencyCode;
  /** Purchases before this date fall under an older system and are not claimed at departure. */
  effectiveFrom: IsoDate;
  effectiveFromNote: string;
  minPurchase: number;
  /** Whether the minimum is counted before or after tax. */
  minPurchaseBasis: 'pre_tax' | 'incl_tax';
  /** The minimum is met by adding up receipts from the same shop on the same day. */
  sameStoreSameDay: boolean;
  /** Goods must leave the country within this many days of purchase. */
  claimWindowDays: number;
  /** Used only when a receipt does not print its tax: the tax is then estimated at this rate. */
  standardRatePercent: number;
  /**
   * PLACEHOLDER. The share of the refund a shop's refund company may keep. Not yet known for
   * Japan's new system, so 0% is used and amounts are shown as "up to" (docs/DECISIONS.md).
   */
  estHandlingFeePct: number;
  /** Categories that are never refundable, with the reason shown to the user. */
  notRefundable: Partial<Record<Category, string>>;
  /** Shown for food from a shop that is not a registered tax-free shop. */
  mealsNote: string;
  refundMethodNote: string;
  /** The rules in plain language, for the tracker screen. */
  rulesInPlainLanguage: string[];
  whatToBring: string[];
  departureChecklist: { id: string; label: string }[];
  sourceName: string;
  sourceUrl: string;
  lastVerified: IsoDate;
}

const japan: TaxRule = {
  country: 'Japan',
  currency: 'JPY',
  effectiveFrom: '2026-11-01',
  effectiveFromNote: 'Before 1 Nov 2026 the tax was taken off at the till, so there is nothing to claim when you leave.',
  minPurchase: 5000,
  minPurchaseBasis: 'pre_tax',
  sameStoreSameDay: true,
  claimWindowDays: 90,
  standardRatePercent: 10,
  estHandlingFeePct: 0,
  notRefundable: {
    transport: 'Transport is not tax-free.',
    activities: 'Tickets and services are not tax-free.',
  },
  mealsNote: 'Meals and drinks at restaurants are not tax-free.',
  refundMethodNote: 'The shop or its refund company pays the refund by card, bank transfer, app or cash. Card refunds can take 1 to 2 weeks, bank transfers 2 to 4 weeks, and a handling fee may be taken.',
  rulesInPlainLanguage: [
    'From 1 Nov 2026 you pay the full price, tax included, and get the tax back when you leave Japan.',
    'Spend at least ¥5,000 before tax in one tax-free shop on one day. Receipts from the same shop that day add up.',
    'Show your passport when you pay, and take the goods out of Japan within 90 days.',
    'Keep everything unused. If one item from a purchase is missing at the airport, the whole purchase loses its refund.',
  ],
  whatToBring: ['Your passport', 'Every item you claim for, unused', 'Your receipts'],
  departureChecklist: [
    { id: 'pack', label: 'Pack the tax-free items in your hand luggage or keep them easy to reach' },
    { id: 'time', label: 'Leave extra time at the airport for the tax-free check' },
    { id: 'kiosk', label: 'Before checking in your bags, scan your passport at a tax-free kiosk' },
    { id: 'customs', label: 'If the kiosk shows red, take the items to the customs counter' },
    { id: 'method', label: 'Check how each shop pays the refund (card, bank, app or cash)' },
  ],
  sourceName: 'National Tax Agency of Japan, English guide to the new tax-free system',
  sourceUrl: 'https://www.nta.go.jp/publication/pamph/shohi/menzei/202506/pdf/0025006-106.pdf',
  lastVerified: '2026-10-15',
};

export const taxRules: readonly TaxRule[] = [japan];

/** The rule for a trip's country and a receipt's currency, if ITER has one. */
export function taxRuleFor(country: string, currency: CurrencyCode): TaxRule | undefined {
  return taxRules.find((rule) => rule.country === country && rule.currency === currency);
}
