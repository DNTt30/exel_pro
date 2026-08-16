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

// Danh mục Vị trí / Chức vụ chuẩn (Tự động map sang Loại hợp đồng & Giờ max)
export const STANDARD_ROLES = [
  { id: 'STFT', label: 'STFT (Nhân viên Full-time)', type: 'STFT', defaultMaxH: 48, badgeCls: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'STPT', label: 'STPT (Nhân viên Part-time)', type: 'STPT', defaultMaxH: 23, badgeCls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'CSR_NEW', label: 'CSR (Chăm sóc khách hàng)', type: 'CSR_NEW', defaultMaxH: 48, badgeCls: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'Cửa hàng trưởng', label: '⭐ Cửa hàng trưởng (SM)', type: 'STFT', defaultMaxH: 48, badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'SM', label: '👑 SM (Quản lý khu vực)', type: 'STFT', defaultMaxH: 48, badgeCls: 'bg-amber-50 text-amber-700 border-amber-200' },
];

export function getRoleBadgeInfo(roleOrType) {
  const code = roleOrType || 'STPT';
  const found = STANDARD_ROLES.find(r => r.id === code || r.label === code);
  if (found) return found;
  if (code.includes('PT')) return { id: code, label: code, type: 'STPT', badgeCls: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (code.includes('CSR')) return { id: code, label: code, type: 'CSR_NEW', badgeCls: 'bg-rose-50 text-rose-700 border-rose-200' };
  return { id: code, label: code, type: 'STFT', badgeCls: 'bg-purple-50 text-purple-700 border-purple-200' };
}

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
