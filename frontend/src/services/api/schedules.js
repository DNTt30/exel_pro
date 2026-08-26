import { db } from './client';

// Lấy lịch làm việc của 1 tuần
export async function getSchedulesByWeek(weekDate, opts = {}) {
  if (opts.empIds && opts.empIds.length === 0) return {};
  let q = db().from('schedules').select('emp_id,shifts').eq('week_date', weekDate);
  if (opts.empId) q = q.eq('emp_id', opts.empId);
  else if (opts.empIds?.length) q = q.in('emp_id', opts.empIds);
  const { data, error } = await q;
  if (error) {
    console.error('Lỗi lấy lịch làm việc:', error);
    return {};
  }
  
  const scheduleMap = {};
  (data || []).forEach(row => {
    scheduleMap[row.emp_id] = row.shifts || {};
  });
  return scheduleMap;
}

// Lưu/Cập nhật toàn bộ lịch của 1 nhân viên trong 1 tuần
export async function saveEmployeeSchedule(weekDate, empId, shifts) {
  const { error } = await db().from('schedules').upsert({
    week_date: weekDate,
    emp_id: empId,
    shifts: shifts
  }, { onConflict: 'week_date,emp_id' });
  
  if (error) {
    console.error('Lỗi lưu lịch làm việc:', error);
    throw error;
  }
}

// Lưu HÀNG LOẠT lịch của nhiều nhân viên.
// Phase 3: ưu tiên RPC upsert_schedules_bulk — ATOMIC + optimistic locking (expect_version).
// Sai version → lỗi code CONFLICT để UI báo người dùng thay vì ghi đè im lặng.
// Nếu function chưa tồn tại trên DB (chưa chạy sql_phase3) → fallback upsert cũ.
export async function saveBulkEmployeeSchedules(weekDate, scheduleMap, opts = {}) {
  const payload = Object.entries(scheduleMap).map(([empId, shifts]) => ({
    week_date: weekDate,
    emp_id: empId,
    shifts,
    expect_version: opts.expectVersions?.[empId] ?? null
  }));

  if (payload.length === 0) return;

  const { data, error } = await db().rpc('upsert_schedules_bulk', { p_rows: payload });
  if (!error) return data;

  const msg = String(error.message || '');
  if (/40001|CONFLICT/i.test(msg)) {
    const err = new Error(msg);
    err.code = 'CONFLICT';
    throw err;
  }
  if (!/schema cache|could not find the function|404/i.test(msg)) {
    console.error('Lỗi lưu lịch hàng loạt (RPC):', error);
    const err = new Error(msg);
    err.code = 'DATABASE_ERROR';
    throw err;
  }

  // Fallback tương thích: DB chưa có function Phase 3
  const { error: upErr } = await db().from('schedules').upsert(
    payload.map((row) => ({ week_date: row.week_date, emp_id: row.emp_id, shifts: row.shifts })),
    { onConflict: 'week_date,emp_id' }
  );
  if (upErr) {
    console.error('Lỗi lưu lịch làm việc hàng loạt:', upErr);
    throw upErr;
  }
}