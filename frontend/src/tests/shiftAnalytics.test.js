import { it, expect } from 'vitest';
import { analyticsWeeks, buildShiftAnalytics } from '../utils/shiftAnalytics';
const week = '2026-09-21';
const emp = { id: 'a', type: 'STPT', createdAt: '2026-01-01', skills: [] };
const analyze = (shifts, employee = emp) => buildShiftAnalytics([employee], { [week]: { a: shifts } }, [week], '2026-09-28')[0];

it('counts confirmed day/night segments including legacy and object covering cells', () => {
  const row = analyze({ T2: '6-14', T3: '22-6_B', T4: { shift: '22-6', covering_store: 'C' }, T5: { shift: '22-6', confirmed: false }, T6: 'off', T7: '', CN: '14-22/22-6' });
  expect(row).toMatchObject({ night: 3, day: 2, total: 5, nightPercent: 60, needsTraining: false });
});
it('finds long-tenured untrained STPT/STFT but does not infer from missing history or creation date', () => {
  expect(analyze({ T2: '6-14' }).needsTraining).toBe(true);
  expect(analyze({ T2: '6-14' }, { ...emp, type: 'STFT' }).needsTraining).toBe(true);
  expect(analyze({}).nightPercent).toBeNull();
  expect(analyze({}).needsTraining).toBe(false);
  for (const extra of [{ createdAt: null }, { createdAt: '2026-09-01' }, { skills: ['NIGHT_READY'] }, { type: 'SM' }]) {
    expect(analyze({ T2: '6-14' }, { ...emp, ...extra }).needsTraining).toBe(false);
  }
});
it('uses exactly eight completed weeks, crosses years, and excludes inactive people', () => {
  expect(analyticsWeeks('2026-01-05')).toHaveLength(8);
  expect(analyticsWeeks('2026-01-05')[0]).toBe('2025-12-29');
  expect(buildShiftAnalytics([{ ...emp, isActive: false }], {}, [week], '2026-09-28')).toEqual([]);
});
