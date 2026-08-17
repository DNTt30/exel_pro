import { z } from 'zod';
import { WEEK_DAYS } from '../data/constants';

// Regex chuẩn mã nhân viên 9 chữ số
const MA_RE = /^\d{9}$/;

// Schema kiểm thực Nhân viên
export const employeeSchema = z.object({
  id: z.string().regex(MA_RE, { message: 'Mã nhân viên phải gồm đúng 9 chữ số' }),
  name: z.string().min(2, { message: 'Họ tên nhân viên phải có ít nhất 2 ký tự' }),
  dept: z.string().min(2, { message: 'Mã cửa hàng không được để trống' }),
  role: z.string().optional(),
  type: z.enum(['STPT', 'STFT', 'CSR_NEW', 'SM', 'PARTTIME', 'FULLTIME']).default('STPT'),
  maxH: z.number().positive().default(23)
});

// Schema kiểm thực Báo bù công (Feedback C&B)
export const feedbackSchema = z.object({
  empId: z.string().min(1, { message: 'Mã nhân viên không được để trống' }),
  empName: z.string().optional(),
  dept: z.string().min(1, { message: 'Cửa hàng không được để trống' }),
  date: z.string().min(1, { message: 'Ngày phát sinh lỗi không được để trống' }),
  shift: z.string().optional(),
  hours: z.number().nonnegative().optional(),
  issue: z.string().min(3, { message: 'Nội dung phản hồi phải có ít nhất 3 ký tự' }),
  note: z.string().optional(),
  imageUrl: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending')
});

// Schema kiểm thực Đơn Đổi Ca (Shift Swap)
export const shiftSwapSchema = z.object({
  week: z.string().min(1, { message: 'Tuần làm việc không được để trống' }),
  store: z.string().min(1, { message: 'Cửa hàng không được để trống' }),
  fromEmpId: z.string().min(1, { message: 'Mã người đổi không được để trống' }),
  fromDay: z.enum(WEEK_DAYS, { message: 'Thứ trong tuần không hợp lệ' }),
  fromShift: z.string().min(1, { message: 'Ca làm việc không được để trống' }),
  toEmpId: z.string().min(1, { message: 'Mã đồng nghiệp đổi cùng không được để trống' }),
  toDay: z.enum(WEEK_DAYS, { message: 'Thứ trong tuần không hợp lệ' }),
  toShift: z.string().min(1, { message: 'Ca làm việc không được để trống' }),
  reason: z.string().optional(),
  status: z.enum(['pending_partner', 'pending_manager', 'approved', 'rejected', 'cancelled']).default('pending_partner')
});
