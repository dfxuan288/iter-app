import { convertFromMyr, convertToMyr, formatMoney, parseMoneyInput, sumMinor, toMinor } from '../money';

describe('toMinor', () => {
  it('turns ringgit into sen and keeps yen whole', () => {
    expect(toMinor(4200, 'MYR')).toBe(420000);
    expect(toMinor(705.6, 'MYR')).toBe(70560);
    expect(toMinor(9570, 'JPY')).toBe(9570);
  });

  it('does not drift on amounts that are awkward in binary', () => {
    expect(toMinor(0.1 + 0.2, 'MYR')).toBe(30);
    expect(toMinor(89.19, 'MYR')).toBe(8919);
  });
});

describe('formatMoney', () => {
  it('formats ringgit with two decimals and thousands separators', () => {
    expect(formatMoney(24713, 'MYR')).toBe('RM 247.13');
    expect(formatMoney(420000, 'MYR')).toBe('RM 4,200.00');
    expect(formatMoney(5, 'MYR')).toBe('RM 0.05');
  });

  it('can drop the decimals from whole amounts only', () => {
    expect(formatMoney(20000, 'MYR', { trimZeros: true })).toBe('RM 200');
    expect(formatMoney(24713, 'MYR', { trimZeros: true })).toBe('RM 247.13');
  });

  it('formats currencies without decimals', () => {
    expect(formatMoney(9570, 'JPY')).toBe('¥9,570');
    expect(formatMoney(1250000, 'IDR')).toBe('Rp 1,250,000');
    expect(formatMoney(15000, 'KRW')).toBe('₩15,000');
  });

  it('formats negative amounts', () => {
    expect(formatMoney(-15050, 'MYR')).toBe('-RM 150.50');
  });
});

describe('convertToMyr', () => {
  it('matches the example in the brief: ¥100 is RM 2.58 at 38.725', () => {
    expect(convertToMyr(100, 'JPY', 38.725)).toBe(258);
  });

  it('converts the demo receipts', () => {
    expect(convertToMyr(9570, 'JPY', 38.725)).toBe(24713);
    expect(convertToMyr(16280, 'JPY', 38.725)).toBe(42040);
  });

  it('converts currencies that have decimals', () => {
    // 250.00 baht at 8.2354 baht per ringgit
    expect(convertToMyr(25000, 'THB', 8.2354)).toBe(3036);
    // 10.00 US dollars at 0.24474 dollars per ringgit
    expect(convertToMyr(1000, 'USD', 0.24474)).toBe(4086);
  });

  it('leaves ringgit unchanged whatever rate is given', () => {
    expect(convertToMyr(70560, 'MYR', 1)).toBe(70560);
    expect(convertToMyr(70560, 'MYR', 0)).toBe(70560);
  });

  it('refuses a rate that is zero, negative or not a number', () => {
    expect(() => convertToMyr(100, 'JPY', 0)).toThrow();
    expect(() => convertToMyr(100, 'JPY', -3)).toThrow();
    expect(() => convertToMyr(100, 'JPY', Number.NaN)).toThrow();
  });
});

describe('convertFromMyr', () => {
  it('is the reverse of convertToMyr, to within rounding', () => {
    expect(convertFromMyr(258, 'JPY', 38.725)).toBe(100);
    expect(convertFromMyr(10000, 'JPY', 38.725)).toBe(3873);
    expect(convertFromMyr(10000, 'USD', 0.24474)).toBe(2447);
  });
});

describe('parseMoneyInput', () => {
  it('reads plain, comma-separated and decimal amounts', () => {
    expect(parseMoneyInput('4200', 'MYR')).toBe(420000);
    expect(parseMoneyInput('4,200', 'MYR')).toBe(420000);
    expect(parseMoneyInput(' 1200.5 ', 'MYR')).toBe(120050);
    expect(parseMoneyInput('1200', 'JPY')).toBe(1200);
    expect(parseMoneyInput('0', 'MYR')).toBe(0);
  });

  it('rejects anything that is not a clean non-negative amount', () => {
    for (const bad of ['', 'abc', '-50', '12.345', '1.2.3', '12abc', '.5', '5.']) {
      expect(parseMoneyInput(bad, 'MYR')).toBeNull();
    }
  });

  it('rejects decimals for currencies that have none', () => {
    expect(parseMoneyInput('1200.50', 'JPY')).toBeNull();
  });
});

describe('sumMinor', () => {
  it('adds amounts and returns 0 for none', () => {
    expect(sumMinor([100, 250, 5])).toBe(355);
    expect(sumMinor([])).toBe(0);
  });
});

describe('currencies of "Somewhere else?" trips', () => {
  it('formats and reads three-decimal and zero-decimal currencies', () => {
    expect(formatMoney(3250, 'KWD')).toBe('KWD 3.250');
    expect(parseMoneyInput('3.25', 'KWD')).toBe(3250);
    expect(formatMoney(1250, 'GBP')).toBe('£12.50');
    expect(formatMoney(15000, 'HUF')).toBe('HUF 15,000');
  });
});
