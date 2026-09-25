/**
 * payrollCalculator.js
 * Tính lương preview cho nhân viên GS25 (chu kỳ 26→25)
 * 
 * Đơn giá mặc định (có thể override theo cửa hàng):
 *  - STFT: lương cứng theo hợp đồng (ước tính theo giờ làm thực tế)
 *  - STPT: tính theo giờ × đơn giá/giờ
 *  - Ngày lễ: x2, Cuối tuần: x1.5 (tùy cấu hình)
 */

// ─── Đơn giá mặc định (VNĐ) ───────────────────────────────────────────────
export const DEFAULT_RATES = {
  PT_HOURLY:        22_000,   // Part-time: giá/giờ cơ bản (~2tr/91h)
  FT_HOURLY:        24_000,   // Full-time: ước tính giá/giờ (5tr ÷ 208h ≈ 24k)
  WEEKEND_BONUS:    1.5,      // Hệ số cuối tuần (T7, CN)
  HOLIDAY_BONUS:    2.0,      // Hệ số ngày lễ
  OVERTIME_BONUS:   1.5,      // Hệ số OT (vượt định mức)
  PT_MAX_HOURS:     91,       // Giới hạn giờ PT/tháng
  FT_STANDARD_HOURS: 208,     // Giờ chuẩn FT/tháng (26 ngày × 8h)
};

// Danh sách ngày lễ Việt Nam cố định (MM-DD)
const VN_HOLIDAYS = new Set([
  '01-01', // Tết Dương lịch
  '04-30', // Giải phóng miền Nam
  '05-01', // Quốc tế Lao động
  '09-02', // Quốc khánh
]);

function isHoliday(dateStr) {
  const mmdd = dateStr.slice(5); // 'YYYY-MM-DD' → 'MM-DD'
  return VN_HOLIDAYS.has(mmdd);
}

function isWeekend(dow) {
  return dow === 0 || dow === 6; // 0=CN, 6=T7
}

/**
 * Tính lương preview cho 1 nhân viên trong 1 chu kỳ
 * @param {object} params
 * @param {string} params.empType   - 'STFT' | 'STPT' | 'PARTTIME' | 'FULLTIME'
 * @param {number} params.totalHours - Tổng giờ làm thực tế trong chu kỳ
 * @param {Array}  params.dayDetails - [{dateStr, hours, dow}] — từng ngày làm
 * @param {object} params.rates      - Override đơn giá (optional)
 * @returns {object} Kết quả tính lương chi tiết
 */
export function calculatePayrollPreview({ empType, totalHours, dayDetails = [], rates = {} }) {
  const R = { ...DEFAULT_RATES, ...rates };
  const isPT = empType === 'STPT' || empType === 'PARTTIME';

  let baseHours       = 0;
  let weekendHours    = 0;
  let holidayHours    = 0;
  let overtimeHours   = 0;

  // Phân loại từng ngày
  dayDetails.forEach(({ dateStr, hours, dow }) => {
    if (!hours || hours <= 0) return;
    if (isHoliday(dateStr)) {
      holidayHours += hours;
    } else if (isWeekend(dow)) {
      weekendHours += hours;
    } else {
      baseHours += hours;
    }
  });

  // OT: phần vượt định mức — phân bổ proportional từ tất cả loại giờ
  if (isPT && totalHours > R.PT_MAX_HOURS) {
    overtimeHours = totalHours - R.PT_MAX_HOURS;
    // Ưu tiên trừ từ baseHours trước, sau đó weekendHours, holidayHours
    const fromBase = Math.min(overtimeHours, baseHours);
    baseHours -= fromBase;
    const fromWeekend = Math.min(overtimeHours - fromBase, weekendHours);
    weekendHours -= fromWeekend;
    const fromHoliday = Math.min(overtimeHours - fromBase - fromWeekend, holidayHours);
    holidayHours -= fromHoliday;
  }

  const hourlyRate = isPT ? R.PT_HOURLY : R.FT_HOURLY;

  const basePay     = baseHours    * hourlyRate;
  const weekendPay  = weekendHours * hourlyRate * R.WEEKEND_BONUS;
  const holidayPay  = holidayHours * hourlyRate * R.HOLIDAY_BONUS;
  const overtimePay = overtimeHours * hourlyRate * R.OVERTIME_BONUS;

  const gross = basePay + weekendPay + holidayPay + overtimePay;

  // Thuế TNCN đơn giản (miễn thuế nếu < 11tr, tạm tính 10% nếu > 11tr)
  const TAX_THRESHOLD = 11_000_000;
  const taxRate = gross > TAX_THRESHOLD ? 0.10 : 0;
  const tax     = Math.round(gross * taxRate);
  const net     = Math.round(gross - tax);

  return {
    isPT,
    totalHours,
    baseHours,
    weekendHours,
    holidayHours,
    overtimeHours,
    hourlyRate,
    basePay:     Math.round(basePay),
    weekendPay:  Math.round(weekendPay),
    holidayPay:  Math.round(holidayPay),
    overtimePay: Math.round(overtimePay),
    gross:       Math.round(gross),
    tax,
    net,
    taxRate,
    isEstimate:  true, // luôn là ước tính, không phải số chính thức
  };
}

/** Format số tiền VNĐ */
export function formatVND(amount) {
  if (!amount || amount === 0) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}
