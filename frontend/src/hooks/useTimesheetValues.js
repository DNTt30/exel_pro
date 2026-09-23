import { useCallback, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { scheduledAttendanceValue, actualAttendanceValue } from '../utils/timesheetValues';
import { toast } from '../utils/toast';

export function useTimesheetValues(cycleDates) {
  const schedule = useStore(s => s.schedule);
  const attendance = useStore(s => s.attendance);
  const ensureWeeksLoaded = useStore(s => s.ensureWeeksLoaded);
  const loadAttendanceRange = useStore(s => s.loadAttendanceRange);
  const cells = useMemo(() => new Map(cycleDates.map(cell => [cell.key, cell])), [cycleDates]);
  useEffect(() => {
    ensureWeeksLoaded(cycleDates.map(cell => cell.weekKey)).catch(() => toast.error('Không tải được lịch chấm công. Vui lòng thử lại.'));
    if (cycleDates.length) loadAttendanceRange(cycleDates[0].fullDateStr, cycleDates.at(-1).fullDateStr);
  }, [cycleDates, ensureWeeksLoaded, loadAttendanceRange]);
  const getDayValue = useCallback((empId, day) => {
    const cell = cells.get(day);
    return cell ? scheduledAttendanceValue(schedule[cell.weekKey]?.[empId]?.[cell.dayKey]) : '';
  }, [cells, schedule]);
  const getActualValue = useCallback((empId, day) => {
    const cell = cells.get(day);
    return cell ? actualAttendanceValue(attendance[`${empId}|${cell.fullDateStr}`]) : '';
  }, [cells, attendance]);
  const getEffectiveValue = useCallback((empId, day) => {
    const actual = getActualValue(empId, day);
    return actual === '' ? getDayValue(empId, day) : actual;
  }, [getDayValue, getActualValue]);
  return { getDayValue, getActualValue, getEffectiveValue };
}
