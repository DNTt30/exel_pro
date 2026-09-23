import { db } from './client';
import { scheduleVersion, withScheduleVersion } from '../../utils/scheduleVersion';

// Lấy lịch làm việc của 1 tuần
export async function getSchedulesByWeek(weekDate, opts = {}) {
  if (opts.empIds && opts.empIds.length === 0) return {};
  let q = db().from('schedules').select('emp_id,shifts,version').eq('week_date', weekDate);
  if (opts.empId) q = q.eq('emp_id', opts.empId);
  else if (opts.empIds?.length) q = q.in('emp_id', opts.empIds);
  const { data, error } = await q;
  if (error) {
    console.error('Lỗi lấy lịch làm việc:', error);
    throw error;
  }
  
  const scheduleMap = {};
  (data || []).forEach(row => {
    scheduleMap[row.emp_id] = withScheduleVersion(row.shifts || {}, row.version);
  });
  return scheduleMap;
}

// Lấy lịch làm việc của NHIỀU tuần trong 1 query duy nhất (chống N+1 query)
export async function getSchedulesByWeeks(weekDates = [], opts = {}) {
  const uniqueWeeks = [...new Set(weekDates.filter(Boolean))];
  if (uniqueWeeks.length === 0) return {};
  if (opts.empIds && opts.empIds.length === 0) return {};

  let q = db().from('schedules').select('week_date,emp_id,shifts,version').in('week_date', uniqueWeeks);
  if (opts.empId) q = q.eq('emp_id', opts.empId);
  else if (opts.empIds?.length) q = q.in('emp_id', opts.empIds);

  const { data, error } = await q;
  if (error) {
    console.error('Lỗi lấy lịch làm việc theo nhiều tuần:', error);
    throw error;
  }

  const result = {};
  uniqueWeeks.forEach(w => {
    result[w] = {};
  });

  (data || []).forEach(row => {
    if (!result[row.week_date]) result[row.week_date] = {};
    result[row.week_date][row.emp_id] = withScheduleVersion(row.shifts || {}, row.version);
  });

  return result;
}

// Lưu/Cập nhật toàn bộ lịch của 1 nhân viên trong 1 tuần (có optimistic versioning)
export async function saveEmployeeSchedule(weekDate, empId, shifts, opts = {}) {
  // 1. Gọi RPC save_employee_schedule (Row Lock + Optimistic Versioning)
  const { data: rpcVer, error: rpcErr } = await db().rpc('save_employee_schedule', {
    p_week_date: weekDate,
    p_emp_id: empId,
    p_shifts: shifts,
    p_expect_version: opts.expectVersion ?? scheduleVersion(shifts)
  });

  if (!rpcErr) {
    withScheduleVersion(shifts, rpcVer);
    return rpcVer;
  }

  const msg = String(rpcErr.message || '');
  if (rpcErr.code === '40001' || /40001|CONFLICT/i.test(msg)) {
    const err = new Error(msg);
    err.code = 'CONFLICT';
    throw err;
  }

  console.error('Lỗi lưu lịch làm việc (RPC):', rpcErr);
  const err = new Error(msg);
  err.code = 'DATABASE_ERROR';
  throw err;
}

// Lưu HÀNG LOẠT lịch của nhiều nhân viên.
// Phase 3: ưu tiên RPC upsert_schedules_bulk — ATOMIC + optimistic locking (expect_version).
// Sai version → lỗi code CONFLICT để UI báo người dùng thay vì ghi đè im lặng.
export async function saveBulkEmployeeSchedules(weekDate, scheduleMap, opts = {}) {
  const payload = Object.entries(scheduleMap).map(([empId, shifts]) => ({
    week_date: weekDate,
    emp_id: empId,
    shifts,
    expect_version: opts.expectVersions?.[empId] ?? scheduleVersion(shifts)
  }));

  if (payload.length === 0) return;

  const { data, error } = await db().rpc('upsert_schedules_bulk', { p_rows: payload });
  if (!error) {
    (data || []).forEach(row => withScheduleVersion(scheduleMap[row.o_emp_id], row.o_version));
    return data;
  }

  const msg = String(error.message || '');
  if (error.code === '40001' || /40001|CONFLICT/i.test(msg)) {
    const err = new Error(msg);
    err.code = 'CONFLICT';
    throw err;
  }
  console.error('Lỗi lưu lịch hàng loạt (RPC):', error);
  const err = new Error(msg);
  err.code = 'DATABASE_ERROR';
  throw err;
}
