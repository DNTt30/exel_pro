import { z } from 'zod';
import { attendanceRowSchema, isoDateSchema, employeeIdSchema } from '../../schemas/operationalSchemas';
import { db } from './client';

// --- ATTENDANCE (cong thuc te tu ezHR, SM nhap tay) ---
function mapRow(r) {
  if (!r) return null;
  return { empId: r.emp_id, workDate: r.work_date, actualHours: Number(r.actual_hours || 0), note: r.note || '' };
}

/** Lấy công thực tế trong khoảng ngày ISO [from, to] */
export async function getAttendanceRange(fromDate, toDate) {
  isoDateSchema.parse(fromDate); isoDateSchema.parse(toDate);
  if (fromDate > toDate) throw new Error('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
  const { data, error } = await db().rpc('get_attendance_audited', { p_from: fromDate, p_to: toDate });
  if (error) throw error;
  return (data || []).map(mapRow).filter(Boolean);
}

/** Removing an override is different from recording zero worked hours. */
export async function deleteAttendanceCell(empId, workDate) {
  employeeIdSchema.parse(empId); isoDateSchema.parse(workDate);
  const { error } = await db().from('attendance').delete().eq('emp_id', empId).eq('work_date', workDate);
  if (error) throw error;
}

/** Upsert hàng loạt (bulk) công thực tế */
export async function upsertAttendanceRows(rows) {
  if (!rows || !rows.length) return;
  z.array(attendanceRowSchema).max(10000).parse(rows);
  const payload = rows.map(r => ({
    emp_id: r.empId,
    work_date: r.workDate,
    actual_hours: (r.actualHours == null || isNaN(Number(r.actualHours))) ? 0 : Number(r.actualHours),
    note: r.note || null,
    updated_by: r.updatedBy || null,
    updated_at: new Date().toISOString()
  }));
  const { error } = await db().from('attendance').upsert(payload, { onConflict: 'emp_id,work_date' });
  if (error) throw error;
}
