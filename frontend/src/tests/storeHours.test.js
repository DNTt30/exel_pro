import { describe, it, expect } from 'vitest';
import { normalizeStaffingConfig, WEEK_DAYS } from '../data/constants';
import { storeWeeklyHours, resolveStoreHoursLimit } from '../utils/storeHours';
import { generateAISchedule } from '../utils/aiSchedulerEngine';
import { reviewScheduleDraft } from '../utils/scheduleDraft';

const reg = { shift: '6-14', registered: true, confirmed: false };
const employees = Array.from({ length: 5 }, (_, i) => ({ id: String(i), name: String(i), dept: 'A', type: 'STFT' }));
const source = Object.fromEntries(employees.map(e => [e.id, Object.fromEntries(WEEK_DAYS.map(d => [d, reg]))]));
const options = { currentWeek: '2026-10-26', existingSchedule: source, requiredMatrix: { '6-14': 5 },
  maxShiftsPerEmployee: 6, stores: [{ id: 'A', staffing: { weeklyHoursLimit: 224 } }] };

describe('store weekly hours budget', () => {
  it('preserves a configured limit, with no default for existing stores and explicit zero', () => {
    expect(normalizeStaffingConfig().weeklyHoursLimit).toBeUndefined();
    expect(normalizeStaffingConfig({ weeklyHoursLimit: 224 }).weeklyHoursLimit).toBe(224);
    expect(normalizeStaffingConfig({ weeklyHoursLimit: 0 }).weeklyHoursLimit).toBe(0);
    expect(() => normalizeStaffingConfig({ weeklyHoursLimit: -1 })).toThrow();
    expect(() => resolveStoreHoursLimit('A', { weeklyHoursLimit: NaN })).toThrow();
  });
  it('counts confirmed hours at the receiving store, including legacy/night shifts; excludes pending and OFF', () => {
    const emps = [{ id: 'a', dept: 'A' }, { id: 'b', dept: 'B' }];
    const schedule = { a: { T2: '6-14', T3: '22-6_B', T4: reg, T5: 'off' }, b: { T2: { shift: '14-22', covering_store: 'A' } } };
    expect(storeWeeklyHours(emps, schedule, 'A')).toBe(16);
    expect(storeWeeklyHours(emps, schedule, 'B')).toBe(8);
  });
  it('stops at 224 hours and explains why remaining demand cannot be met', () => {
    const result = generateAISchedule(employees, 'A', options);
    expect(storeWeeklyHours(employees, result.schedule, 'A')).toBe(224);
    expect(result.shortages.some(s => s.reason.includes('224h/tuần'))).toBe(true);
    expect(source['0'].T2).toEqual(reg);
  });
  it('respects zero and a budget smaller than one full registration without shortening the shift', () => {
    for (const limit of [0, 7.5]) {
      const result = generateAISchedule(employees, 'A', { ...options, weeklyHoursLimit: limit });
      expect(result.newAssignments).toBe(0);
    }
  });
  it('cannot loosen current store configuration using saved draft constraints', () => {
    expect(resolveStoreHoursLimit('A', { ...options, weeklyHoursLimit: 300 })).toBe(224);
  });
  it('preserves existing over-budget shifts but blocks draft approval', () => {
    const existingSchedule = { '0': { T2: '6-14', T3: '6-14' } };
    const opts = { ...options, existingSchedule, weeklyHoursLimit: 8 };
    const result = generateAISchedule(employees, 'A', opts);
    expect(result.schedule['0']).toEqual(existingSchedule['0']);
    const reviewed = reviewScheduleDraft(employees, 'A', { ...result, sourceSchedule: existingSchedule }, opts);
    expect(reviewed.blockers.some(f => f.message.includes('vượt quỹ 8h'))).toBe(true);
  });
});
