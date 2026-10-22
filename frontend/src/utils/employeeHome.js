import { WEEK_DAYS, formatISODate } from '../data/constants';
import { normalizeShift, parseShiftTimeRange } from './shiftHelper';

export function homeWeek(now = new Date(), offset = 0) {
  const date = new Date(now);
  date.setDate(date.getDate() - (date.getDay() + 6) % 7 + offset * 7);
  return formatISODate(date);
}

// Do not wrap back to an earlier day or present a registration as an assigned shift.
export function closestAssignedShift(shifts, week, now = new Date()) {
  const candidates = WEEK_DAYS.flatMap((day, index) => {
    const cell = normalizeShift(shifts?.[day]);
    if (!cell.confirmed) return [];
    const ranges = cell.shift.split('/').map(code => parseShiftTimeRange(code.trim())).filter(Boolean);
    if (!ranges.length) return [];
    const base = new Date(`${week}T00:00:00`);
    base.setDate(base.getDate() + index);
    return ranges.map(range => {
      const start = new Date(base), end = new Date(base);
      start.setMinutes(range.start * 60); end.setMinutes(range.end * 60);
      return { ...cell, day, date: formatISODate(base), start, end };
    });
  }).filter(item => item.end > now).sort((a, b) => a.start - b.start);
  return candidates[0] || null;
}

// Full dates handle overnight/split shifts and boundaries between loaded weeks.
export function shiftCompanions({ schedule, employees, employeeId, store, shift }) {
  if (!shift) return { overlapping: [], next: [] };
  const intervals = [];
  for (const [week, rows] of Object.entries(schedule || {})) {
    for (const employee of employees || []) {
      if (employee.id === employeeId) continue;
      WEEK_DAYS.forEach((day, index) => {
        const cell = normalizeShift(rows[employee.id]?.[day]);
        if (!cell.confirmed || (cell.covering_store || employee.dept?.split(',')[0]?.trim()) !== store) return;
        for (const code of cell.shift.split('/')) {
          const range = parseShiftTimeRange(code.trim());
          if (!range) continue;
          const start = new Date(`${week}T00:00:00`); start.setDate(start.getDate() + index); start.setMinutes(range.start * 60);
          const end = new Date(`${week}T00:00:00`); end.setDate(end.getDate() + index); end.setMinutes(range.end * 60);
          intervals.push({ id: employee.id, name: employee.name, code: code.trim(), start, end });
        }
      });
    }
  }
  const overlapping = intervals.filter(item => item.start < shift.end && item.end > shift.start);
  const later = intervals.filter(item => item.start >= shift.end).sort((a, b) => a.start - b.start);
  return { overlapping, next: later.filter(item => item.start.getTime() === later[0]?.start.getTime()) };
}
