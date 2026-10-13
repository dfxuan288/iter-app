import { addDays, daysInclusive, diffDays, eachDay, formatDayMonth, formatFullDate, isIsoDate, isWithin, monthGrid, weekdayShort } from '../dates';

describe('isIsoDate', () => {
  it('accepts real dates and rejects impossible or malformed ones', () => {
    expect(isIsoDate('2026-11-15')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('15/11/2026')).toBe(false);
  });
});

describe('date arithmetic', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-11-09', 9)).toBe('2026-11-18');
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts the days between two dates', () => {
    expect(diffDays('2026-11-09', '2026-11-15')).toBe(6);
    expect(diffDays('2026-11-15', '2026-11-09')).toBe(-6);
    expect(diffDays('2026-11-15', '2026-11-15')).toBe(0);
  });

  it('counts a trip inclusively: 9 to 18 November is 10 days', () => {
    expect(daysInclusive('2026-11-09', '2026-11-18')).toBe(10);
    expect(daysInclusive('2026-11-09', '2026-11-09')).toBe(1);
  });

  it('lists every day of a trip', () => {
    const days = eachDay('2026-11-29', '2026-12-02');
    expect(days).toEqual(['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02']);
    expect(eachDay('2026-11-10', '2026-11-09')).toEqual([]);
  });

  it('checks whether a date falls inside a range', () => {
    expect(isWithin('2026-11-09', '2026-11-09', '2026-11-18')).toBe(true);
    expect(isWithin('2026-11-19', '2026-11-09', '2026-11-18')).toBe(false);
  });

  it('throws on a malformed date instead of silently giving a wrong answer', () => {
    expect(() => addDays('15 Nov', 1)).toThrow();
  });
});

describe('formatting', () => {
  it('formats dates for display', () => {
    expect(formatDayMonth('2026-11-14')).toBe('14 Nov');
    expect(formatFullDate('2026-11-14')).toBe('14 Nov 2026');
    expect(weekdayShort('2026-11-15')).toBe('Sun');
  });
});

describe('monthGrid', () => {
  it('lays out November 2026 in Monday-first weeks', () => {
    const grid = monthGrid(2026, 10);
    // 1 November 2026 is a Sunday, so it is the last cell of the first week.
    expect(grid.weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(grid.weeks.every((week) => week.length === 7)).toBe(true);
    expect(grid.weeks.flat().filter(Boolean)).toHaveLength(30);
  });
});
