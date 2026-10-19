import React, { memo, useState, useEffect, useRef } from 'react';
import { SCHEDULE_RULES } from '../data/constants';
import { timesheetHours } from '../utils/timesheetValues';
import { useEmployeeRoleName } from '../hooks/useEmployeeRoleName';

/**
 * Ô nhập công thực tế:
 * - Hỗ trợ cả số (0, 4, 8, 8.5...) và mã chữ (OFF, AL, PL, UL, SL)
 * - Khi nhập '0' hoặc 'OFF': không bị rơi về placeholder số 8 của lịch
 */
function AttendanceCell({ empId, day, dayLabel, initial, isScheduledOff, scheduledVal, onCommit }) {
  const [val, setVal] = useState(initial ?? '');
  const [focused, setFocused] = useState(false);
  const cancelBlur = useRef(false);

  useEffect(() => {
    if (!focused) setVal(initial ?? '');
  }, [initial, focused]);

  const has = String(val).trim() !== '';

  const cellBgClass = focused
    ? 'ring-2 ring-slate-500 border-slate-500 bg-white'
    : has ? 'border-blue-200 bg-blue-50 text-blue-900'
      : 'border-slate-200 bg-white text-slate-700';

  const tooltipText = has
    ? `Công thực tế: ${val}. Theo lịch: ${scheduledVal || '—'}. Xóa ô để quay lại theo lịch.`
    : isScheduledOff
      ? 'Lịch xếp: Nghỉ (OFF). Bấm để nhập số giờ nếu đi làm.'
      : `Theo lịch: ${scheduledVal || 'Chưa xếp công'}. Nhập số giờ thực tế hoặc mã nghỉ.`;

  return (
    <div className="relative group/cell w-full">
      <input
        type="text"
        inputMode="decimal"
        value={val}
        placeholder={scheduledVal || '—'}
        aria-label={`Công thực tế ${empId} ngày ${dayLabel || day}`}
        onFocus={() => setFocused(true)}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { 
          if (e.key === 'Enter') e.target.blur();
          if (e.key === 'Escape') {
            cancelBlur.current = true;
            setVal(initial ?? '');
            e.target.blur();
          }
        }}
        onBlur={() => {
          setFocused(false);
          if (cancelBlur.current) {
            cancelBlur.current = false;
            return;
          }
          const trimmed = String(val).trim();
          if (trimmed !== String(initial ?? '').trim()) {
            onCommit(empId, day, trimmed);
          }
        }}
        className={`w-full px-0.5 py-2 text-base sm:text-xs font-semibold text-center rounded border outline-none uppercase placeholder:text-slate-500 transition-colors ${cellBgClass}`}
        title={`${dayLabel || day} · ${tooltipText}`}
      />
    </div>
  );
}

const TimesheetRow = memo(({ emp, activeDays, dayLabels = {}, getDayValue, editMode = false, getActualValue, onActualChange }) => {
  const customName = useEmployeeRoleName(emp);
  const isPT = emp.type === 'STPT' || emp.type === 'PARTTIME' || emp.role?.includes('PT');
  const total = Math.round(activeDays.reduce((sum, day) => {
    const actual = getActualValue?.(emp.id, day);
    return sum + timesheetHours(actual !== null && actual !== undefined && actual !== '' ? String(actual) : getDayValue(emp.id, day));
  }, 0) * 100) / 100;
  const exceedsLimit = isPT && total > SCHEDULE_RULES.STPT_MAX_HOURS_PER_MONTH;

  return <tr className="group/row border-b border-slate-200 hover:bg-slate-50">
    <th scope="row" className="sticky left-0 z-10 w-[144px] min-w-[144px] max-w-[144px] border-b border-r border-slate-200 bg-white px-3 py-3 text-left group-hover/row:bg-slate-50 sm:w-[208px] sm:min-w-[208px] sm:max-w-[208px]">
      <span className="block truncate text-sm font-semibold text-slate-900" title={emp.name}>{emp.name}</span>
      <span className="block truncate text-[11px] font-normal text-slate-500" title={`${emp.id} · ${customName || emp.role || emp.type || ''}`}>{emp.id} · {customName || emp.role || emp.type}</span>
    </th>
    <td className={`min-w-[72px] border-b border-r border-slate-200 px-2 text-center text-sm font-semibold tabular-nums ${exceedsLimit ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-900'}`}
      title={exceedsLimit ? `Vượt định mức ${SCHEDULE_RULES.STPT_MAX_HOURS_PER_MONTH} giờ/tháng` : 'Tổng giờ trong kỳ, ưu tiên công thực tế khi đã nhập'}>
      {total.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
      {exceedsLimit && <span className="block text-[10px] font-normal">Vượt định mức</span>}
    </td>
    {activeDays.map(day => {
      const scheduled = getDayValue(emp.id, day);
      const isOff = String(scheduled).toUpperCase() === 'OFF';
      const actual = getActualValue?.(emp.id, day);
      const hasActual = actual !== null && actual !== undefined && String(actual).trim() !== '';
      const value = hasActual ? String(actual).trim().toUpperCase() : isOff ? 'OFF' : String(scheduled ?? '');
      return <td key={day} className={`min-w-[72px] w-[72px] border-b border-r border-slate-200 px-1 py-2 text-center ${hasActual ? 'bg-blue-50/60' : ''}`}>
        {editMode && onActualChange ? <AttendanceCell
          empId={emp.id} day={day} dayLabel={dayLabels[day]} initial={hasActual ? String(actual) : ''}
          isScheduledOff={isOff} scheduledVal={isOff ? 'OFF' : String(scheduled ?? '')} onCommit={onActualChange}
        /> : <span className={`block text-xs tabular-nums ${hasActual ? 'font-semibold text-blue-900' : value === 'OFF' || !value || value === '-' ? 'text-slate-400' : 'text-slate-700'}`}
          title={`${dayLabels[day]} · ${hasActual ? `Công thực tế: ${value}. Lịch: ${scheduled || '—'}` : `Theo lịch: ${value || 'Chưa xếp'}`}`}>
          {value || '—'}
        </span>}
      </td>;
    })}
  </tr>;
});

export default TimesheetRow;
