import { SKILL_ANALYTICS_RULES, WEEK_DAYS } from '../data/constants';
import { normalizeShift, getShiftHours, parseShiftTimeRange } from './shiftHelper';
import { isNightReady, offsetWeek } from './employeeSkills';

export function analyticsWeeks(currentWeek) {
  return Array.from({ length: SKILL_ANALYTICS_RULES.HISTORY_WEEKS }, (_, i) => offsetWeek(currentWeek, -i - 1));
}

// Each confirmed shift segment counts once, including work covering another store.
export function buildShiftAnalytics(employees, history, weeks, asOf) {
  const cutoff = new Date(`${asOf}T00:00:00Z`).getTime();
  return employees.filter(emp => emp.isActive !== false).map(emp => {
    let night = 0, day = 0;
    for (const week of weeks) {
      for (const key of WEEK_DAYS) {
        const cell = normalizeShift(history[week]?.[emp.id]?.[key]);
        if (!cell.confirmed || !cell.shift || cell.shift === 'off') continue;
        for (const code of cell.shift.split('/')) {
          if (getShiftHours(code.trim()) <= 0) continue;
          const range = parseShiftTimeRange(code.trim());
          if (!range) continue;
          // A shift that crosses midnight, starts after 22:00, or starts before 06:00.
          if (range.end > 24 || range.start >= 22 || range.start < 6) night++;
          else day++;
        }
      }
    }
    const total = night + day;
    const created = emp.createdAt ? new Date(emp.createdAt).getTime() : NaN;
    const longTenured = Number.isFinite(created) && (cutoff - created) / 86400000 >= SKILL_ANALYTICS_RULES.TENURE_DAYS;
    return { employee: emp, night, day, total, nightPercent: total ? Math.round(night / total * 100) : null,
      needsTraining: ['STFT', 'STPT'].includes(emp.type) && longTenured && total > 0 && night === 0 && !isNightReady(emp) };
  });
}
