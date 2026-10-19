import { describe, expect, it } from 'vitest';
import { generateAISchedule, auditSchedule } from '../utils/aiSchedulerEngine';
import { normalizeShift } from '../utils/shiftHelper';
import { schedulerDemandByDay } from '../utils/registeredScheduler';
import { WEEK_DAYS } from '../data/constants';

const reg = shift => ({ shift, confirmed: false, registered: true });
const emp = (id, extra = {}) => ({ id, name: id, dept: 'A', type: 'STPT', ...extra });
const opts = (existingSchedule, extra = {}) => ({ currentWeek: '2026-10-12', requiredMatrix: {}, requiredMatrixByDay: { T2: { '6-14': 1, '14-22': 1, '22-6': 1 } }, existingSchedule, previousWeekSchedule: {}, nextWeekSchedule: {}, ...extra });
const chosen = row => Object.values(row).filter(raw => normalizeShift(raw).confirmed && !['', 'off'].includes(normalizeShift(raw).shift));

describe('registration-only scheduling', () => {
  it.each(['STPT', 'STFT', 'CSR_NEW', 'SM'])('never invents a shift for %s, even with legacy flags and forced instructions', type => {
    const source = { a: { T2: '', T3: 'off' } };
    const result = generateAISchedule([emp('a', { type })], 'A', opts(source, { respectAvailability: false, respectOffRequests: false, employeeOverrides: { a: { T2: '6-14', T3: '14-22' } } }));
    expect(result.schedule).toEqual(source);
    expect(result.newAssignments).toBe(0);
    expect(result.notices).toHaveLength(2);
    expect(result.shortages.map(s => s.shift)).toEqual(['6-14', '14-22', '22-6']);
    expect(result.shortages[0]).toMatchObject({ date: '2026-10-12', missing: 1, actual: 0 });
  });
  it('only confirms exact registrations and retains surplus registrations', () => {
    const source = { a: { T2: reg('6-14'), T3: 'off' }, b: { T2: reg('6-14') }, c: { T2: reg('14-22') } };
    const copy = structuredClone(source);
    const result = generateAISchedule(['a', 'b', 'c'].map(id => emp(id)), 'A', opts(source));
    expect(result.newAssignments).toBe(2);
    expect([result.schedule.a.T2, result.schedule.b.T2].filter(s => s === '6-14')).toHaveLength(1);
    expect(Object.values(result.schedule).some(row => row.T2?.registered)).toBe(true);
    expect(result.schedule.c.T2).toBe('14-22');
    expect(result.schedule.a.T3).toBe('off');
    expect(source).toEqual(copy);
    expect(result.shortages).toHaveLength(1);
    expect(result.shortages[0].shift).toBe('22-6');
  });
  it('preserves confirmed and outbound shifts and counts inbound staff only once', () => {
    const source = { a: { T2: { shift: '6-14', confirmed: true, note: 'manual' }, T3: { shift: '6-14', covering_store: 'B' } }, b: { T2: reg('6-14') }, c: { T2: { shift: '14-22', covering_store: 'A' } } };
    const result = generateAISchedule([emp('a'), emp('b'), emp('c', { dept: 'B' })], 'A', opts(source));
    expect(result.schedule.a).toEqual(source.a);
    expect(result.schedule.b).toEqual(source.b);
    expect(result.schedule.c).toBeUndefined();
    expect(result.stats.totalShifts).toBe(2);
    expect(result.employeeHours.a).toBe(16);
    expect(result.shortages).toHaveLength(1);
  });
  it('does not count draft registrations or OFF staff from other stores as coverage', () => {
    const result = generateAISchedule([emp('a'), emp('b', { dept: 'B', skills: ['NIGHT_READY'] })], 'A', opts({ b: { T2: 'off', T3: { ...reg('6-14'), covering_store: 'A' } } }));
    expect(result.borrowedAssignments).toEqual([]);
    expect(result.newAssignments).toBe(0);
    expect(result.stats.totalHours).toBe(0);
  });
  it('recognizes legacy registration forms without treating confirmed strings as availability', () => {
    const result = generateAISchedule([emp('a'), emp('b')], 'A', opts({ a: { T2: '?6-14' }, b: { T2: { shift: '14-22', status: 'registered' } } }));
    expect(result.schedule.a.T2).toBe('6-14');
    expect(result.schedule.b.T2).toBe('14-22');
  });
  it('combines complementary short shifts without reporting a false full-shift gap', () => {
    const result = generateAISchedule([emp('a'), emp('b')], 'A', opts({ a: { T2: reg('6-10') }, b: { T2: reg('10-14') } }, { requiredMatrixByDay: { T2: { '6-14': 1 } } }));
    expect(result.newAssignments).toBe(2);
    expect(result.shortages).toEqual([]);
  });
  it('reports uncovered hours of a partial shift, not the entire shift', () => {
    const result = generateAISchedule([emp('a')], 'A', opts({ a: { T2: reg('6-10') } }, { requiredMatrixByDay: { T2: { '6-14': 1 } } }));
    expect(result.shortages).toMatchObject([{ shift: '10-14', missing: 1, required: 1, actual: 0 }]);
  });
  it('adds overlapping peak-hour requirements instead of ignoring them', () => {
    const result = generateAISchedule([emp('a'), emp('b')], 'A', opts({ a: { T2: reg('6-14') }, b: { T2: reg('10-14') } }, { requiredMatrixByDay: { T2: { '6-14': 1, '10-14': 1 } } }));
    expect(result.newAssignments).toBe(2);
    expect(result.shortages).toEqual([]);
  });
  it('does not add FT shifts just to reach 48 hours when demand is already met', () => {
    const source = Object.fromEntries(['a', 'b', 'c'].map(id => [id, Object.fromEntries(WEEK_DAYS.map(day => [day, reg('6-14')]))]));
    const result = generateAISchedule(['a', 'b', 'c'].map(id => emp(id, { type: 'STFT' })), 'A', opts(source, { requiredMatrix: { '6-14': 1 }, requiredMatrixByDay: {} }));
    expect(result.newAssignments).toBe(7);
    WEEK_DAYS.forEach(day => expect(Object.values(result.schedule).filter(row => row[day] === '6-14')).toHaveLength(1));
  });
  it('spreads limited hours to empty days before adding surplus to a crowded day', () => {
    const source = Object.fromEntries(['a', 'b', 'c'].map(id => [id, { T2: reg('6-14'), T3: reg('6-14') }]));
    const result = generateAISchedule(['a', 'b', 'c'].map(id => emp(id, { maxH: 8 })), 'A', opts(source, { requiredMatrixByDay: { T2: { '6-14': 3 }, T3: { '6-14': 1 } } }));
    expect(Object.values(result.schedule).filter(row => row.T3 === '6-14')).toHaveLength(1);
    expect(Object.values(result.schedule).filter(row => row.T2 === '6-14')).toHaveLength(2);
  });
  it('never exceeds the PT cap even if maxH is incorrectly larger', () => {
    const source = { a: Object.fromEntries(WEEK_DAYS.map(day => [day, reg('6-14')])) };
    const result = generateAISchedule([emp('a', { maxH: 48 })], 'A', opts(source, { requiredMatrix: { '6-14': 1 }, requiredMatrixByDay: {} }));
    expect(result.employeeHours.a).toBe(16);
    expect(chosen(result.schedule.a)).toHaveLength(2);
    expect(result.shortages.some(gap => gap.reason.includes('giới hạn giờ'))).toBe(true);
  });
  it.each([
    { source: { a: { T2: '14-22', T3: reg('6-14') } }, extra: {}, day: 'T3' },
    { source: { a: { T2: reg('14-22'), T3: '6-14' } }, extra: {}, day: 'T2' },
    { source: { a: { T2: reg('6-14') } }, extra: { previousWeekSchedule: { a: { CN: '22-6' } } }, day: 'T2' },
    { source: { a: { CN: reg('22-6') } }, extra: { nextWeekSchedule: { a: { T2: '14-22' } } }, day: 'CN' },
  ])('checks confirmed neighbors and week boundaries: $day', ({ source, extra, day }) => {
    const result = generateAISchedule([emp('a')], 'A', opts(source, { requiredMatrix: { '6-14': 1, '14-22': 1, '22-6': 1 }, requiredMatrixByDay: {}, ...extra }));
    expect(result.schedule.a[day]).toEqual(source.a[day]);
    expect(result.newAssignments).toBe(0);
  });
  it('unselected availability does not consume hours or block rest', () => {
    const source = { a: { T2: reg('22-6'), T3: reg('6-14') } };
    const result = generateAISchedule([emp('a')], 'A', opts(source, { requiredMatrixByDay: { T3: { '6-14': 1 } } }));
    expect(result.schedule.a.T3).toBe('6-14');
    expect(result.schedule.a.T2).toEqual(source.a.T2);
    expect(result.employeeHours.a).toBe(8);
  });
  it('prefers a registered Night Ready mentor but never recruits an unregistered one', () => {
    const staff = [emp('a'), emp('b', { skills: ['NIGHT_READY'] }), emp('c', { skills: ['NIGHT_READY'] })];
    const result = generateAISchedule(staff, 'A', opts({ a: { T2: reg('22-6') }, b: { T2: reg('22-6') } }, { requiredMatrixByDay: { T2: { '22-6': 1 } } }));
    expect(result.schedule.b.T2).toBe('22-6');
    expect(result.schedule.a.T2).toEqual(reg('22-6'));
    expect(result.schedule.c).toEqual({});
    expect(result.criticalInsights).toEqual([]);
  });
  it('preserves locked employee rows and excludes inactive staff', () => {
    const source = { a: { T2: reg('6-14'), T3: { shift: '6-14', covering_store: 'B' } }, b: { T2: reg('6-14') } };
    const result = generateAISchedule([emp('a'), emp('b', { isActive: false })], 'A', opts(source, { scheduleWeeks: { 'B::2026-10-12': { status: 'approved' } } }));
    expect(result.schedule).toEqual({});
    expect(result.newAssignments).toBe(0);
  });
  it('never creates night demand from zero when scaling', () => {
    expect(schedulerDemandByDay({ requiredMatrix: { '22-6': 0 }, demandFactor: 1.2 }).T2['22-6']).toBe(0);
  });
  it('audits only confirmed work, not unselected registrations', () => {
    const source = { a: Object.fromEntries(WEEK_DAYS.map(day => [day, reg(day === 'T2' ? '22-6' : '6-14')])) };
    expect(auditSchedule([emp('a', { type: 'STFT' })], source, 'A').issues).toEqual([]);
  });
});
