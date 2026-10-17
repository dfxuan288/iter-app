import { planConfig, passOffer, type PassKind } from '@/config/plans';
import { addDays, addMonths, isWithin, type IsoDate } from '@/domain/dates';

/**
 * Who can use what, and when (see config/plans.ts for the rules in plain words). Pure functions:
 * "today" is always passed in, and nothing here reads the clock or storage.
 */

export interface Pass {
  id: string;
  kind: PassKind;
  purchasedOn: IsoDate;
  /** The first day it covers. `null` until it starts (it is then "saved for later"). */
  startsOn: IsoDate | null;
}

export interface PlanState {
  /** The first day of the free trial; `null` until it starts. It is used once. */
  trialStartedOn: IsoDate | null;
  passes: Pass[];
  /** Scans sent today, for the trial's daily limit. Only today's count is kept. */
  scansToday?: { date: IsoDate; count: number };
}

/** The part of a trip that matters here. */
export interface TripDates {
  startDate: IsoDate;
  endDate: IsoDate;
}

export const emptyPlan = (): PlanState => ({ trialStartedOn: null, passes: [] });

export interface DateRange {
  start: IsoDate;
  end: IsoDate;
}

export function trialRange(plan: PlanState): DateRange | null {
  if (!plan.trialStartedOn) return null;
  return { start: plan.trialStartedOn, end: addDays(plan.trialStartedOn, planConfig.trial.days - 1) };
}

/** The days a started pass covers. */
export function passRange(pass: Pass): DateRange | null {
  if (!pass.startsOn) return null;
  return { start: pass.startsOn, end: addDays(pass.startsOn, passOffer(pass.kind).days - 1) };
}

/** The last day an unstarted pass can still start. */
export function passExpiresOn(pass: Pass): IsoDate {
  return addMonths(pass.purchasedOn, planConfig.unusedPassExpiryMonths);
}

/** Bought, not started, and not expired: waiting to be used. */
export function isSavedForLater(pass: Pass, today: IsoDate): boolean {
  return pass.startsOn === null && today <= passExpiresOn(pass);
}

/** What covers a given day, if anything. The trial counts first. */
export type Cover = { kind: 'trial'; range: DateRange } | { kind: 'pass'; pass: Pass; range: DateRange };

export function coverOn(plan: PlanState, date: IsoDate): Cover | null {
  const trial = trialRange(plan);
  if (trial && isWithin(date, trial.start, trial.end)) return { kind: 'trial', range: trial };
  for (const pass of plan.passes) {
    const range = passRange(pass);
    if (range && isWithin(date, range.start, range.end)) return { kind: 'pass', pass, range };
  }
  return null;
}

export function isTripDay(trip: TripDates | undefined, date: IsoDate): boolean {
  return trip !== undefined && isWithin(date, trip.startDate, trip.endDate);
}

/**
 * Starts the trial or a saved pass when a trip day is not covered: the trial first (it is used
 * once, from the first trip day ITER is used), then the oldest saved pass. Returns the same object
 * when nothing changes, so callers can tell whether there is anything to save.
 */
export function activatePlan(plan: PlanState, trip: TripDates | undefined, today: IsoDate): PlanState {
  if (!isTripDay(trip, today) || coverOn(plan, today)) return plan;
  if (!plan.trialStartedOn) return { ...plan, trialStartedOn: today };
  const next = plan.passes
    .map((pass, index) => ({ pass, index }))
    .filter(({ pass }) => isSavedForLater(pass, today))
    .sort((a, b) => a.pass.purchasedOn.localeCompare(b.pass.purchasedOn) || a.index - b.index)[0];
  if (!next) return plan;
  return { ...plan, passes: plan.passes.map((pass, index) => (index === next.index ? { ...pass, startsOn: today } : pass)) };
}

/** A pass bought today, waiting to start. Call activatePlan afterwards: it starts at once if today needs it. */
export function addPass(plan: PlanState, kind: PassKind, id: string, today: IsoDate): PlanState {
  return { ...plan, passes: [...plan.passes, { id, kind, purchasedOn: today, startsOn: null }] };
}

/**
 * - `full`: everything works (a trial or pass covers today, or the trip has not started yet,
 *   or there is no trip: planning is open to everyone).
 * - `free`: the free version: Community, planning and the person's own records.
 */
export type Access =
  | { level: 'full'; because: 'trial' | 'pass' | 'planning'; cover: Cover | null }
  | { level: 'free'; because: 'not_covered' };

export function accessOn(plan: PlanState, trip: TripDates | undefined, today: IsoDate): Access {
  const cover = coverOn(plan, today);
  if (cover) return { level: 'full', because: cover.kind, cover };
  if (!trip || today < trip.startDate) return { level: 'full', because: 'planning', cover: null };
  return { level: 'free', because: 'not_covered' };
}

export function scansUsedToday(plan: PlanState, today: IsoDate): number {
  return plan.scansToday?.date === today ? plan.scansToday.count : 0;
}

/** Scans left today: `null` means no limit (a pass), 0 means none left or scanning is locked. */
export function scansLeftToday(plan: PlanState, trip: TripDates | undefined, today: IsoDate): number | null {
  const access = accessOn(plan, trip, today);
  if (access.level === 'free') return 0;
  if (access.because === 'pass') return null;
  return Math.max(0, planConfig.trial.scansPerDay - scansUsedToday(plan, today));
}

export function recordScan(plan: PlanState, today: IsoDate): PlanState {
  return { ...plan, scansToday: { date: today, count: scansUsedToday(plan, today) + 1 } };
}

/** Passes waiting to be used, grouped by kind, with the earliest expiry date of each group. */
export function savedForLater(plan: PlanState, today: IsoDate): { kind: PassKind; count: number; expiresOn: IsoDate }[] {
  return planConfig.passOrder
    .map((kind) => {
      const waiting = plan.passes.filter((pass) => pass.kind === kind && isSavedForLater(pass, today));
      const expiresOn = waiting.map(passExpiresOn).sort()[0];
      return expiresOn ? { kind, count: waiting.length, expiresOn } : null;
    })
    .filter((group) => group !== null);
}

/** "About RM 1.84 a day": the price per day, in sen, rounded to the nearest sen. */
export function pricePerDaySen(kind: PassKind): number {
  const offer = passOffer(kind);
  return Math.round(offer.priceSen / offer.days);
}

/** Reads saved plan data defensively: anything malformed is dropped rather than crashing the app. */
export function readPlan(value: unknown): PlanState | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const isDate = (d: unknown): d is IsoDate => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (!(v.trialStartedOn === null || isDate(v.trialStartedOn)) || !Array.isArray(v.passes)) return null;
  const passes = v.passes.filter(
    (p): p is Pass =>
      typeof p === 'object' &&
      p !== null &&
      typeof (p as Pass).id === 'string' &&
      ((p as Pass).kind === 'day' || (p as Pass).kind === 'week') &&
      isDate((p as Pass).purchasedOn) &&
      ((p as Pass).startsOn === null || isDate((p as Pass).startsOn)),
  );
  const scans = v.scansToday as PlanState['scansToday'] | undefined;
  const scansToday = scans && isDate(scans.date) && Number.isInteger(scans.count) ? scans : undefined;
  return { trialStartedOn: v.trialStartedOn, passes, ...(scansToday ? { scansToday } : {}) };
}
