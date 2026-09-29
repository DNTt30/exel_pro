import { describe, it, expect } from 'vitest';
import { generateAISchedule } from '../utils/aiSchedulerEngine';
import { managedStoreIds, toggleNightReady } from '../utils/employeeSkills';
import { normalizeShift } from '../utils/shiftHelper';
import { WEEK_DAYS } from '../data/constants';

const worker = (id, dept = 'A', skills = []) => ({ id, name: id, dept, skills, type: 'STPT', maxH: 16 });
const offWeek = () => Object.fromEntries(WEEK_DAYS.map(d => [d, 'off']));
const trainee = worker('trainee');
const mentor = worker('mentor', 'B', ['NIGHT_READY']);
const options = (extra = {}) => ({ requiredMatrix: {}, requiredMatrixByDay: { T2: { '22-6': 1 } },
  employeeOverrides: { trainee: { T2: '22-6' } }, currentWeek: '2026-09-28',
  user: { id: 'sm', role: 'SM', dept: 'A,B' }, stores: [{ id: 'A' }, { id: 'B' }],
  existingSchedule: { mentor: offWeek() }, previousWeekSchedule: {}, nextWeekSchedule: {}, ...extra });

describe('Night Ready buddy system and pooling', () => {
  it('adds a local certified mentor even when the staffing minimum is already met', () => {
    const result = generateAISchedule([trainee, { ...mentor, dept: 'A' }], 'A', options({ existingSchedule: {} }));
    expect(result.schedule.trainee.T2).toBe('22-6');
    expect(result.schedule.mentor.T2).toBe('22-6');
    expect(result.criticalInsights).toEqual([]);
    expect(result.borrowedAssignments).toEqual([]);
  });
  it('warns in red insights when seniority or FT title is the only qualification', () => {
    const result = generateAISchedule([{ ...trainee, experienceMonths: 24 }], 'A', options());
    expect(result.criticalInsights).toContain('⚠️ Cảnh báo: Ca đêm Thứ 2 đang thiếu người cứng (Night Ready), rủi ro vận hành cao!');
    expect(result.insights).toEqual(expect.arrayContaining(result.criticalInsights));
  });
  it('borrows an OFF mentor, preserves the home store and every other cell', () => {
    const opts = options();
    opts.existingSchedule.mentor.T5 = { shift: '6-14', covering_store: 'C' };
    const before = structuredClone(opts);
    const result = generateAISchedule([trainee, mentor], 'A', opts);
    expect(result.schedule.mentor).toEqual({ ...before.existingSchedule.mentor, T2: { shift: '22-6', covering_store: 'A' } });
    expect(mentor.dept).toBe('B');
    expect(opts).toEqual(before);
    expect(result.employeeHours.mentor).toBe(16);
    expect(result.stats.totalHours).toBe(16); // trainee + mentor at A; excludes donor's 8h at C
    expect(result.stats.totalShifts).toBe(2);
    expect(result.criticalInsights).toEqual([]);
  });
  it.each(['', '6-14', { shift: 'off', covering_store: 'C' }])('does not treat a blank/busy/covered cell as OFF: %j', cell => {
    const existingSchedule = { mentor: { ...offWeek(), T2: cell } };
    expect(generateAISchedule([trainee, mentor], 'A', options({ existingSchedule })).borrowedAssignments).toEqual([]);
  });
  it.each([
    { user: { id: 'sm', role: 'SM', dept: 'A' } },
    { user: { id: 'sm', role: 'SM', dept: '' } },
    { user: { id: 'staff', role: 'STPT', dept: 'A,B' } },
    { scheduleWeeks: { 'B::2026-09-28': { status: 'approved' } } },
    { stores: [{ id: 'A' }, { id: 'B', is_active: false }] },
    { nextWeekSchedule: undefined },
  ])('excludes unauthorized, locked or incompletely loaded pool: %j', extra => {
    expect(generateAISchedule([trainee, mentor], 'A', options(extra)).borrowedAssignments).toEqual([]);
  });
  it('rejects locked target weeks and inactive mentors', () => {
    expect(() => generateAISchedule([trainee, mentor], 'A', options({ scheduleWeeks: { 'A::2026-09-28': { status: 'pending' } } }))).toThrow();
    expect(generateAISchedule([trainee, { ...mentor, isActive: false }], 'A', options()).borrowedAssignments).toEqual([]);
  });
  it('checks total weekly hours including other stores', () => {
    const existingSchedule = { mentor: { ...offWeek(), T5: '6-14', T6: { shift: '6-14', covering_store: 'C' } } };
    expect(generateAISchedule([trainee, mentor], 'A', options({ existingSchedule })).borrowedAssignments).toEqual([]);
  });
  it('checks following shifts including the next week boundary', () => {
    const existingSchedule = { mentor: { ...offWeek(), T3: '6-14' } };
    expect(generateAISchedule([trainee, mentor], 'A', options({ existingSchedule })).borrowedAssignments).toEqual([]);
    const sunday = options({ requiredMatrixByDay: { CN: { '22-6': 1 } }, employeeOverrides: { trainee: { CN: '22-6' } }, nextWeekSchedule: { mentor: { T2: '14-22' } } });
    expect(generateAISchedule([trainee, mentor], 'A', sunday).borrowedAssignments).toEqual([]);
  });
  it('preserves outbound shifts when calculating available hours and rest', () => {
    const existingSchedule = { trainee: { T2: { shift: '22-6', covering_store: 'B' } }, mentor: offWeek() };
    const result = generateAISchedule([trainee, mentor], 'A', options({ existingSchedule }));
    expect(result.schedule.trainee.T2).toEqual(existingSchedule.trainee.T2);
    expect(normalizeShift(result.schedule.trainee.T3).shift).not.toBe('6-14');
    expect(result.employeeHours.trainee).toBeLessThanOrEqual(16);
  });
  it('uses existing inbound certified support without borrowing another person', () => {
    const existingSchedule = { mentor: { ...offWeek(), T2: { shift: '22-6', covering_store: 'A' } } };
    const result = generateAISchedule([trainee, mentor], 'A', options({ existingSchedule }));
    expect(result.borrowedAssignments).toEqual([]);
    expect(result.criticalInsights).toEqual([]);
  });
  it('never inherits broad visibility when user has no management scope', () => {
    expect(managedStoreIds(null, [{ id: 'A' }])).toEqual([]);
    expect(managedStoreIds({ id: 'admin', role: 'admin' }, [{ id: 'A' }, { id: 'B', is_active: false }])).toEqual(['A']);
    expect(toggleNightReady(['CASHIER', 'NIGHT_READY'], false)).toEqual(['CASHIER']);
  });
});
