import { describe, expect, it } from 'vitest';
import { dashboardCycleDates, dashboardWeekOptions, payrollMonthKey, switchDashboardPeriod } from '../utils/dashboardPeriod';

describe('Dashboard payroll period navigation', () => {
  it('uses the 26–25 payroll cycle, including year rollover and leap February', () => {
    expect(payrollMonthKey('2026-12-26')).toBe('2027-01');
    const dates = dashboardCycleDates('2024-03');
    expect(dates).toHaveLength(29);
    expect(dates[0].fullDateStr).toBe('2024-02-26');
    expect(dates.at(-1).fullDateStr).toBe('2024-03-25');
    expect(new Set(dates.map(d => d.key)).size).toBe(dates.length);
  });
  it('keeps the selected week if it overlaps the month being viewed', () => {
    expect(switchDashboardPeriod('week', '2026-10', '2026-10-05').week).toBe('2026-10-05');
  });
  it('moves an unrelated week into the selected historical month', () => {
    expect(switchDashboardPeriod('week', '2026-08', '2026-10-05', new Date(2026, 9, 4))).toEqual({ month: '2026-08', week: '2026-07-20' });
  });
  it('preserves the month when toggling a boundary week back and forth', () => {
    const next = switchDashboardPeriod('week', '2026-08', '2026-10-05', new Date(2026, 9, 4));
    expect(switchDashboardPeriod('month', next.month, next.week).month).toBe('2026-08');
  });
  it('follows a newly selected week into its corresponding month', () => {
    expect(switchDashboardPeriod('month', '2026-08', '2026-12-28').month).toBe('2027-01');
  });
  it('offers unloaded weeks and always includes the selected week with both dates', () => {
    const options = dashboardWeekOptions('2026-10', '2027-01-04');
    expect(options.some(w => w.key === '2026-09-28')).toBe(true);
    expect(options.find(w => w.key === '2027-01-04').label).toContain('10/1/2027');
    expect(new Set(options.map(w => w.key)).size).toBe(options.length);
  });
});
