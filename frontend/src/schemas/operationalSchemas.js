import { z } from 'zod';
import { WEEK_DAYS } from '../data/constants';
import { normalizeShift } from '../utils/shiftHelper';

export const isoDateSchema = z.iso.date('Ngày phải đúng định dạng YYYY-MM-DD.');
export const weekDateSchema = isoDateSchema.refine(value => new Date(`${value}T12:00:00Z`).getUTCDay() === 1, 'Tuần phải bắt đầu vào Thứ Hai.');
export const employeeIdSchema = z.string().trim().min(1).max(50);
export function validShiftCode(value) {
  const code = normalizeShift(value).shift;
  if (!code || code === 'off') return true;
  return code.split('/').every(part => {
    const m = /^(\d{1,2})-(\d{1,2})$/.exec(part.trim());
    if (!m) return false;
    const start = Number(m[1]), end = Number(m[2]);
    return start >= 0 && start < 24 && end >= 0 && end <= 24 && start !== end && !(start === 0 && end === 24);
  });
}
const shiftString = z.string().max(200).refine(validShiftCode, 'Mã ca hoặc khoảng giờ không hợp lệ.');
export const shiftCellSchema = z.union([shiftString, z.object({
  shift: shiftString, covering_store: z.string().trim().max(50).nullable().optional(),
  confirmed: z.boolean().optional(), isConfirmed: z.boolean().optional(),
  registered: z.boolean().optional(), isRegistered: z.boolean().optional(), status: z.enum(['registered', 'confirmed', 'draft']).optional(),
}).strict()]);
export const weekShiftsSchema = z.partialRecord(z.enum(WEEK_DAYS), shiftCellSchema);
export const overrideReasonSchema = z.string().trim().min(10, 'Lý do cần ít nhất 10 ký tự.').max(500);
export const attendanceRowSchema = z.object({
  empId: employeeIdSchema, workDate: isoDateSchema,
  actualHours: z.number().finite().min(0).max(24), note: z.string().max(1000).optional(),
  updatedBy: z.string().max(100).optional(),
}).strict();
