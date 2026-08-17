import { SHIFTS } from '../data/initialData';
import { SCHEDULE_RULES } from '../data/constants';

/**
 * Chuẩn hóa giá trị ca làm việc thành object thống nhất:
 * {
 *   shift: string, // '6-14', 'off', '14-22', ''
 *   covering_store: string | null // 'VN0485' hoặc null
 * }
 */
export function normalizeShift(val) {
  if (!val) return { shift: '', covering_store: null };
  if (typeof val === 'object') {
    return {
      shift: val.shift || '',
      covering_store: val.covering_store || null
    };
  }
  if (typeof val === 'string') {
    if (val.includes('_')) {
      const parts = val.split('_');
      const covering_store = parts.pop();
      const shift = parts.join('_');
      return { shift, covering_store };
    }
    return { shift: val, covering_store: null };
  }
  return { shift: '', covering_store: null };
}

/**
 * Lấy mã ca làm việc (không chứa hậu tố store)
 */
export function getShiftCode(val) {
  return normalizeShift(val).shift;
}

/**
 * Lấy mã cửa hàng mượn/chi viện (nếu có)
 */
export function getCoveringStore(val) {
  return normalizeShift(val).covering_store;
}

/**
 * Định dạng hiển thị giờ ca (VD: 14-22 -> 14:00 - 22:00)
 */
export function formatShiftTime(val) {
  if (!val || val === 'off') return val;
  const match = val.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
  if (match) {
    const start = match[1].padStart(2, '0') + ':00';
    const end = match[2].padStart(2, '0') + ':00';
    return `${start} - ${end}`;
  }
  return val;
}

/**
 * Tính toán số giờ của 1 mã ca
 */
export function getShiftHours(shiftCode) {
  if (!shiftCode || shiftCode === 'off') return 0;
  if (SHIFTS[shiftCode]) return SHIFTS[shiftCode].hours;

  const match = shiftCode.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
  if (match) {
    let start = parseInt(match[1], 10);
    let end = parseInt(match[2], 10);
    if (end < start) end += 24;
    return end - start;
  }
  return 0;
}

/**
 * Phân tích ca để hiển thị cho từng ô tính (Cell) trên bảng lịch
 */
export function parseShiftForCell(emp, val) {
  if (!val) return { display: '', isBorrowedSlot: false, colorClass: '' };
  
  const { shift, covering_store } = normalizeShift(val);
  
  if (covering_store) {
    if (emp.isBorrowedTo) {
      // Đang render ở bảng cửa hàng mượn
      if (covering_store === emp.isBorrowedTo) {
        return { 
          display: shift === 'off' ? '' : shift, 
          isBorrowedSlot: true, 
          colorClass: 'bg-orange-50 text-orange-700' 
        };
      } else {
        // Ngày này mượn ở chỗ khác
        return { display: '', isBorrowedSlot: false, colorClass: 'bg-slate-100' };
      }
    } else {
      // Đang render ở bảng cửa hàng gốc (nhân viên đi chi viện nơi khác)
      return { 
        display: shift === 'off' ? `off ${covering_store}` : `${shift} ${covering_store}`, 
        isBorrowedSlot: true, 
        colorClass: 'bg-slate-100 text-slate-500 italic text-[10px]' 
      };
    }
  } else {
    // Ca bình thường không đi chi viện
    if (emp.isBorrowedTo) {
      return { display: '', isBorrowedSlot: false, colorClass: 'bg-slate-100' };
    }
    return { display: shift, isBorrowedSlot: false, colorClass: '' };
  }
}

/**
 * Tính tổng giờ và số ca của một nhân viên trong tuần / chu kỳ tháng
 */
export function calculateEmployeeWeeklyHours(emp, empSched, days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']) {
  let totalHours = 0;
  let totalShifts = 0;

  days.forEach(day => {
    const rawVal = empSched?.[day];
    if (!rawVal) return;
    const { shift, covering_store } = normalizeShift(rawVal);
    if (!shift || shift === 'off') return;

    // Lọc theo ngữ cảnh chi viện
    if (emp.isBorrowedTo && covering_store !== emp.isBorrowedTo) return;
    if (!emp.isBorrowedTo && covering_store) return; // Nếu đi chi viện thì không cộng vào tổng của cửa hàng gốc

    totalShifts++;
    totalHours += getShiftHours(shift);
  });

  return { totalHours, totalShifts };
}

/**
 * Kiểm tra các quy chuẩn cảnh báo:
 * - STPT: ≥16h/tuần, ≤23h/tuần (~91h/tháng)
 * - STFT: ≥48h/tuần VÀ ≥6 ca/tuần
 */
export function validateEmployeeSchedule(emp, totalHours, totalShifts, isMonthView = false) {
  const empType = (emp.type || '').toUpperCase();
  const empRole = (emp.role || '').toUpperCase();
  const isPT = empType === 'STPT' || empType === 'PARTTIME' || empRole.includes('PT');
  const isFT = empType === 'STFT' || empType === 'FULLTIME' || empType === 'CSR_NEW' || (!isPT);

  const warnings = [];

  if (isPT) {
    if (isMonthView) {
      if (totalHours > SCHEDULE_RULES.STPT_MAX_HOURS_PER_MONTH) {
        warnings.push({
          type: 'error',
          badge: '⚠️ > 91h',
          message: `Vượt quá giới hạn ${SCHEDULE_RULES.STPT_MAX_HOURS_PER_MONTH}h/tháng cho Part-time (${totalHours}h / ${SCHEDULE_RULES.STPT_MAX_HOURS_PER_MONTH}h)`
        });
      }
    } else {
      if (totalHours > SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK) {
        warnings.push({
          type: 'error',
          badge: '⚠️ > 23h',
          message: `Vượt ngưỡng tuần tương đương 91h/tháng (${totalHours}h / ~${SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK}h)`
        });
      }
      if (totalHours > 0 && totalHours < SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK) {
        warnings.push({
          type: 'warning',
          badge: '⚠️ < 16h',
          message: `Chưa đạt tối thiểu ${SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK}h/tuần cho Part-time (${totalHours}h / ${SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK}h)`
        });
      }
    }
  } else if (isFT) {
    if (!isMonthView) {
      if (totalHours > 0 && totalHours < SCHEDULE_RULES.STFT_MIN_HOURS_PER_WEEK) {
        warnings.push({
          type: 'warning',
          badge: '⚠️ < 48h',
          message: `Full-time chưa đủ ${SCHEDULE_RULES.STFT_MIN_HOURS_PER_WEEK}h/tuần (${totalHours}h / ${SCHEDULE_RULES.STFT_MIN_HOURS_PER_WEEK}h)`
        });
      }
      if (totalShifts > 0 && totalShifts < SCHEDULE_RULES.STFT_MIN_SHIFTS_PER_WEEK) {
        warnings.push({
          type: 'warning',
          badge: '⚠️ < 6 ca',
          message: `Full-time chưa đủ ${SCHEDULE_RULES.STFT_MIN_SHIFTS_PER_WEEK} ca/tuần (${totalShifts} ca / ${SCHEDULE_RULES.STFT_MIN_SHIFTS_PER_WEEK} ca)`
        });
      }
    }
  }

  return {
    isPT,
    isFT,
    totalHours,
    totalShifts,
    hasErrors: warnings.some(w => w.type === 'error'),
    hasWarnings: warnings.some(w => w.type === 'warning'),
    warnings
  };
}

/**
 * Phân tích khoảng thời gian bắt đầu và kết thúc của một ca làm việc
 * Hỗ trợ cả ca đêm (ví dụ: 22-6 => 22:00 đến 30:00)
 */
export function parseShiftTimeRange(shiftCode) {
  if (!shiftCode || shiftCode === 'off' || shiftCode === '-') return null;
  const match = shiftCode.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
  if (!match) return null;
  let start = parseInt(match[1], 10);
  let end = parseInt(match[2], 10);
  if (end <= start) end += 24; // Ca đêm 22-6 => start: 22, end: 30
  return { start, end };
}

/**
 * Kiểm tra xem 2 ca làm việc có bị TRÙNG / XUNG ĐỘT khung giờ hay không
 * Hai khoảng [startA, endA] và [startB, endB] xung đột khi:
 * Math.max(startA, startB) < Math.min(endA, endB)
 */
export function isShiftsOverlapping(shiftCodeA, shiftCodeB) {
  const rangeA = parseShiftTimeRange(shiftCodeA);
  const rangeB = parseShiftTimeRange(shiftCodeB);
  if (!rangeA || !rangeB) return false;

  return Math.max(rangeA.start, rangeB.start) < Math.min(rangeA.end, rangeB.end);
}

/**
 * Tính toán Staffing Gap (Định biên nhân sự) theo từng ca cho cửa hàng
 * @param {Array} employees Danh sách nhân sự
 * @param {Object} weekSched Lịch tuần
 * @param {string} dayKey 'T2' | 'T3' ...
 * @param {string} storeId 'VN0485'
 * @param {Object} requiredMatrix Định biên yêu cầu { '6-14': 2, '14-22': 2, '22-6': 1 }
 */
export function calculateStaffingGap(employees, weekSched, dayKey, storeId, requiredMatrix = { '6-14': 2, '14-22': 2, '22-6': 1 }) {
  const result = {};

  Object.entries(requiredMatrix).forEach(([shiftCode, requiredCount]) => {
    let actualCount = 0;   // Nhân sự cơ hữu tại cửa hàng
    let supportCount = 0;  // Nhân sự chi viện từ nơi khác tới

    employees.forEach(emp => {
      const raw = weekSched[emp.id]?.[dayKey];
      if (!raw) return;
      const { shift, covering_store } = normalizeShift(raw);
      if (shift !== shiftCode) return;

      if (emp.dept === storeId && !covering_store) {
        actualCount++;
      } else if (covering_store === storeId) {
        supportCount++;
      }
    });

    const totalAvailable = actualCount + supportCount;
    const gap = totalAvailable - requiredCount; // Âm là thiếu, 0 là đủ, Dương là dư

    result[shiftCode] = {
      required: requiredCount,
      actual: actualCount,
      support: supportCount,
      total: totalAvailable,
      gap,
      status: gap < 0 ? 'deficit' : gap === 0 ? 'balanced' : 'surplus'
    };
  });

  return result;
}

