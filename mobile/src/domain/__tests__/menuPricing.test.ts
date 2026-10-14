import { applyCharges, chargesSummary, orderBill, taxUnknown, type MenuCharges } from '../menuPricing';

const japan: MenuCharges = { pricesExcludeTax: true, addedTaxPercent: 10, serviceChargePercent: null };
const thaiPlusPlus: MenuCharges = { pricesExcludeTax: true, addedTaxPercent: 7, serviceChargePercent: 10 };
const asPrinted: MenuCharges = { pricesExcludeTax: false, addedTaxPercent: null, serviceChargePercent: null };

describe('applyCharges', () => {
  it('adds 10% to Japanese "before tax" prices: ¥1,000 ramen costs ¥1,100', () => {
    expect(applyCharges(1000, japan)).toEqual({ printed: 1000, service: 0, tax: 100, total: 1100 });
  });

  it('works out Thai "++" as service first, then VAT on both: ฿180 costs ฿211.86', () => {
    // 180 + 18 service = 198; 7% of 198 = 13.86. In satang: 18000 + 1800 + 1386.
    expect(applyCharges(18000, thaiPlusPlus)).toEqual({ printed: 18000, service: 1800, tax: 1386, total: 21186 });
  });

  it('leaves prices that already include everything as printed', () => {
    expect(applyCharges(900, asPrinted).total).toBe(900);
  });

  it('adds service even when prices include tax', () => {
    expect(applyCharges(10000, { pricesExcludeTax: false, addedTaxPercent: null, serviceChargePercent: 10 }).total).toBe(11000);
  });

  it('rounds each charge to the smallest unit', () => {
    expect(applyCharges(455, japan).tax).toBe(46);
  });
});

describe('orderBill', () => {
  it('adds the charges once, on the whole order, like a real bill', () => {
    // Tonkotsu ramen ¥1,000 + 2 × gyoza ¥450 = ¥1,900, + 10% = ¥2,090.
    expect(orderBill([{ printed: 1000, quantity: 1 }, { printed: 450, quantity: 2 }, { printed: 600, quantity: 0 }], japan)).toEqual({
      printed: 1900,
      service: 0,
      tax: 190,
      total: 2090,
    });
  });

  it('is zero for an empty order', () => {
    expect(orderBill([], thaiPlusPlus).total).toBe(0);
  });
});

describe('describing the charges', () => {
  it('explains what is added', () => {
    expect(chargesSummary(japan)).toBe('Prices on this menu are before 10% tax. Ringgit prices include it.');
    expect(chargesSummary(thaiPlusPlus)).toMatch(/10% service charge and 7% tax/);
    expect(chargesSummary(asPrinted)).toBeNull();
  });

  it('is honest when the menu says tax is extra but not how much', () => {
    const unknown = { pricesExcludeTax: true, addedTaxPercent: null, serviceChargePercent: null };
    expect(taxUnknown(unknown)).toBe(true);
    expect(applyCharges(1000, unknown).total).toBe(1000);
    expect(chargesSummary(unknown)).toMatch(/not how much/);
  });
});
