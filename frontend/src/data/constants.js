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
  { id: 'Cửa hàng trưởng', label: 'Cửa hàng trưởng (SM)', type: 'STFT', defaultMaxH: 48, badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'OFC', label: 'OFC (Quản lý khu vực)', type: 'STFT', defaultMaxH: 48, badgeCls: 'bg-amber-50 text-amber-800 border-amber-200' },
];

export function getRoleBadgeInfo(roleOrType) {
  const code = roleOrType || 'STPT';
  if (code === 'SM' || code === 'OFC' || /khu vực/i.test(code)) {
    return STANDARD_ROLES.find(r => r.id === 'OFC');
  }
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
  STPT_OPTIMAL_MIN_HOURS_PER_MONTH: 50, // Ngưỡng đạt chuẩn tháng tối thiểu

  // Quy chuẩn Full-time (STFT / CSR)
  STFT_MIN_HOURS_PER_WEEK: 48,    // Tối thiểu 48 giờ/tuần
  STFT_MIN_SHIFTS_PER_WEEK: 6,    // Tối thiểu 6 ca làm/tuần
  STFT_MAX_HOURS_PER_WEEK: 48,    // Định mức 48 giờ/tuần
  STFT_MAX_HOURS_PER_MONTH: 192,  // Định mức tháng
};

// Hệ số lương ca đêm và lương cơ bản part-time
export const NIGHT_SHIFT_MULTIPLIER = 1.3;
export const DEFAULT_PT_HOURLY_RATE = 25000;

// 7 ngày trong tuần
export const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Ca dùng để tính định biên (không gồm ca 4h). Default mẫu CH 24/7. */
export const STAFFING_SHIFT_CODES = ['6-14', '14-22', '22-6'];

export const DEFAULT_STAFFING_MATRIX = {
  weekday: { '6-14': 2, '14-22': 2, '22-6': 1 },
  weekend: { '6-14': 2, '14-22': 2, '22-6': 1 }
};

export function isWeekendDay(dayKey) {
  return dayKey === 'T7' || dayKey === 'CN';
}

function cloneShiftCounts(src, fallback = {}) {
  const from = src && typeof src === 'object' ? src : {};
  const out = {};
  STAFFING_SHIFT_CODES.forEach(code => {
    const n = from[code] ?? fallback[code] ?? 0;
    out[code] = Math.max(0, Number(n) || 0);
  });
  return out;
}

/** Chuẩn hóa JSON staffing trên store (nhận cả dạng phẳng { '6-14': 2 }). */
export function normalizeStaffingConfig(raw) {
  const flat = raw && raw['6-14'] != null ? raw : null;
  const weekday = cloneShiftCounts(raw?.weekday || flat, DEFAULT_STAFFING_MATRIX.weekday);
  const weekend = cloneShiftCounts(raw?.weekend || flat, DEFAULT_STAFFING_MATRIX.weekend);
  return { weekday, weekend };
}

export function getStaffingMatrix(store, dayKey) {
  const cfg = normalizeStaffingConfig(store?.staffing);
  return isWeekendDay(dayKey) ? { ...cfg.weekend } : { ...cfg.weekday };
}

export function buildStaffingByDay(store) {
  const byDay = {};
  WEEK_DAYS.forEach(day => {
    byDay[day] = getStaffingMatrix(store, day);
  });
  return byDay;
}

/**
 * Doanh số + lượt khách TB (GS25 Direct) → gợi ý định biên.
 * Chia lưu lượng theo tỷ trọng ca 24/7: sáng 35%, chiều 45%, đêm 20%.
 * Sau này thay bằng dữ liệu theo giờ từ Direct.
 */
export const DEMAND_STAFFING_RULES = {
  shiftShare: { '6-14': 0.35, '14-22': 0.45, '22-6': 0.20 },
  customersPerStaff: { '6-14': 90, '14-22': 90, '22-6': 70 },
  salesPerStaff: { '6-14': 8_000_000, '14-22': 9_000_000, '22-6': 4_000_000 },
  minStaff: { '6-14': 1, '14-22': 1, '22-6': 1 },
  maxStaff: { '6-14': 6, '14-22': 6, '22-6': 3 }
};

export function normalizeStoreDemand(raw) {
  const bucket = (b) => ({
    customers: Math.max(0, Number(b?.customers) || 0),
    sales: Math.max(0, Number(b?.sales) || 0)
  });
  return {
    weekday: bucket(raw?.weekday || raw),
    weekend: bucket(raw?.weekend)
  };
}

export function suggestMatrixFromDemandBucket(bucket) {
  const customers = Math.max(0, Number(bucket?.customers) || 0);
  const sales = Math.max(0, Number(bucket?.sales) || 0);
  if (!customers && !sales) return { ...DEFAULT_STAFFING_MATRIX.weekday };

  const out = {};
  STAFFING_SHIFT_CODES.forEach(code => {
    const share = DEMAND_STAFFING_RULES.shiftShare[code];
    const fromCust = customers > 0
      ? Math.ceil((customers * share) / DEMAND_STAFFING_RULES.customersPerStaff[code])
      : 0;
    const fromSales = sales > 0
      ? Math.ceil((sales * share) / DEMAND_STAFFING_RULES.salesPerStaff[code])
      : 0;
    const suggested = Math.max(DEMAND_STAFFING_RULES.minStaff[code], fromCust, fromSales);
    out[code] = Math.min(DEMAND_STAFFING_RULES.maxStaff[code], suggested);
  });
  return out;
}

export function suggestStaffingFromDemand(demand) {
  const d = normalizeStoreDemand(demand);
  return {
    weekday: suggestMatrixFromDemandBucket(d.weekday),
    weekend: suggestMatrixFromDemandBucket(d.weekend)
  };
}

export function formatISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

/** Thứ Hai của tuần chứa `date`, ISO YYYY-MM-DD có số 0 (vd: 2026-08-10). */
export function getCurrentMondayWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatISODate(d);
}

/** Danh sách tuần quanh hôm nay: mặc định 8 tuần lịch sử + tuần này + 4 tuần tới. */
export function listNearbyWeeks(today = new Date(), past = 8, future = 4) {
  const currentMonday = new Date(getCurrentMondayWeek(today) + 'T00:00:00');
  const list = [];
  for (let i = -past; i <= future; i++) {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i * 7);
    const end = new Date(d);
    end.setDate(d.getDate() + 6);
    const key = formatISODate(d);
    let tag = `Tuần ${i > 0 ? '+' : ''}${i}`;
    if (i === 0) tag = 'Tuần này';
    else if (i === -1) tag = 'Tuần trước';
    else if (i === 1) tag = 'Tuần sau';
    else if (i < 0) tag = `Lịch sử ${-i} tuần`;
    list.push({ key, offset: i, startDate: d, endDate: end, tag });
  }
  return list;
}

/** weekKey = thứ Hai ISO, dayKey = T2…CN */
export function getWeekAndDayKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const weekday = d.getDay();
  const dayKey = WEEK_DAYS[weekday === 0 ? 6 : weekday - 1];
  return { weekKey: getCurrentMondayWeek(d), dayKey };
}

/** Chu kỳ lương 26 tháng trước → 25 tháng `month` (1–12). */
export function getPayrollCycleDates(year, month) {
  let prevM = month - 1;
  let prevY = year;
  if (prevM < 1) {
    prevM = 12;
    prevY--;
  }

  const dates = [];
  const daysInPrevMonth = new Date(prevY, prevM, 0).getDate();
  for (let day = 26; day <= daysInPrevMonth; day++) {
    const dateObj = new Date(prevY, prevM - 1, day);
    const { weekKey, dayKey } = getWeekAndDayKey(dateObj);
    const dayPad = String(day).padStart(2, '0');
    const monthPad = String(prevM).padStart(2, '0');
    const fullDateStr = `${prevY}-${monthPad}-${dayPad}`;
    dates.push({
      key: String(day),
      display: `${dayPad}/${monthPad}`,
      shortDisplay: `${dayPad}/${monthPad}`,
      dateFormatted: `${dayPad}/${monthPad}`,
      dayNum: String(day),
      fullDateStr,
      weekKey,
      dayKey,
      dateObj
    });
  }
  for (let day = 1; day <= 25; day++) {
    const dateObj = new Date(year, month - 1, day);
    const { weekKey, dayKey } = getWeekAndDayKey(dateObj);
    const dayPad = String(day).padStart(2, '0');
    const monthPad = String(month).padStart(2, '0');
    const fullDateStr = `${year}-${monthPad}-${dayPad}`;
    dates.push({
      key: String(day),
      display: `${dayPad}/${monthPad}`,
      shortDisplay: `${dayPad}/${monthPad}`,
      dateFormatted: `${dayPad}/${monthPad}`,
      dayNum: String(day),
      fullDateStr,
      weekKey,
      dayKey,
      dateObj
    });
  }
  return dates;
}

export function getPayrollCycleFromWeek(weekDate) {
  const parts = String(weekDate || '').split('-').map(Number);
  const y = parts[0] || new Date().getFullYear();
  const m = parts[1] || (new Date().getMonth() + 1);
  const d = parts[2] || 1;
  if (d >= 26) {
    let nm = m + 1;
    let ny = y;
    if (nm > 12) {
      nm = 1;
      ny++;
    }
    return { year: ny, month: nm };
  }
  return { year: y, month: m };
}

export const DAY_FULL_NAMES = {
  'T2': 'Thứ Hai',
  'T3': 'Thứ Ba',
  'T4': 'Thứ Tư',
  'T5': 'Thứ Năm',
  'T6': 'Thứ Sáu',
  'T7': 'Thứ Bảy',
  'CN': 'Chủ Nhật'
};
