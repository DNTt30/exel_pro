import { describe, expect, it } from 'vitest';
import { generateAISchedule } from '../utils/aiSchedulerEngine';
import { reviewScheduleDraft, draftSourceMatches, draftSourceVersions } from '../utils/scheduleDraft';
import { withScheduleVersion } from '../utils/scheduleVersion';
import { createAgentFixture, createSandboxDraftRepository, NEXT_WEEK } from '../sandbox/fixture';
import { buildStaffingByDay } from '../data/constants';

const fixture = createAgentFixture();
const source = fixture.schedule[NEXT_WEEK];
const options = { existingSchedule: source, currentWeek: NEXT_WEEK, requiredMatrixByDay: buildStaffingByDay(fixture.stores[0]), maxShiftsPerEmployee: 6 };
const generate = extra => generateAISchedule(fixture.employees, 'TEST01', { ...options, ...extra });

describe('persisted schedule proposals', () => {
  it('checks source revisions after a JSON roundtrip without depending on JSONB key order', () => {
    const current = { a: withScheduleVersion({ T2: { shift: '6-14', registered: true, confirmed: false } }, 4) };
    const payload = { sourceSchedule: { a: { T2: { confirmed: false, registered: true, shift: '6-14' } } }, sourceVersions: draftSourceVersions(current) };
    expect(draftSourceMatches(JSON.parse(JSON.stringify(payload)), current)).toBe(true);
    withScheduleVersion(current.a, 5);
    expect(draftSourceMatches(payload, current)).toBe(false);
  });
  it('reuses registration scheduler: 30 shifts, 6 per employee, no shortages/conflicts', () => {
    const result = generate();
    const reviewed = reviewScheduleDraft(fixture.employees, 'TEST01', { ...result, sourceSchedule: source }, options);
    expect(result.newAssignments).toBe(30);
    expect(Object.values(result.employeeShiftsCount)).toEqual([6, 6, 6, 6, 6]);
    expect(reviewed.shortages).toEqual([]);
    expect(reviewed.findings).toEqual([]);
    expect(fixture.schedule[NEXT_WEEK]).toEqual(source);
  });
  it('reports the max-shift reason and leaves unselected registrations intact', () => {
    const result = generate({ maxShiftsPerEmployee: 1 });
    expect(result.newAssignments).toBe(5);
    expect(result.warnings.join(' ')).toContain('giới hạn 1 ca');
  });
  it('rejects tampered cells, overlaps and weekly caps', () => {
    const result = generate();
    const id = fixture.employees[0].id;
    result.schedule[id].T2 = '6-14/10-18';
    const reviewed = reviewScheduleDraft(fixture.employees, 'TEST01', { ...result, sourceSchedule: source }, { ...options, maxShiftsPerEmployee: 1 });
    expect(reviewed.blockers.some(f => f.code === 'OVERLAPPING_SHIFTS')).toBe(true);
    expect(reviewed.blockers.some(f => f.message.includes('chỉ được chọn đúng ca'))).toBe(true);
    expect(reviewed.blockers.some(f => f.message.includes('vượt giới hạn'))).toBe(true);
  });
  it('checks adjacent-week overlap before saving', () => {
    const result = generate();
    const id = fixture.employees.find(emp => result.schedule[emp.id].T2 === '6-14').id;
    const reviewed = reviewScheduleDraft(fixture.employees, 'TEST01', { ...result, sourceSchedule: source }, { ...options, previousWeekSchedule: { [id]: { CN: '22-8' } } });
    expect(reviewed.blockers.some(f => f.code === 'OVERLAPPING_SHIFTS')).toBe(true);
  });
  it('edits re-evaluate coverage without auto-refilling a removed shift', () => {
    const result = generate();
    const id = fixture.employees[0].id;
    result.schedule[id].T7 = source[id].T7;
    const reviewed = reviewScheduleDraft(fixture.employees, 'TEST01', { ...result, sourceSchedule: source }, options);
    expect(reviewed.shortages).toMatchObject([{ day: 'T7', actual: 4, required: 5 }]);
    expect(reviewed.newAssignments).toBe(29);
  });
  it('uses one durable record, prevents stale writes and reports storage failures', async () => {
    const map = new Map();
    const repository = createSandboxDraftRepository({ getItem: key => map.get(key), setItem: (key, value) => map.set(key, value) });
    const payload = { schedule: generate().schedule, sourceSchedule: source };
    await repository.save('TEST01', NEXT_WEEK, payload, 0);
    await expect(repository.save('TEST01', NEXT_WEEK, payload, 0)).rejects.toThrow('đã thay đổi');
    await repository.save('TEST01', NEXT_WEEK, payload, 1);
    expect(map.size).toBe(1);
    expect((await repository.load('TEST01', NEXT_WEEK)).revision).toBe(2);
    const broken = createSandboxDraftRepository({ getItem: () => null, setItem: () => { throw new Error('quota'); } });
    await expect(broken.save('TEST01', NEXT_WEEK, payload, 0)).rejects.toThrow('quota');
  });
});
