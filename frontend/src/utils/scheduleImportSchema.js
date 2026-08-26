// =====================================================================
// PHASE 5 — EXCEL IMPORT PIPELINE: schema + business validation
// Input : parsedList từ ImportScheduleModal
// Output: { valid[], warnings[], errors[] } mỗi phần tử { item, code, message }
// Zod = contract lớp schema; rule nghiệp vụ kiểm thủ công có chủ đích.
// =====================================================================
import { z } from 'zod';
import { SHIFTS } from '../data/initialData';
import { WEEK_DAYS } from '../data/constants';

export const IMPORT_ERROR_CODES = {
  INVALID_ID_FORMAT: 'Mã NV phải gồm đúng 9 chữ số',
  MISSING_NAME: 'Thiếu họ tên',
  UNKNOWN_STORE: 'Cửa hàng không tồn tại trong hệ thống',
  NO_SHIFTS: 'Không có ca làm nào trong tuần',
};
export const IMPORT_WARNING_CODES = {
  NEW_EMPLOYEE: 'Nhân viên mới — sẽ tự tạo',
  SHIFT_UNKNOWN_CODE: 'Có mã ca lạ (vẫn nhập, đánh dấu xem lại)',
  OVERWRITE_EXISTING: 'Ghi đè lịch đã có của nhân viên',
};

const rowSchema = z.object({
  id: z.string().regex(/^\d{9}$/, 'INVALID_ID_FORMAT'),
  name: z.string().trim().min(2, 'MISSING_NAME'),
  dept: z.string().trim().min(1, 'UNKNOWN_STORE'),
  role: z.string().optional().default('STPT'),
  type: z.string().optional(),
  isExisting: z.boolean().optional(),
  shifts: z.record(z.string(), z.string()).default({}),
});

function shiftLooksValid(code) {
  if (code === 'off') return true;
  if (Object.prototype.hasOwnProperty.call(SHIFTS, code)) return true;
  return /^\d{1,2}-\d{1,2}(\s+VN\d{4}|_VN\d{4})?$/.test(code);
}

/**
 * @returns {{valid: any[], warnings: any[], errors: any[]}}
 */
export function validateImportRows(parsedList, ctx = {}) {
  const existingIds = ctx.existingIds || new Set();
  const storeIds = ctx.storeIds || new Set();
  const existingShiftsById = ctx.existingShiftsById || {};
  const valid = [], warnings = [], errors = [];

  parsedList.forEach((raw, idx) => {
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const code = String(issue.message);
      errors.push({ item: raw, rowNo: idx + 1, code, message: (IMPORT_ERROR_CODES[code] || code) + ' (dòng #' + (idx + 1) + ')' });
      return;
    }
    const item = parsed.data;

    if (!storeIds.has(item.dept)) {
      errors.push({ item, rowNo: idx + 1, code: 'UNKNOWN_STORE', message: IMPORT_ERROR_CODES.UNKNOWN_STORE + ': ' + item.dept + ' (#' + (idx + 1) + ')' });
      return;
    }

    const shiftDays = WEEK_DAYS.filter(d => item.shifts[d]);
    if (shiftDays.length === 0) {
      errors.push({ item, rowNo: idx + 1, code: 'NO_SHIFTS', message: IMPORT_ERROR_CODES.NO_SHIFTS + ' (#' + (idx + 1) + ')' });
      return;
    }

    const w = [];
    if (!existingIds.has(item.id)) w.push({ code: 'NEW_EMPLOYEE', message: IMPORT_WARNING_CODES.NEW_EMPLOYEE + ': ' + item.id });
    else {
      const cur = existingShiftsById[item.id] || {};
      const hasAny = WEEK_DAYS.some(d => cur[d]);
      if (hasAny) w.push({ code: 'OVERWRITE_EXISTING', message: IMPORT_WARNING_CODES.OVERWRITE_EXISTING + ': ' + item.id });
    }
    for (const d of shiftDays) {
      const rawCode = String(item.shifts[d]).split(/\s+|_/)[0];
      if (!shiftLooksValid(String(item.shifts[d]).includes(' ') || String(item.shifts[d]).includes('_') ? rawCode : item.shifts[d])) {
        // vẫn cho nhập nhưng cảnh báo — normalizeShiftCell phía lưu sẽ chuẩn hoá tiếp
        w.push({ code: 'SHIFT_UNKNOWN_CODE', message: IMPORT_WARNING_CODES.SHIFT_UNKNOWN_CODE + ': ' + item.id + ' · ' + d + ' = ' + item.shifts[d] });
      }
    }

    valid.push(item);
    warnings.push(...w.map(x => ({ item, rowNo: idx + 1, ...x })));
  });

  return { valid, warnings, errors };
}
