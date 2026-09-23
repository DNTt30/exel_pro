import { normalizeShift, getShiftHours } from './shiftHelper';

export function scheduledAttendanceValue(raw) {
  const { shift, confirmed } = normalizeShift(raw);
  if (!shift || !confirmed) return '';
  if (shift === 'off') return 'OFF';
  const hours = getShiftHours(shift);
  return hours > 0 ? String(hours) : shift;
}

export function actualAttendanceValue(record) {
  if (!record) return '';
  if (record.note?.trim()) return record.note.trim().toUpperCase();
  return record.actualHours != null && Number.isFinite(Number(record.actualHours)) ? String(record.actualHours) : '';
}

export function timesheetHours(value) {
  const code = String(value ?? '').trim().toUpperCase();
  if (code === 'AL' || code === 'PL') return 8;
  if (code === 'AL_H' || code === 'PL_H') return 4;
  const numeric = Number(code.replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function movePayrollCycle(cycle, offset) {
  const date = new Date(cycle.year, cycle.month - 1 + offset, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}
