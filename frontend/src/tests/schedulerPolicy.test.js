import { describe, expect, it, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { scheduleRuleViolations } from '../utils/scheduleConflicts';
import { generateAISchedule } from '../utils/aiSchedulerEngine';
import { demandBreakdown } from '../utils/registeredScheduler';
import { createScheduleSlice } from '../store/slices/scheduleSlice';
import { weekRecordKey } from '../utils/scheduleWeek';
import * as api from '../services/api';
vi.mock('../services/api', () => ({ saveEmployeeSchedule: vi.fn(), saveBulkEmployeeSchedules: vi.fn() }));
vi.mock('../utils/toast', () => ({ toast: { error: vi.fn() } }));
const reg = shift => ({ shift, registered: true, confirmed: false });
const employee = { id: 'a', name: 'An', type: 'STFT', dept: 'A', isActive: true };
const violations = (shifts, previous, next) => scheduleRuleViolations(employee, shifts, previous, next);
const options = (existingSchedule, extra = {}) => ({ currentWeek: '2026-10-12', requiredMatrix: {}, requiredMatrixByDay: { T2: { '6-14': 1 } }, existingSchedule, ...extra });
beforeEach(() => vi.clearAllMocks());
describe('shared scheduling policy', () => {
  it.each([['9-17', true], ['10-18', false]])('checks exactly 12 hours, next shift %s', (shift, blocked) => {
    expect(violations({ T2: '14-22', T3: shift }).some(v => v.code === 'INSUFFICIENT_REST')).toBe(blocked);
  });
  it('rejects night four but allows night three, including split/partial night shifts', () => {
    expect(violations({ T2: '22-6', T3: '22-6', T4: '22-6' })).toEqual([]);
    expect(violations({ T2: '22-6', T3: '22-6', T4: '22-6', T5: '23-6' })).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CONSECUTIVE_NIGHTS', count: 4, limit: 3 })]));
  });
  it.each([
    [{ T2: '22-6' }, { T6: '22-6', T7: '22-6', CN: '22-6' }, undefined],
    [{ T7: '22-6', CN: '22-6' }, undefined, { T2: '22-6', T3: '22-6' }],
  ])('detects consecutive nights across either week boundary', (current, prev, next) => {
    expect(violations(current, prev, next).some(v => v.code === 'CONSECUTIVE_NIGHTS')).toBe(true);
  });
  it('ignores unconfirmed availability and resets night runs at a day off', () => {
    expect(violations({ T2: '22-6', T3: '22-6', T4: reg('22-6'), T5: '22-6', T6: 'off', T7: '22-6' })).toEqual([]);
  });
  it('cannot add a fourth night from a registration', () => {
    const source = { a: { T2: '22-6', T3: '22-6', T4: '22-6', T5: reg('22-6') } };
    const r = generateAISchedule([employee], 'A', options(source, { requiredMatrixByDay: { T5: { '22-6': 1 } } }));
    expect(r.newAssignments).toBe(0);
    expect(r.schedule).toEqual(source);
    expect(r.shortages[0].reason).toContain('4 đêm');
  });
  it('PT at 16h cannot accept 8h more even with a personal limit of 48', () => {
    const r = generateAISchedule([{ ...employee, type: 'STPT', maxH: 48 }], 'A', options({ a: { T2: reg('6-14'), T4: '6-14', T6: '6-14' } }));
    expect(r.newAssignments).toBe(0);
  });
  it('two registrations 6–10 cannot cover 10–14', () => {
    const r = generateAISchedule([employee, { ...employee, id: 'b' }], 'A', options({ a: { T2: reg('6-10') }, b: { T2: reg('6-10') } }, { requiredMatrixByDay: { T2: { '6-14': 2 } } }));
    expect(r.shortages).toMatchObject([{ shift: '10-14', missing: 2 }]);
  });
  it('reports surplus outside demand and does not remove confirmed shifts', () => {
    const source = { a: { T2: '6-14' }, b: { T2: '6-14' } };
    const r = generateAISchedule([employee, { ...employee, id: 'b' }], 'A', options(source, { requiredMatrixByDay: { T2: { '6-10': 1 } } }));
    expect(r.schedule).toEqual(source);
    expect(r.surpluses).toMatchObject([{ shift: '6-10', actual: 2, required: 1, excess: 1 }, { shift: '10-14', actual: 2, required: 0, excess: 2 }]);
  });
  it('explains base, revenue and manager additions without double counting', () => {
    const o = { baseMatrixByDay: { T2: { '18-22': 2 } }, requiredMatrixByDay: { T2: { '18-22': 3 } } };
    expect(demandBreakdown(o, 'T2', '18-22', 4)).toEqual({ base: 2, revenue: 1, notes: 1 });
    expect(demandBreakdown(o, 'T2', '18-22', 1)).toEqual({ base: 1, revenue: 0, notes: 0 });
  });
  it('rotates tied employees weekly, remains repeatable and input-order independent', () => {
    const staff = [employee, { ...employee, id: 'b' }];
    const o = options({ a: { T2: reg('6-14') }, b: { T2: reg('6-14') } });
    const first = generateAISchedule(staff, 'A', o).schedule;
    expect(generateAISchedule([...staff].reverse(), 'A', o).schedule).toEqual(first);
    expect(generateAISchedule(staff, 'A', { ...o, currentWeek: '2026-10-19' }).schedule).not.toEqual(first);
  });
  it('repairs a greedy choice to cover more hours without increasing surplus or violating rules', () => {
    const staff = ['a', 'b', 'c'].map(id => ({ ...employee, id, type: 'STPT' }));
    const source = Object.fromEntries([
      ['a', ['14-22', 'off', '10-14', '6-14']],
      ['b', ['10-14', '14-22', '14-22', '10-14']],
      ['c', ['10-14', '10-18', '6-14', '14-22']],
    ].map(([id, shifts]) => [id, Object.fromEntries(shifts.map((shift, i) => [`T${i + 2}`, reg(shift)]))]));
    const o = options(source, { requiredMatrixByDay: Object.fromEntries(['T2','T3','T4','T5'].map(day => [day, { '6-14': 1, '14-22': 1 }])) });
    const greedy = generateAISchedule(staff, 'A', { ...o, disableLocalRepair: true });
    const repaired = generateAISchedule(staff, 'A', o);
    const missing = result => result.shortages.reduce((sum, gap) => sum + gap.missing * (gap.end - gap.start), 0);
    const surplus = result => result.surpluses.reduce((sum, gap) => sum + gap.excess * (gap.end - gap.start), 0);
    expect(missing(repaired)).toBeLessThan(missing(greedy));
    expect(surplus(repaired)).toBeLessThanOrEqual(surplus(greedy));
    staff.forEach(emp => expect(scheduleRuleViolations(emp, repaired.schedule[emp.id])).toEqual([]));
    expect(generateAISchedule(staff, 'A', o).schedule).toEqual(repaired.schedule);
  });
  it('handles a 30-person week within an interactive time budget', () => {
    const staff = Array.from({ length: 30 }, (_, i) => ({ ...employee, id: String(i), type: i % 2 ? 'STPT' : 'STFT' }));
    const days = ['T2','T3','T4','T5','T6','T7','CN'];
    const source = Object.fromEntries(staff.map((emp, i) => [emp.id, Object.fromEntries(days.map((day, d) => [day, reg(['6-14', '14-22', '22-6'][(i + d) % 3])]))]));
    const start = performance.now();
    const result = generateAISchedule(staff, 'A', options(source, { requiredMatrix: { '6-14': 3, '14-22': 3, '22-6': 2 }, requiredMatrixByDay: {} }));
    expect(performance.now() - start).toBeLessThan(2000);
    expect(result.newAssignments).toBeGreaterThan(0);
    staff.forEach(emp => expect(scheduleRuleViolations(emp, result.schedule[emp.id])).toEqual([]));
  });
  it('suggests only registered support in management scope; never borrows automatically', () => {
    const staff = [employee, { ...employee, id: 'b', dept: 'B' }, { ...employee, id: 'c', dept: 'C' }, { ...employee, id: 'd', dept: 'B' }];
    const source = { b: { T2: reg('6-14') }, c: { T2: reg('6-14') }, d: { T2: 'off' } };
    const o = options(source, { user: { id: 'sm', role: 'employee', isManager: true, dept: 'A,B' }, stores: ['A','B','C'].map(id => ({ id })) });
    const r = generateAISchedule(staff, 'A', o);
    expect(r.supportSuggestions[0].candidates.map(c => c.employeeId)).toEqual(['b']);
    expect(r.borrowedAssignments).toEqual([]);
    expect(r.newAssignments).toBe(0);
    expect(source.b.T2).toEqual(reg('6-14'));
    expect(generateAISchedule(staff, 'A', { ...o, scheduleWeeks: { [weekRecordKey('B', '2026-10-12')]: { status: 'approved' } } }).supportSuggestions).toEqual([]);
  });
});

const makeStore = (role = 'admin') => create((set, get) => ({
  ...createScheduleSlice(set, get), user: { id: 'manager', role, dept: 'A', isManager: true }, _sessionEpoch: 1,
  employees: [employee], stores: [{ id: 'A' }], schedule: { '2026-10-12': { a: { T2: '22-6', T3: '22-6', T4: '22-6' } } },
  appendAdminLog: vi.fn().mockResolvedValue(), requestScheduleOverride: vi.fn().mockResolvedValue(null),
}));
describe('manual and bulk saves share scheduler checks', () => {
  it.each(['single', 'bulk'])('rolls back blocked %s edits without sending invalid data', async mode => {
    const s = makeStore('employee'), state = s.getState(), before = structuredClone(state.schedule);
    const pending = mode === 'single' ? state.updateShift('2026-10-12', 'a', 'T5', '22-6') : state.applyBulkSchedule('2026-10-12', { a: { ...before['2026-10-12'].a, T5: '22-6' } }, 'A');
    await expect(pending).rejects.toMatchObject({ code: 'SCHEDULE_RULES' });
    expect(s.getState().schedule).toEqual(before);
    expect(api.saveEmployeeSchedule).not.toHaveBeenCalled(); expect(api.saveBulkEmployeeSchedules).not.toHaveBeenCalled();
  });
  it('passes an explicit override to the server for authorization and audit', async () => {
    const s = makeStore(); s.getState().requestScheduleOverride.mockResolvedValue('Urgent coverage with management approval');
    await s.getState().updateShift('2026-10-12', 'a', 'T5', '22-6');
    expect(api.saveEmployeeSchedule).toHaveBeenCalledWith('2026-10-12', 'a', expect.objectContaining({ T5: '22-6' }), { overrideReason: 'Urgent coverage with management approval' });
  });
});
