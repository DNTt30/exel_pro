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

// Lưu HÀNG LOẠT lịch của nhiều nhân viên (giải quyết lỗi N+1 query)
export async function saveBulkEmployeeSchedules(weekDate, scheduleMap) {
  const payload = Object.entries(scheduleMap).map(([empId, shifts]) => ({
    week_date: weekDate,
    emp_id: empId,
    shifts: shifts
  }));

  if (payload.length === 0) return;

  const { error } = await db().from('schedules').upsert(payload, { onConflict: 'week_date,emp_id' });
  
  if (error) {
    console.error('Lỗi lưu lịch làm việc hàng loạt:', error);
    throw error;
  }
}

