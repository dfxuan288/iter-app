/**
 * Calendar-date helpers. Dates are plain "YYYY-MM-DD" strings with no time or time zone, so a
 * trip day is the same day wherever the phone thinks it is. All arithmetic is done in UTC.
 */

export type IsoDate = string;

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): value is IsoDate {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function toUtcMs(date: IsoDate): number {
  if (!isIsoDate(date)) throw new Error(`Expected a YYYY-MM-DD date, got "${date}"`);
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day);
}

function fromUtcMs(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function toIsoDate(year: number, monthIndex: number, day: number): IsoDate {
  return fromUtcMs(Date.UTC(year, monthIndex, day));
}

/** The calendar date on this device right now. */
export function isoDateFromLocal(now: Date): IsoDate {
  return toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** Number of days in a trip, counting both the first and the last day. */
export function daysInclusive(start: IsoDate, end: IsoDate): number {
  return diffDays(start, end) + 1;
}

/** Every date from `start` to `end`, both included. */
export function eachDay(start: IsoDate, end: IsoDate): IsoDate[] {
  const count = daysInclusive(start, end);
  return count <= 0 ? [] : Array.from({ length: count }, (_, index) => addDays(start, index));
}

export function isWithin(date: IsoDate, start: IsoDate, end: IsoDate): boolean {
  return date >= start && date <= end;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** "14 Nov" */
export function formatDayMonth(date: IsoDate): string {
  const d = new Date(toUtcMs(date));
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "14 Nov 2026" */
export function formatFullDate(date: IsoDate): string {
  return `${formatDayMonth(date)} ${new Date(toUtcMs(date)).getUTCFullYear()}`;
}

/** "Sat" */
export function weekdayShort(date: IsoDate): string {
  return WEEKDAYS[new Date(toUtcMs(date)).getUTCDay()] as string;
}

/** "November 2026" */
export function formatMonthYear(year: number, monthIndex: number): string {
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${names[monthIndex]} ${year}`;
}

export interface MonthGrid {
  year: number;
  monthIndex: number;
  /** Weeks of seven cells, Monday first. `null` cells pad the start and end of the month. */
  weeks: (IsoDate | null)[][];
}

/** Lays out one month as rows of weeks for a calendar. */
export function monthGrid(year: number, monthIndex: number): MonthGrid {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leading = (first.getUTCDay() + 6) % 7; // Monday = 0
  const cells: (IsoDate | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toIsoDate(year, monthIndex, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (IsoDate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { year, monthIndex, weeks };
}
