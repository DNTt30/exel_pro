import { db } from './client';

// --- ATTENDANCE (cong thuc te tu ezHR, SM nhap tay) ---
function mapRow(r) {
  if (!r) return null;
  return { empId: r.emp_id, workDate: r.work_date, actualHours: Number(r.actual_hours || 0), note: r.note || '' };
}

/** Lấy công thực tế trong khoảng ngày ISO [from, to] */
export async function getAttendanceRange(fromDate, toDate) {
  const { data, error } = await db().from('attendance')
    .select('emp_id,work_date,actual_hours,note')
    .gte('work_date', fromDate)
    .lte('work_date', toDate);
  if (error) { console.error('Lỗi tải công thực tế:', error); return []; }
  return (data || []).map(mapRow).filter(Boolean);
}

/** Upsert hàng loạt (bulk) công thực tế */
export async function upsertAttendanceRows(rows) {
  if (!rows || !rows.length) return;
  const payload = rows.map(r => ({
    emp_id: r.empId,
    work_date: r.workDate,
    actual_hours: r.actualHours ?? 0,
    note: r.note || null,
    updated_by: r.updatedBy || null,
    updated_at: new Date().toISOString()
  }));
  const { error } = await db().from('attendance').upsert(payload, { onConflict: 'emp_id,work_date' });
  if (error) throw error;
}