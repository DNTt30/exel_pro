import { SCHEDULE_RULES, WEEK_DAYS } from '../data/constants';
import { generateAISchedule } from './aiSchedulerEngine';
import { analyzeEmployeeWeek } from './scheduleConflicts';
import { getShiftHours, normalizeShift, countConfirmedShifts } from './shiftHelper';
import { scheduleVersion } from './scheduleVersion';
import { storeWeeklyHours, resolveStoreHoursLimit } from './storeHours';

const canonical = value => JSON.stringify(value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, JSON.parse(canonical(value[key]))])) : value ?? null);
export const draftSourceVersions = source => Object.fromEntries(Object.entries(source).map(([id, row]) => [id, scheduleVersion(row)]));
export const draftSourceMatches = (payload, source) => canonical(payload.sourceSchedule) === canonical(source)
  && canonical(payload.sourceVersions) === canonical(draftSourceVersions(source));

export const draftCellEditable = raw => {
  const cell = normalizeShift(raw);
  return cell.registered && !cell.confirmed && !cell.covering_store && getShiftHours(cell.shift) > 0;
};

// Read-only evaluation uses the same interval coverage and conflict rules as generation.
export function reviewScheduleDraft(employees, storeId, draft, options) {
  const source = draft.sourceSchedule;
  const findings = [];
  const limit = resolveStoreHoursLimit(storeId, options);
  const hours = storeWeeklyHours(employees, { ...source, ...draft.schedule }, storeId);
  if (limit != null && hours > limit) findings.push({ message: `Cửa hàng ${storeId}: đã xếp ${hours}h, vượt quỹ ${limit}h/tuần (${hours - limit}h).`, severity: 'ERROR' });
  const locals = employees.filter(e => e.dept === storeId && e.isActive !== false);
  const max = options.maxShiftsPerEmployee ?? SCHEDULE_RULES.MAX_CONFIGURABLE_SHIFTS_PER_WEEK;
  if (!Number.isInteger(max) || max < 0 || max > SCHEDULE_RULES.MAX_CONFIGURABLE_SHIFTS_PER_WEEK) {
    throw new Error('Giới hạn ca phải là số nguyên từ 0 đến 7.');
  }
  for (const matrix of Object.values(options.requiredMatrixByDay || {})) {
    if (Object.values(matrix).some(n => !Number.isInteger(n) || n < 0)) throw new Error('Số người cần mỗi ca phải là số nguyên không âm.');
  }
  for (const emp of locals) {
    const shifts = draft.schedule[emp.id] || source[emp.id] || {};
    for (const day of WEEK_DAYS) {
      const before = source[emp.id]?.[day];
      const after = shifts[day];
      if (canonical(before) === canonical(after)) continue;
      if (!draftCellEditable(before) || after !== normalizeShift(before).shift) findings.push({ message: `${emp.name} · ${day}: chỉ được chọn đúng ca đăng ký; giữ nguyên ca đã chốt, OFF và ngày trống.`, severity: 'ERROR' });
    }
    const count = countConfirmedShifts(shifts);
    if (count > max) findings.push({ message: `${emp.name}: ${count} ca vượt giới hạn ${max} ca/tuần.`, severity: 'ERROR' });
    findings.push(...analyzeEmployeeWeek({ ...emp, empId: emp.id, shifts, previousWeekShifts: options.previousWeekSchedule?.[emp.id], nextWeekShifts: options.nextWeekSchedule?.[emp.id] }).map(f => ({ ...f, message: `${emp.name}: ${f.message}` })));
  }
  if (Object.keys(draft.schedule).some(id => !locals.some(emp => emp.id === id))) throw new Error('Bản nháp chứa nhân viên ngoài cửa hàng.');
  const result = generateAISchedule(employees, storeId, { ...options, existingSchedule: { ...source, ...draft.schedule }, reviewOnly: true });
  result.newAssignments = locals.reduce((n, emp) => n + WEEK_DAYS.filter(day => draftCellEditable(source[emp.id]?.[day]) && normalizeShift(draft.schedule[emp.id]?.[day]).confirmed).length, 0);
  return { ...result, schedule: draft.schedule, sourceSchedule: source, findings, blockers: findings.filter(f => ['ERROR', 'BLOCKER'].includes(f.severity)) };
}
