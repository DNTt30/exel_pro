import { expect, it } from 'vitest';
import { employeeWeekProgress } from '../utils/shiftHelper';
import { homeWeek, closestAssignedShift } from '../utils/employeeHome';

it('separates pending registration from assigned work and OFF from blank days', () => {
  expect(employeeWeekProgress({ T2: { shift: '6-10', registered: true }, T3: '14-22', T4: 'off', T5: { shift: '22-6', covering_store: 'B' }, T6: { shift: '6-10/14-18', registered: true } })).toEqual({ registeredHours: 12, registeredDays: 2, assignedHours: 16, assignedDays: 2, blankDays: 2, offDays: 1 });
});
it('handles Sunday and year boundaries without UTC date shifts', () => {
  expect(homeWeek(new Date(2027, 0, 3, 12))).toBe('2026-12-28');
  expect(homeWeek(new Date(2027, 0, 3, 12), 1)).toBe('2027-01-04');
});
it('does not wrap to a past shift or label pending availability as the next shift', () => {
  expect(closestAssignedShift({ T2: '6-14', T6: { shift: '6-14', registered: true } }, '2026-10-19', new Date(2026, 9, 22, 12))).toBeNull();
});
it('includes an ongoing overnight shift and finds future weeks by full date', () => {
  expect(closestAssignedShift({ T4: '22-6_B' }, '2026-10-19', new Date(2026, 9, 22, 2))).toMatchObject({ day: 'T4', date: '2026-10-21', covering_store: 'B' });
  expect(closestAssignedShift({ T2: '6-14' }, '2026-10-26', new Date(2026, 9, 22, 12))).toMatchObject({ day: 'T2', date: '2026-10-26' });
});
