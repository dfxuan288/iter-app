import { guessCategory, parseQuickEntry } from '../quickEntry';

describe('parseQuickEntry', () => {
  it('reads the example from the brief: "1200 yen ramen"', () => {
    expect(parseQuickEntry('1200 yen ramen', 'THB')).toEqual({
      amountMinor: 1200,
      currency: 'JPY',
      currencyStated: true,
      description: 'ramen',
      category: 'food',
    });
  });

  it('uses the trip currency when none is named', () => {
    const entry = parseQuickEntry('850 taxi to hotel', 'JPY');
    expect(entry).toMatchObject({ amountMinor: 850, currency: 'JPY', currencyStated: false, category: 'transport' });
  });

  it.each([
    ['¥1,200 ramen', 'JPY', 1200],
    ['ramen 1200yen', 'JPY', 1200],
    ['RM 25.50 lunch', 'MYR', 2550],
    ['rm12 coffee', 'MYR', 1200],
    ['coffee 4.5 usd', 'USD', 450],
    ['$12 burger', 'USD', 1200],
    ['S$8 kopi', 'SGD', 800],
    ['350 baht massage', 'THB', 35000],
    ['€15 museum ticket', 'EUR', 1500],
    ['15000 won bibimbap', 'KRW', 15000],
    ['50k rupiah nasi goreng', 'IDR', 50000],
    ['1.5k yen souvenirs', 'JPY', 1500],
    ['85,000 dong pho', 'VND', 85000],
  ] as const)('reads "%s"', (text, currency, amountMinor) => {
    expect(parseQuickEntry(text, 'JPY')).toMatchObject({ currency, amountMinor });
  });

  it('keeps the rest of the text as the description', () => {
    expect(parseQuickEntry('1200 yen ramen at Ichiran', 'JPY')?.description).toBe('ramen at Ichiran');
    expect(parseQuickEntry('2500', 'JPY')?.description).toBe('');
  });

  it('returns null when there is no usable amount', () => {
    for (const text of ['', '   ', 'ramen', 'yen', '0 yen ramen', '12.5 yen snack']) {
      expect(parseQuickEntry(text, 'JPY')).toBeNull();
    }
  });

  it('does not mistake part of a word for a currency', () => {
    // "wonton" contains "won", "dollarama" contains "dollar".
    expect(parseQuickEntry('900 wonton soup', 'JPY')).toMatchObject({ currency: 'JPY', currencyStated: false });
    // "rmb" contains "rm" but is the Chinese yuan, not the Ringgit.
    expect(parseQuickEntry('30 rmb exchange', 'JPY')).toMatchObject({ currency: 'CNY', currencyStated: true });
  });

  it('understands the currencies of "Somewhere else?" trips', () => {
    expect(parseQuickEntry('12.50 pounds fish and chips', 'GBP')).toMatchObject({ currency: 'GBP', amountMinor: 1250, currencyStated: true });
    expect(parseQuickEntry('£8 coffee', 'JPY')).toMatchObject({ currency: 'GBP', amountMinor: 800 });
    expect(parseQuickEntry('3.250 dinner', 'KWD')).toMatchObject({ currency: 'KWD', amountMinor: 3250 });
  });
});

describe('guessCategory', () => {
  it.each([
    ['ramen at Ichiran', 'food'],
    ['Suica top-up', 'transport'],
    ['teamLab ticket', 'activities'],
    ['Uniqlo jacket', 'shopping'],
  ] as const)('puts "%s" in %s', (text, category) => {
    expect(guessCategory(text)).toBe(category);
  });

  it('gives no guess when nothing matches, or when a keyword is only part of a word', () => {
    expect(guessCategory('misc')).toBeNull();
    expect(guessCategory('barber')).toBeNull();
  });
});
