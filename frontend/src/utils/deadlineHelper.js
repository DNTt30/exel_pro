/**
 * Helper tính toán và quản lý Hạn Đăng Ký Lịch Tuần (Schedule Registration Deadline)
 * Áp dụng cho GS25 / OFC.
 */

export const DEFAULT_DEADLINE_CONFIG = {
  enabled: true,
  dayKey: 'T5', // Thứ 5 tuần trước
  time: '18:00', // 18:00
  customDeadline: null, // ISO string nếu gia hạn hoặc đặt giờ riêng
  isForceClosed: false, // SM chủ động khóa đăng ký sớm
  isForceOpen: false // SM chủ động mở lại đăng ký
};

export const DEADLINE_DAY_OPTIONS = [
  { key: 'T4', label: 'Thứ Tư (tuần trước)', offset: 5 },
  { key: 'T5', label: 'Thứ Năm (Khuyên dùng)', offset: 4 },
  { key: 'T6', label: 'Thứ Sáu (tuần trước)', offset: 3 },
  { key: 'T7', label: 'Thứ Bảy (tuần trước)', offset: 2 },
  { key: 'CN', label: 'Chủ Nhật (sát tuần làm)', offset: 1 }
];

const DAY_OFFSET_MAP = {
  'T2': 7,
  'T3': 6,
  'T4': 5,
  'T5': 4,
  'T6': 3,
  'T7': 2,
  'CN': 1
};

const DAY_NAMES_VI = {
  0: 'Chủ Nhật',
  1: 'Thứ Hai',
  2: 'Thứ Ba',
  3: 'Thứ Tư',
  4: 'Thứ Năm',
  5: 'Thứ Sáu',
  6: 'Thứ Bảy'
};

/**
 * Phân tích chuỗi ngày Monday YYYY-MM-DD thành Date an toàn theo local timezone
 */
export function parseMondayDate(weekMondayStr) {
  if (!weekMondayStr || typeof weekMondayStr !== 'string') return new Date();
  const parts = weekMondayStr.split('-');
  if (parts.length !== 3) return new Date();
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Định dạng ngày giờ thân thiện tiếng Việt (VD: 18:00 Thứ Năm, 17/09/2026)
 */
export function formatFriendlyDeadline(date) {
  if (!date || isNaN(date.getTime())) return '';
  const dayName = DAY_NAMES_VI[date.getDay()] || '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${mins} ${dayName}, ${d}/${m}/${y}`;
}

/**
 * Định dạng chuỗi thời gian còn lại hoặc đã qua
 */
export function formatRemainingTime(diffMs) {
  const isPast = diffMs <= 0;
  const absMs = Math.abs(diffMs);
  const totalMins = Math.floor(absMs / (60 * 1000));
  const days = Math.floor(totalMins / (24 * 60));
  const hours = Math.floor((totalMins % (24 * 60)) / 60);
  const mins = totalMins % 60;

  if (isPast) {
    if (days > 0) return `Đã hết hạn ${days} ngày trước`;
    if (hours > 0) return `Đã hết hạn ${hours} giờ trước`;
    if (mins > 0) return `Đã hết hạn ${mins} phút trước`;
    return 'Vừa mới hết hạn';
  }

  if (days > 0) {
    return hours > 0 ? `Còn ${days} ngày ${hours} giờ` : `Còn ${days} ngày`;
  }
  if (hours > 0) {
    return mins > 0 ? `Còn ${hours} giờ ${mins} phút` : `Còn ${hours} giờ`;
  }
  if (mins > 0) {
    return `Còn ${mins} phút`;
  }
  return 'Sắp hết hạn (< 1 phút)';
}

/**
 * Tính toán trạng thái và ngày giờ hạn chót đăng ký ca
 * @param {string} weekMondayStr - Ngày bắt đầu tuần làm việc (Thứ 2), định dạng YYYY-MM-DD
 * @param {object} config - Cấu hình hạn chót
 * @param {Date} [currentTime] - Thời gian hiện tại (cho phép mock khi test)
 */
export function calculateWeekDeadline(weekMondayStr, config = DEFAULT_DEADLINE_CONFIG, currentTime = new Date()) {
  const activeConfig = { ...DEFAULT_DEADLINE_CONFIG, ...(config || {}) };
  const monday = parseMondayDate(weekMondayStr);
  const now = currentTime instanceof Date ? currentTime : new Date(currentTime);

  if (!activeConfig.enabled) {
    return {
      enabled: false,
      isExpired: false,
      isNearDeadline: false,
      deadlineDate: null,
      formattedDeadline: 'Không giới hạn thời gian',
      remainingText: 'Không giới hạn',
      status: 'disabled',
      config: activeConfig
    };
  }

  if (activeConfig.isForceClosed) {
    return {
      enabled: true,
      isExpired: true,
      isNearDeadline: false,
      deadlineDate: now,
      formattedDeadline: 'Đã đóng (Quản lý khóa)',
      remainingText: 'Quản lý đã chủ động khóa',
      status: 'force_closed',
      config: activeConfig
    };
  }

  if (activeConfig.isForceOpen) {
    return {
      enabled: true,
      isExpired: false,
      isNearDeadline: false,
      deadlineDate: null,
      formattedDeadline: 'Đang mở (Quản lý mở lại)',
      remainingText: 'Quản lý cho phép nộp bù',
      status: 'force_open',
      config: activeConfig
    };
  }

  let deadlineDate;
  if (activeConfig.customDeadline) {
    deadlineDate = new Date(activeConfig.customDeadline);
  } else {
    const offset = DAY_OFFSET_MAP[activeConfig.dayKey] ?? 4;
    const [hStr, mStr] = (activeConfig.time || '18:00').split(':');
    const hours = parseInt(hStr, 10) || 0;
    const mins = parseInt(mStr, 10) || 0;

    deadlineDate = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() - offset,
      hours,
      mins,
      0,
      0
    );
  }

  const diffMs = deadlineDate.getTime() - now.getTime();
  const isExpired = diffMs <= 0;
  const isNearDeadline = !isExpired && diffMs <= 24 * 60 * 60 * 1000;

  let status = 'open';
  if (isExpired) status = 'expired';
  else if (isNearDeadline) status = 'warning';

  return {
    enabled: true,
    isExpired,
    isNearDeadline,
    deadlineDate,
    formattedDeadline: formatFriendlyDeadline(deadlineDate),
    remainingText: formatRemainingTime(diffMs),
    diffMs,
    status,
    config: activeConfig
  };
}

/**
 * Lấy cấu hình hạn chót của cửa hàng/tuần với cơ chế fallback 4 cấp
 */
export function getStoreDeadlineConfig(storeId, weekDate, stores = []) {
  if (typeof window === 'undefined') return { ...DEFAULT_DEADLINE_CONFIG };

  // 1. Cấu hình riêng cho tuần cụ thể
  try {
    if (storeId && weekDate) {
      const weekSaved = localStorage.getItem(`gs25_reg_deadline_${storeId}_${weekDate}`);
      if (weekSaved) {
        const parsed = JSON.parse(weekSaved);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_DEADLINE_CONFIG, ...parsed };
        }
      }
    }
  } catch {
    // ignore
  }

  // 2. Cấu hình trong thông tin store (database / Zustand)
  if (storeId && Array.isArray(stores)) {
    const storeObj = stores.find(s => s.id === storeId);
    if (storeObj?.registration_deadline && typeof storeObj.registration_deadline === 'object') {
      return { ...DEFAULT_DEADLINE_CONFIG, ...storeObj.registration_deadline };
    }
  }

  // 3. Fallback localStorage của cửa hàng
  try {
    if (storeId) {
      const storeSaved = localStorage.getItem(`gs25_reg_deadline_${storeId}`);
      if (storeSaved) {
        const parsed = JSON.parse(storeSaved);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_DEADLINE_CONFIG, ...parsed };
        }
      }
    }
  } catch {
    // ignore
  }

  // 4. Mặc định
  return { ...DEFAULT_DEADLINE_CONFIG };
}

/**
 * Lưu cấu hình hạn chót cho cửa hàng hoặc riêng cho tuần
 */
export async function saveStoreDeadlineConfig({
  storeId,
  weekDate,
  config,
  applyToAllWeeks = false,
  updateStore = null
}) {
  if (!storeId) return false;

  const payload = { ...DEFAULT_DEADLINE_CONFIG, ...config };

  if (applyToAllWeeks) {
    // Lưu vào store settings
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`gs25_reg_deadline_${storeId}`, JSON.stringify(payload));
        // Xóa override tuần này nếu chọn áp dụng chung
        if (weekDate) {
          localStorage.removeItem(`gs25_reg_deadline_${storeId}_${weekDate}`);
        }
      }
    } catch {
      // ignore
    }

    if (typeof updateStore === 'function') {
      try {
        await updateStore(storeId, { registration_deadline: payload });
      } catch (err) {
        console.warn('[saveStoreDeadlineConfig] Lỗi cập nhật store DB, đã lưu local:', err);
      }
    }
  } else if (weekDate) {
    // Lưu riêng cho tuần này
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`gs25_reg_deadline_${storeId}_${weekDate}`, JSON.stringify(payload));
      }
    } catch {
      // ignore
    }
  }

  // Phát event đồng bộ giữa các tabs hoặc components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gs25_deadline_changed', { detail: { storeId, weekDate, config: payload } }));
  }

  return true;
}

/**
 * Gia hạn thêm số giờ cho tuần đang chọn
 */
export function extendDeadlineHours(currentDeadlineResult, hoursToAdd = 24) {
  const baseDate = currentDeadlineResult.deadlineDate || new Date();
  const newDate = new Date(baseDate.getTime() + hoursToAdd * 60 * 60 * 1000);
  return {
    ...currentDeadlineResult.config,
    customDeadline: newDate.toISOString(),
    isForceClosed: false,
    isForceOpen: false
  };
}
