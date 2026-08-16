// ==============================================================================
// OFC SYSTEM CONSTANTS & CONFIGURATION
// ==============================================================================

// Regex xác thực Mã Nhân Viên đúng 9 chữ số (Ví dụ: 260512008)
export const MA_RE = /^\d{9}$/;

// Chuẩn hóa loại nhân viên (Employee Types)
export const EMPLOYEE_TYPES = {
  STPT: 'STPT',       // Nhân viên Part-time
  STFT: 'STFT',       // Nhân viên Full-time
  CSR_NEW: 'CSR_NEW'  // Nhân viên Chăm sóc khách hàng mới
};

export const EMPLOYEE_TYPE_LABELS = {
  'STPT': 'STPT (Part-time)',
  'STFT': 'STFT (Full-time)',
  'CSR_NEW': 'CSR_NEW (Chăm sóc khách hàng)'
};

// Cấu hình quy chuẩn & ngưỡng cảnh báo giờ làm việc (Schedule Rules)
export const SCHEDULE_RULES = {
  // Quy chuẩn Part-time (STPT)
  STPT_MIN_HOURS_PER_WEEK: 16,    // Tối thiểu 16 giờ/tuần
  STPT_MAX_HOURS_PER_WEEK: 23,    // Ngưỡng tuần tối đa ~23 giờ (tương đương 91h/tháng)
  STPT_MAX_HOURS_PER_MONTH: 91,   // Tối đa 91 giờ/tháng

  // Quy chuẩn Full-time (STFT / CSR)
  STFT_MIN_HOURS_PER_WEEK: 48,    // Tối thiểu 48 giờ/tuần
  STFT_MIN_SHIFTS_PER_WEEK: 6,    // Tối thiểu 6 ca làm/tuần
  STFT_MAX_HOURS_PER_WEEK: 48,    // Định mức 48 giờ/tuần
  STFT_MAX_HOURS_PER_MONTH: 192,  // Định mức tháng
};

// 7 ngày trong tuần
export const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const DAY_FULL_NAMES = {
  'T2': 'Thứ Hai',
  'T3': 'Thứ Ba',
  'T4': 'Thứ Tư',
  'T5': 'Thứ Năm',
  'T6': 'Thứ Sáu',
  'T7': 'Thứ Bảy',
  'CN': 'Chủ Nhật'
};
