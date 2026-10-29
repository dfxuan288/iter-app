import { addMonths, formatDayRange } from '@/domain/dates';
import {
  accessOn,
  activatePlan,
  addPass,
  coverOn,
  emptyPlan,
  passExpiresOn,
  pricePerDaySen,
  readPlan,
  recordScan,
  savedForLater,
  scansLeftToday,
  type PlanState,
} from '@/domain/plan';

const trip = { startDate: '2026-11-09', endDate: '2026-11-18' };

/** Opens the app on each day in turn, as the provider does. */
const openEachDay = (plan: PlanState, days: string[]) => days.reduce((current, day) => activatePlan(current, trip, day), plan);

describe('addMonths', () => {
  it('moves to the same day, or the last day of a shorter month', () => {
    expect(addMonths('2026-10-17', 12)).toBe('2027-10-17');
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28');
    expect(addMonths('2028-02-29', 12)).toBe('2029-02-28');
  });
});

describe('formatDayRange', () => {
  it('writes the month once when both days share it', () => {
    expect(formatDayRange('2026-11-09', '2026-11-11')).toBe('9–11 Nov');
    expect(formatDayRange('2026-11-30', '2026-12-02')).toBe('30 Nov–2 Dec');
    expect(formatDayRange('2026-11-09', '2026-11-09')).toBe('9 Nov');
  });
});

describe('free trial', () => {
  it('starts on the first trip day and covers 3 days', () => {
    const plan = activatePlan(emptyPlan(), trip, '2026-11-09');
    expect(plan.trialStartedOn).toBe('2026-11-09');
    expect(coverOn(plan, '2026-11-11')?.kind).toBe('trial');
    expect(coverOn(plan, '2026-11-12')).toBeNull();
  });

  it('does not start before the trip, while planning is open to everyone', () => {
    const plan = activatePlan(emptyPlan(), trip, '2026-11-01');
    expect(plan.trialStartedOn).toBeNull();
    expect(accessOn(plan, trip, '2026-11-01')).toMatchObject({ level: 'full', because: 'planning' });
  });

  it('starts on the first trip day ITER is used, if that is later than day 1', () => {
    expect(activatePlan(emptyPlan(), trip, '2026-11-12').trialStartedOn).toBe('2026-11-12');
  });

  it('is used once: after it ends, the free version applies', () => {
    const plan = openEachDay(emptyPlan(), ['2026-11-09', '2026-11-12']);
    expect(plan.trialStartedOn).toBe('2026-11-09');
    expect(accessOn(plan, trip, '2026-11-12')).toEqual({ level: 'free', because: 'not_covered' });
  });

  it('returns the same object when nothing changes', () => {
    const plan = activatePlan(emptyPlan(), trip, '2026-11-09');
    expect(activatePlan(plan, trip, '2026-11-10')).toBe(plan);
  });
});

describe('passes', () => {
  it('the demo: trial 9–11 Nov, then a 7-Day Pass bought during the trial runs 12–18 Nov', () => {
    let plan = activatePlan(emptyPlan(), trip, '2026-11-09');
    plan = addPass(plan, 'week', 'p1', '2026-11-10');
    plan = activatePlan(plan, trip, '2026-11-10');
    expect(plan.passes[0]?.startsOn).toBeNull();
    plan = activatePlan(plan, trip, '2026-11-12');
    expect(plan.passes[0]?.startsOn).toBe('2026-11-12');
    const cover = coverOn(plan, '2026-11-18');
    expect(cover?.kind === 'pass' && cover.range.end).toBe('2026-11-18');
  });

  it('starts at once when bought on an uncovered trip day', () => {
    const plan = activatePlan(addPass(openEachDay(emptyPlan(), ['2026-11-09', '2026-11-12']), 'day', 'p1', '2026-11-12'), trip, '2026-11-12');
    expect(accessOn(plan, trip, '2026-11-12')).toMatchObject({ level: 'full', because: 'pass' });
    expect(accessOn(plan, trip, '2026-11-13').level).toBe('free');
  });

  it('uses the oldest saved pass first and keeps the rest for later', () => {
    let plan = activatePlan(emptyPlan(), trip, '2026-11-09');
    plan = addPass(plan, 'week', 'new', '2026-11-11');
    plan = addPass(plan, 'day', 'old', '2026-11-10');
    plan = activatePlan(plan, trip, '2026-11-12');
    expect(plan.passes.find((p) => p.id === 'old')?.startsOn).toBe('2026-11-12');
    expect(savedForLater(plan, '2026-11-12')).toEqual([{ kind: 'week', count: 1, expiresOn: '2027-11-11' }]);
  });

  it('does not start on days outside the trip', () => {
    const plan = addPass(activatePlan(emptyPlan(), trip, '2026-11-09'), 'day', 'p1', '2026-11-10');
    expect(activatePlan(plan, trip, '2026-11-19')).toBe(plan);
    expect(accessOn(plan, trip, '2026-11-19').level).toBe('free');
  });

  it('an unused pass expires 12 months after purchase', () => {
    const plan = addPass(activatePlan(emptyPlan(), trip, '2026-11-09'), 'day', 'p1', '2025-11-10');
    expect(passExpiresOn(plan.passes[0]!)).toBe('2026-11-10');
    expect(activatePlan(plan, trip, '2026-11-12')).toBe(plan);
    expect(savedForLater(plan, '2026-11-12')).toEqual([]);
  });

  it('works out the price per day', () => {
    expect(pricePerDaySen('week')).toBe(184);
    expect(pricePerDaySen('day')).toBe(350);
  });
});

describe('scans', () => {
  it('the trial allows 10 a day, counted per day', () => {
    let plan = activatePlan(emptyPlan(), trip, '2026-11-09');
    for (let i = 0; i < 10; i++) plan = recordScan(plan, '2026-11-09');
    expect(scansLeftToday(plan, trip, '2026-11-09')).toBe(0);
    expect(scansLeftToday(plan, trip, '2026-11-10')).toBe(10);
  });

  it('a pass has no daily limit, and the free version has none to use', () => {
    const covered = activatePlan(addPass(openEachDay(emptyPlan(), ['2026-11-09', '2026-11-12']), 'day', 'p', '2026-11-12'), trip, '2026-11-12');
    expect(scansLeftToday(covered, trip, '2026-11-12')).toBeNull();
    expect(scansLeftToday(covered, trip, '2026-11-13')).toBe(0);
  });
});

describe('readPlan', () => {
  it('keeps good data and drops broken passes', () => {
    const plan = readPlan({ trialStartedOn: '2026-11-09', passes: [{ id: 'a', kind: 'week', purchasedOn: '2026-11-10', startsOn: null }, { id: 'b', kind: 'year' }] });
    expect(plan?.passes).toHaveLength(1);
  });

  it('rejects data that is not a plan', () => {
    expect(readPlan(null)).toBeNull();
    expect(readPlan({ trialStartedOn: 5, passes: [] })).toBeNull();
  });
});
