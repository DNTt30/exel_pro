/**
 * PayrollPreviewCard.jsx
 * Card xem trước lương ước tính cho nhân viên GS25
 * Hiển thị trong trang Chấm công (EmployeeTimesheet)
 */
import React, { useMemo, useState } from 'react';
import { DollarSign, ChevronDown, ChevronUp, Info, AlertTriangle } from 'lucide-react';
import { calculatePayrollPreview, formatVND, DEFAULT_RATES } from '../../utils/payrollCalculator';
import { timesheetHours } from '../../utils/timesheetValues';

export default function PayrollPreviewCard({ user, cycleDates = [], getEffectiveValue }) {
  const [expanded, setExpanded] = useState(false);
  const isPT = user?.type === 'STPT' || user?.type === 'PARTTIME' ||
               (user?.role && user?.role.includes('PT'));

  // Tính từng ngày
  const dayDetails = useMemo(() => cycleDates.map(({ key: dateStr, dow }) => {
    const val = getEffectiveValue?.(user?.id, dateStr);
    const hours = timesheetHours(val);
    return { dateStr, hours, dow };
  }), [cycleDates, getEffectiveValue, user?.id]);

  const totalHours = useMemo(() =>
    Math.round(dayDetails.reduce((s, d) => s + d.hours, 0) * 100) / 100,
    [dayDetails]);

  const result = useMemo(() => calculatePayrollPreview({
    empType: user?.type || (isPT ? 'STPT' : 'STFT'),
    totalHours,
    dayDetails,
  }), [user?.type, totalHours, dayDetails, isPT]);

  const pct = isPT
    ? Math.min(100, Math.round((totalHours / DEFAULT_RATES.PT_MAX_HOURS) * 100))
    : Math.min(100, Math.round((totalHours / DEFAULT_RATES.FT_STANDARD_HOURS) * 100));

  return (
    <div className="mx-3 my-2 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm overflow-hidden print:hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-emerald-100/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm">
            <DollarSign size={14} className="text-white" />
          </div>
          <div className="text-left">
            <div className="text-xs font-black text-emerald-900">Ước tính lương tháng này</div>
            <div className="text-[10px] text-emerald-600 font-medium">
              {totalHours}h làm việc • Chu kỳ 26→25
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-lg font-black text-emerald-800">{formatVND(result.net)}</div>
            <div className="text-[10px] text-emerald-600">thực nhận (ước tính)</div>
          </div>
          {expanded ? <ChevronUp size={16} className="text-emerald-600" /> : <ChevronDown size={16} className="text-emerald-600" />}
        </div>
      </button>

      {/* Thanh tiến độ giờ */}
      <div className="px-4 pb-2">
        <div className="flex justify-between text-[10px] text-emerald-700 font-semibold mb-1">
          <span>{totalHours}h / {isPT ? `${DEFAULT_RATES.PT_MAX_HOURS}h (PT max)` : `${DEFAULT_RATES.FT_STANDARD_HOURS}h (FT chuẩn)`}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-emerald-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${result.overtimeHours > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Chi tiết mở rộng */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-emerald-200/60 pt-3">
          
          {/* Cảnh báo OT */}
          {result.overtimeHours > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800 font-semibold">
              <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
              <span>Vượt {result.overtimeHours.toFixed(1)}h định mức PT — OT x{DEFAULT_RATES.OVERTIME_BONUS}</span>
            </div>
          )}

          {/* Bảng tính chi tiết */}
          <div className="rounded-xl overflow-hidden border border-emerald-200 bg-white">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-emerald-100">
                  <td className="px-3 py-2 text-slate-600">🕐 Giờ thường ({result.baseHours.toFixed(1)}h)</td>
                  <td className="px-3 py-2 text-right font-bold text-slate-800">{formatVND(result.basePay)}</td>
                </tr>
                {result.weekendHours > 0 && (
                  <tr className="border-b border-emerald-100 bg-orange-50/50">
                    <td className="px-3 py-2 text-slate-600">📅 Cuối tuần ({result.weekendHours.toFixed(1)}h × {DEFAULT_RATES.WEEKEND_BONUS})</td>
                    <td className="px-3 py-2 text-right font-bold text-orange-700">{formatVND(result.weekendPay)}</td>
                  </tr>
                )}
                {result.holidayHours > 0 && (
                  <tr className="border-b border-emerald-100 bg-red-50/50">
                    <td className="px-3 py-2 text-slate-600">🎉 Ngày lễ ({result.holidayHours.toFixed(1)}h × {DEFAULT_RATES.HOLIDAY_BONUS})</td>
                    <td className="px-3 py-2 text-right font-bold text-red-700">{formatVND(result.holidayPay)}</td>
                  </tr>
                )}
                {result.overtimeHours > 0 && (
                  <tr className="border-b border-emerald-100 bg-amber-50/50">
                    <td className="px-3 py-2 text-slate-600">⏰ OT ({result.overtimeHours.toFixed(1)}h × {DEFAULT_RATES.OVERTIME_BONUS})</td>
                    <td className="px-3 py-2 text-right font-bold text-amber-700">{formatVND(result.overtimePay)}</td>
                  </tr>
                )}
                <tr className="border-b border-emerald-200 bg-emerald-50">
                  <td className="px-3 py-2 font-bold text-emerald-900">💰 Gross (trước thuế)</td>
                  <td className="px-3 py-2 text-right font-black text-emerald-800 text-sm">{formatVND(result.gross)}</td>
                </tr>
                {result.tax > 0 && (
                  <tr className="border-b border-emerald-100">
                    <td className="px-3 py-2 text-slate-500">📋 Thuế TNCN tạm tính ({(result.taxRate * 100).toFixed(0)}%)</td>
                    <td className="px-3 py-2 text-right text-red-500 font-semibold">- {formatVND(result.tax)}</td>
                  </tr>
                )}
                <tr className="bg-emerald-600">
                  <td className="px-3 py-2.5 font-black text-white">✅ Thực nhận ước tính</td>
                  <td className="px-3 py-2.5 text-right font-black text-white text-base">{formatVND(result.net)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Đơn giá */}
          <div className="text-[10px] text-emerald-700 bg-emerald-100/60 rounded-xl px-3 py-2">
            Đơn giá: <strong>{formatVND(result.hourlyRate)}/giờ</strong>
            {isPT ? ' (Part-Time)' : ' (Full-Time ước tính)'}
            {' • '}Cuối tuần ×{DEFAULT_RATES.WEEKEND_BONUS} • Lễ ×{DEFAULT_RATES.HOLIDAY_BONUS}
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-1.5 text-[10px] text-slate-500">
            <Info size={11} className="flex-shrink-0 mt-0.5 text-slate-400" />
            <span>Đây là <strong>ước tính tham khảo</strong> dựa trên giờ công chấm công. Số thực tế do bộ phận C&B tính toán chính thức. Đơn giá có thể khác tùy hợp đồng cá nhân.</span>
          </div>
        </div>
      )}
    </div>
  );
}
