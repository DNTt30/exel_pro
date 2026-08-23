// ==============================================================================
// GS25 DATE & PAYROLL CYCLE HELPERS
// ==============================================================================

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

const DAY_KEY_MAP = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/**
 * Phân tích chuỗi ngày (DD/MM/YYYY hoặc YYYY-MM-DD)
 * Trả về: dayKey, dayLabel, weekMonday (ngày T2 của tuần đó), formattedDate
 */
export function parseDateDetails(dateStr) {
  if (!dateStr) return { dayKey: 'T2', dayLabel: 'Thứ Hai', weekMonday: null, formattedDate: '-' };

  let d = null;
  const cleanStr = String(dateStr).trim();

  if (cleanStr.includes('/')) {
    const parts = cleanStr.split('/').map(Number);
    if (parts.length === 3) {
      const day = parts[0];
      const month = parts[1];
      const year = parts[2] < 100 ? 2000 + parts[2] : parts[2];
      d = new Date(year, month - 1, day);
    }
  } else if (cleanStr.includes('-')) {
    const parts = cleanStr.split('-').map(Number);
    if (parts.length === 3) {
      if (parts[0] > 1000) {
        d = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        d = new Date(parts[2], parts[1] - 1, parts[0]);
      }
    }
  }

  if (!d || isNaN(d.getTime())) {
    return { dayKey: 'T2', dayLabel: 'Thứ Hai', weekMonday: null, formattedDate: cleanStr };
  }

  const dayOfWeek = d.getDay(); // 0 = CN, 1 = T2...
  const dayKey = DAY_KEY_MAP[dayOfWeek];
  const dayLabel = DAY_FULL_NAMES[dayKey] || dayKey;

  // Tính ngày Thứ Hai của tuần đó
  const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const weekMonday = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  return { dayKey, dayLabel, weekMonday, formattedDate, dateObj: d };
}

/**
 * Tính toán danh sách các ngày trong chu kỳ lương (26 tháng trước -> 25 tháng này)
 */
export function getPayrollCycleDates(year, month) {
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear = year - 1;
  }

  const dates = [];
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();

  // 1. Ngày 26 -> cuối tháng trước
  for (let day = 26; day <= daysInPrevMonth; day++) {
    const d = new Date(prevYear, prevMonth - 1, day);
    const dayOfWeek = d.getDay();
    const dayKey = DAY_KEY_MAP[dayOfWeek];
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

    dates.push({
      key: `D${day}_prev`,
      day,
      month: prevMonth,
      year: prevYear,
      display: `${String(day).padStart(2, '0')}/${String(prevMonth).padStart(2, '0')}`,
      shortDisplay: `${day}`,
      dayKey,
      dayLabel: DAY_FULL_NAMES[dayKey] || dayKey,
      weekKey,
      fullDateStr: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    });
  }

  // 2. Ngày 1 -> 25 tháng này
  for (let day = 1; day <= 25; day++) {
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    const dayKey = DAY_KEY_MAP[dayOfWeek];
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

    dates.push({
      key: `D${day}_cur`,
      day,
      month,
      year,
      display: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
      shortDisplay: `${day}`,
      dayKey,
      dayLabel: DAY_FULL_NAMES[dayKey] || dayKey,
      weekKey,
      fullDateStr: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    });
  }

  return dates;
}

/**
 * Xác định chu kỳ năm/tháng dựa trên ngày Thứ 2 của tuần được chọn
 */
export function getPayrollCycleFromWeek(weekStr) {
  if (!weekStr) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const parts = weekStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  if (day >= 26) {
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = year + 1;
    }
    return { year: nextYear, month: nextMonth };
  }
  return { year, month };
}
