// ==============================================================================
// GS25 DATE & PAYROLL CYCLE HELPERS (SSOT aligned with constants.js)
// ==============================================================================

import { 
  WEEK_DAYS, 
  DAY_FULL_NAMES, 
  getPayrollCycleDates, 
  getPayrollCycleFromWeek 
} from '../data/constants';

// Re-export constants for backward compatibility
export { WEEK_DAYS, DAY_FULL_NAMES, getPayrollCycleDates, getPayrollCycleFromWeek };

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
