import { taxRuleFor, taxRules } from '@/config/taxRules';
import { createSeedData } from '@/data/seed';
import { setRefundState } from '@/services/expenseService';
import { toggleRefundChecklist } from '@/services/tripService';

import { amountForMinimum, checkRefund, receiptTax, shouldRemindToClaim, summarizeRefunds } from '../taxRefund';
import type { Expense, ReceiptDetails, Trip } from '../types';

const data = createSeedData();
const tokyo = data.trips[0] as Trip;
const byShop = (name: string) => data.expenses.find((e) => e.merchantName === name) as Expense;

const receipt = (fields: Partial<ReceiptDetails> = {}): ReceiptDetails => ({
  imageId: null,
  merchantNameOriginal: null,
  currency: 'JPY',
  items: [],
  subtotal: 6670,
  taxLines: [{ ratePercent: 10, amount: 622 }, { ratePercent: 8, amount: 36 }],
  serviceCharge: null,
  total: 7328,
  taxIncluded: false,
  taxFreeShop: 'yes',
  language: 'ja',
  confidence: 1,
  readBy: 'ai',
  modelUsed: null,
  ...fields,
});

const purchase = (fields: Partial<Expense> = {}, receiptFields: Partial<ReceiptDetails> = {}): Expense => ({
  id: 'p1',
  tripId: tokyo.id,
  createdAt: 'now',
  note: '',
  amountOriginal: 7328,
  currency: 'JPY',
  rateUsed: 38.725,
  rateDate: '2026-10-08',
  amountMyr: 18923,
  category: 'shopping',
  source: 'scan',
  merchantName: 'Matsumoto Kiyoshi Ginza',
  purchaseDate: '2026-11-15',
  receipt: receipt(receiptFields),
  ...fields,
});

describe('the rules config', () => {
  it('records a source and the date it was last verified for every country', () => {
    for (const rule of taxRules) {
      expect(rule.sourceUrl).toMatch(/^https:\/\//);
      expect(rule.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('keeps the handling fee at the agreed 0% placeholder, shown as "up to"', () => {
    expect(taxRuleFor('Japan', 'JPY')?.estHandlingFeePct).toBe(0);
  });
});

describe('the brief’s demo receipts', () => {
  it('UNIQLO is refundable: collect up to ¥869', () => {
    const check = checkRefund(byShop('UNIQLO Ginza'), tokyo, data.expenses);
    expect(check).toMatchObject({ eligibility: 'eligible', tax: 869, estRefund: 869, estRefundMyr: 2244 });
  });

  it('Bic Camera is refundable: ¥1,480', () => {
    expect(checkRefund(byShop('Bic Camera Shinjuku'), tokyo, data.expenses)).toMatchObject({ eligibility: 'eligible', tax: 1480, estRefundMyr: 3822 });
  });

  it('Ichiran is a restaurant meal, so not refundable', () => {
    expect(checkRefund(byShop('Ichiran Shibuya'), tokyo, data.expenses)).toMatchObject({ eligibility: 'not_eligible', reason: 'Meals and drinks at restaurants are not tax-free.' });
  });

  it('Don Quijote is under the ¥5,000 minimum', () => {
    const check = checkRefund(byShop('Don Quijote Shibuya'), tokyo, data.expenses);
    expect(check.eligibility).toBe('not_eligible');
    expect(check.reason).toMatch(/below the ¥5,000 minimum before tax/);
  });

  it('adds up to about RM 60.66 to collect, kept apart from the budget', () => {
    const summary = summarizeRefunds(tokyo, data.expenses);
    expect(summary.toCollectMyr).toBe(6066);
    expect(summary.eligible.map((line) => line.expense.merchantName)).toEqual(['UNIQLO Ginza', 'Bic Camera Shinjuku']);
    expect(summary.notEligible).toHaveLength(2);
  });
});

describe('checkRefund', () => {
  it('measures the minimum before tax, whether tax was added or included', () => {
    const rule = taxRuleFor('Japan', 'JPY');
    if (!rule) throw new Error('expected the Japan rule');
    expect(amountForMinimum(receipt(), rule)).toBe(6670);
    expect(amountForMinimum(receipt({ taxIncluded: true, total: 9570, subtotal: 9570, taxLines: [{ ratePercent: 10, amount: 869 }] }), rule)).toBe(8701);
  });

  it('estimates the tax from the standard rate when the receipt does not print it, and says so', () => {
    expect(receiptTax(receipt({ taxLines: [], taxIncluded: true, total: 5500 }), { standardRatePercent: 10 })).toEqual({ tax: 500, estimated: true });
  });

  it('adds up receipts from the same shop on the same day to meet the minimum', () => {
    const first = purchase({ id: 'a' }, { subtotal: 3000, total: 3300, taxLines: [{ ratePercent: 10, amount: 300 }] });
    const second = purchase({ id: 'b', merchantName: 'matsumoto kiyoshi ginza ' }, { subtotal: 2500, total: 2750, taxLines: [{ ratePercent: 10, amount: 250 }] });
    expect(checkRefund(first, tokyo, []).eligibility).toBe('not_eligible');
    expect(checkRefund(first, tokyo, [second]).eligibility).toBe('eligible');
    // A different day does not count.
    expect(checkRefund(first, tokyo, [{ ...second, purchaseDate: '2026-11-14' }]).eligibility).toBe('not_eligible');
  });

  it('says "possibly" when the receipt does not show a tax-free shop, and follows the user’s answer', () => {
    const unknown = purchase({}, { taxFreeShop: 'unknown' });
    expect(checkRefund(unknown, tokyo).eligibility).toBe('possible');
    expect(checkRefund({ ...unknown, taxRefund: { shopIsTaxFree: true } }, tokyo).eligibility).toBe('eligible');
    expect(checkRefund({ ...unknown, taxRefund: { shopIsTaxFree: false } }, tokyo)).toMatchObject({ eligibility: 'not_eligible', reason: 'This shop is not a registered tax-free shop.' });
  });

  it('does not refund stays, transport or tickets', () => {
    expect(checkRefund(purchase({ category: 'stay' }), tokyo).reason).toBe('Hotel stays are not tax-free.');
    expect(checkRefund(purchase({ category: 'activities' }), tokyo).eligibility).toBe('not_eligible');
  });

  it('does not refund purchases from before 1 Nov 2026, or more than 90 days before leaving', () => {
    expect(checkRefund(purchase({ purchaseDate: '2026-10-30' }), tokyo).reason).toMatch(/Before 1 Nov 2026/);
    expect(checkRefund(purchase({ purchaseDate: '2026-11-15' }), { ...tokyo, endDate: '2027-03-01' }).reason).toMatch(/more than 90 days/);
  });

  it('checks nothing without a scanned receipt or verified rules for the country', () => {
    expect(checkRefund(purchase({ receipt: undefined }), tokyo).eligibility).toBe('not_checked');
    expect(checkRefund(purchase({}, { currency: 'THB' }), { ...tokyo, country: 'Thailand' }).eligibility).toBe('not_checked');
  });
});

describe('tracking refunds', () => {
  it('moves a refund from "to collect" to "received" when the user marks it', () => {
    const uniqlo = byShop('UNIQLO Ginza');
    const after = setRefundState(data, uniqlo.id, { status: 'received' });
    const summary = summarizeRefunds(tokyo, after.expenses);
    expect(summary.toCollectMyr).toBe(3822);
    expect(summary.receivedMyr).toBe(2244);
  });

  it('reminds the user on the last two days while refunds are unclaimed', () => {
    const summary = summarizeRefunds(tokyo, data.expenses);
    expect(shouldRemindToClaim(summary, '2026-11-15', tokyo)).toBe(false);
    expect(shouldRemindToClaim(summary, '2026-11-17', tokyo)).toBe(true);
    expect(shouldRemindToClaim(summary, '2026-11-18', tokyo)).toBe(true);
    const allClaimed = data.expenses.reduce((d, e) => setRefundState(d, e.id, { status: 'claimed' }), data);
    expect(shouldRemindToClaim(summarizeRefunds(tokyo, allClaimed.expenses), '2026-11-18', tokyo)).toBe(false);
  });

  it('ticks and unticks the departure checklist', () => {
    const once = toggleRefundChecklist(data, tokyo.id, 'kiosk');
    expect(once.trips[0]?.refundChecklist).toEqual(['kiosk']);
    expect(toggleRefundChecklist(once, tokyo.id, 'kiosk').trips[0]?.refundChecklist).toEqual([]);
  });
});
