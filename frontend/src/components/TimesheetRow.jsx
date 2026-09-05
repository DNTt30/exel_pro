import React, { memo, useState, useEffect } from 'react';
import { SHIFTS } from '../data/initialData';
import { getRoleBadgeInfo, SCHEDULE_RULES, NIGHT_SHIFT_MULTIPLIER, DEFAULT_PT_HOURLY_RATE } from '../data/constants';
import { getShiftCode, getCoveringStore } from '../utils/shiftHelper';

/**
 * Ô nhập công thực tế:
 * - Hỗ trợ cả số (0, 4, 8, 8.5...) và mã chữ (OFF, AL, PL, UL, SL)
 * - Khi nhập '0' hoặc 'OFF': không bị rơi về placeholder số 8 của lịch
 * - Kèm chip chọn nhanh tiện lợi
 */
function AttendanceCell({ empId, day, initial, placeholderText, onCommit }) {
  const [val, setVal] = useState(initial ?? '');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setVal(initial ?? '');
  }, [initial, focused]);

  const has = String(val).trim() !== '';
  const isZeroOrOff = val === '0' || String(val).toUpperCase() === 'OFF' || String(val).replace(',', '.') === '0';

  const applyQuickValue = (newVal) => {
    setVal(newVal);
    onCommit(empId, day, newVal);
  };

  return (
    <div className="relative group/cell w-full">
      <input
        type="text"
        inputMode="decimal"
        value={val}
        placeholder={has ? '' : (placeholderText === '0' ? '0' : placeholderText)}
        onFocus={() => setFocused(true)}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { 
          if (e.key === 'Enter') e.target.blur();
          if (e.key === 'Escape') {
            setVal(initial ?? '');
            e.target.blur();
          }
        }}
        onBlur={() => {
          setFocused(false);
          const trimmed = String(val).trim();
          if (trimmed !== String(initial ?? '').trim()) {
            onCommit(empId, day, trimmed);
          }
        }}
        className={`w-full px-0.5 py-1 text-[10px] font-bold text-center rounded border outline-none uppercase transition-all ${
          focused
            ? 'ring-2 ring-blue-500 bg-white border-blue-400 z-10'
            : has 
              ? (isZeroOrOff 
                  ? 'bg-slate-100 border-slate-400 text-slate-700 shadow-2xs' 
                  : 'bg-amber-50 border-amber-400 text-amber-900 shadow-2xs font-black') 
              : 'bg-white border-slate-200 text-slate-400'
        }`}
        title={has 
          ? `Công thực tế: ${val} (đã ghi đè). Xóa trống để theo lịch.` 
          : `Mặc định theo lịch: ${placeholderText || 'OFF'}. Gõ số giờ (vd: 7.84 hoặc 7,84 từ ezHR9) hoặc OFF/AL/PL`}
      />

      {/* Quick selection chips popup when focused */}
      {focused && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-30 bg-slate-900 text-white rounded-lg p-1 shadow-xl flex items-center gap-1 text-[9px] font-bold whitespace-nowrap">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyQuickValue('8'); }}
            className="px-1.5 py-0.5 rounded hover:bg-slate-700 text-cyan-300"
          >
            8h
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyQuickValue('4'); }}
            className="px-1.5 py-0.5 rounded hover:bg-slate-700 text-amber-300"
          >
            4h
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyQuickValue('0'); }}
            className="px-1.5 py-0.5 rounded hover:bg-slate-700 text-rose-300"
          >
            0h
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyQuickValue('OFF'); }}
            className="px-1.5 py-0.5 rounded hover:bg-slate-700 text-rose-400"
          >
            OFF
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyQuickValue('AL'); }}
            className="px-1.5 py-0.5 rounded hover:bg-slate-700 text-emerald-300"
          >
            AL
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyQuickValue(''); }}
            className="px-1.5 py-0.5 rounded hover:bg-rose-800 text-slate-400"
            title="Khôi phục theo lịch"
          >
            Xóa
          </button>
        </div>
      )}
    </div>
  );
}

const TimesheetRow = memo(({ emp, idx, activeDays, getDayValue, editMode = false, getActualValue, onActualChange }) => {
  // Tính toán Auto-sum — ưu tiên CÔNG THỰC TẾ (ezHR) khi có override
  let totalPT = 0;
  let totalFT = 0;
  
  const isPT = emp.type === 'STPT' || emp.type === 'PARTTIME' || (emp.role && emp.role.includes('PT'));
  
  activeDays.forEach(day => {
    let val = getDayValue(emp.id, day);
    if (getActualValue) {
      const act = getActualValue(emp.id, day);
      if (act !== null && act !== undefined && act !== '') val = String(act);
    }
    if (val && val !== 'OFF' && val !== 'off') {
      const normalizedVal = String(val).trim().replace(',', '.');
      const parsed = parseFloat(normalizedVal);
      let num = 0;
      if (!isNaN(parsed)) {
        num = parsed;
      } else {
        const u = String(val).trim().toUpperCase();
        if (u === 'AL' || u === 'PL') num = 8;
        else if (u === 'AL_H' || u === 'PL_H') num = 4;
      }
      
      if (num > 0) {
        // Phụ cấp ca đêm (x1.3)
        const isNight = String(val).includes('22-6');
        const effectiveHours = isNight ? num * NIGHT_SHIFT_MULTIPLIER : num;

        if (isPT) totalPT += effectiveHours;
        else totalFT += effectiveHours;
      }
    }
  });

  totalPT = Math.round(totalPT * 100) / 100;
  totalFT = Math.round(totalFT * 100) / 100;
  const isPTOvertimed = isPT && totalPT > SCHEDULE_RULES.STPT_MAX_HOURS_PER_MONTH;
  const tongCong = Math.round((totalPT + totalFT) * 100) / 100;
  
  // Ước tính lương (Ví dụ cơ bản: 25k/h cho PT)
  const estSalary = isPT ? Math.round(totalPT * DEFAULT_PT_HOURLY_RATE).toLocaleString('vi-VN') + 'đ' : '—';

  const badgeInfo = getRoleBadgeInfo(emp.role || emp.type);

  return (
    <tr className="hover:bg-slate-50 border-b border-slate-200 group/row">
      <td className="text-center text-slate-400 font-mono min-w-[40px] w-[40px] max-w-[40px] md:sticky left-0 z-10 bg-white group-hover/row:bg-slate-50 border-r border-slate-300">
        {idx + 1}
      </td>
      <td className="hidden md:table-cell text-center font-mono text-slate-600 min-w-[96px] w-[96px] max-w-[96px] md:sticky z-10 bg-white group-hover/row:bg-slate-50 border-r border-slate-300" style={{ left: '40px' }}>
        {emp.id}
      </td>
      <td className="font-bold text-slate-800 min-w-[150px] md:min-w-[192px] w-[150px] md:w-[192px] max-w-[150px] md:max-w-[192px] sticky md:z-10 z-20 bg-white group-hover/row:bg-slate-50 border-r border-slate-300 truncate px-2 left-0 md:left-[136px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
        {emp.name}
      </td>
      <td className="hidden md:table-cell text-center font-semibold text-slate-600 min-w-[80px] w-[80px] max-w-[80px] md:sticky z-10 bg-white group-hover/row:bg-slate-50 border-r border-slate-300" style={{ left: '328px' }}>
        {emp.dept}
      </td>
      <td className="hidden lg:table-cell text-center min-w-[120px] w-[120px] max-w-[120px] lg:sticky z-10 bg-white group-hover/row:bg-slate-50 border-r border-slate-400 px-1" style={{ left: '408px' }}>
        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeInfo.badgeCls}`}>
          {badgeInfo.id}
        </span>
      </td>
      
      {/* 31 Ngày */}
      {activeDays.map(day => {
        const val = getDayValue(emp.id, day);
        const isOff = !val || val === 'OFF' || val === 'off' || val === '-';
        
        let badgeStyle = { backgroundColor: '#ffffff', color: '#94a3b8' };
        if (!isOff) {
          const actual = getShiftCode(val);
          if (getCoveringStore(val)) {
            badgeStyle = { backgroundColor: '#eab308', color: '#ffffff' };
          } else if (SHIFTS[actual]) {
            badgeStyle = { backgroundColor: SHIFTS[actual].bg, color: SHIFTS[actual].text };
          } else {
            badgeStyle = { backgroundColor: '#3b82f6', color: '#ffffff' };
          }
        }

        if (editMode && onActualChange) {
          const raw = getActualValue ? getActualValue(emp.id, day) : '';
          const initial = (raw === null || raw === undefined) ? '' : String(raw);
          return (
            <td key={day} className="min-w-[48px] w-[48px] max-w-[48px] p-0.5 border-r border-slate-200 text-center">
              <AttendanceCell
                empId={emp.id}
                day={day}
                initial={initial}
                placeholderText={isOff ? '' : String(val)}
                onCommit={onActualChange}
              />
            </td>
          );
        }

        // UU TIEN HIEN THI: cong thuc te override > lich xep
        const actDisp = getActualValue ? getActualValue(emp.id, day) : '';
        const actStr = String(actDisp ?? '').trim().toUpperCase();
        const normActStr = actStr.replace(',', '.');
        const actNum = parseFloat(normActStr);
        const hasActNum = actStr !== '' && !isNaN(actNum);
        return (
          <td key={day} className="min-w-[48px] w-[48px] max-w-[48px] p-0.5 border-r border-slate-200 text-center font-semibold">
            {hasActNum ? (
              actNum === 0 ? (
                <span 
                  className="inline-block w-full py-0.5 px-0.5 rounded text-[10px] font-extrabold bg-slate-200 text-slate-700 border border-slate-300 leading-tight" 
                  title={`Công thực tế: 0h (Lịch xếp: ${val || 'OFF'})`}
                >
                  0
                </span>
              ) : (
                <span 
                  className="inline-block w-full py-0.5 px-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 leading-tight" 
                  title={`Công thực tế: ${actNum}h (Lịch xếp: ${val || 'OFF'})`}
                >
                  {actNum}
                </span>
              )
            ) : actStr === 'OFF' ? (
              <span 
                className="inline-block w-full py-0.5 px-0.5 rounded text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 leading-tight" 
                title={`Chấm nghỉ (OFF). Lịch xếp: ${val || 'OFF'}`}
              >
                OFF
              </span>
            ) : actStr !== '' ? (
              <span 
                className="inline-block w-full py-0.5 px-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 leading-tight" 
                title={`Mã công: ${actStr} (Lịch xếp: ${val || 'OFF'})`}
              >
                {actStr}
              </span>
            ) : isOff ? (
              <span className="text-slate-300 text-[11px] block py-1" title="Lịch xếp: OFF">-</span>
            ) : (
              <span 
                className="inline-block w-full py-0.5 px-0.5 rounded text-[10px] font-bold truncate leading-tight shadow-2xs"
                style={badgeStyle}
                title={`Theo lịch xếp: ${val} (Chưa ghi đè thực tế)`}
              >
                {val}
              </span>
            )}
            <div className="hidden print:block text-center font-bold text-[10px] text-black py-0.5">
              {actStr || val || '-'}
            </div>
          </td>
        );
      })}
      
      {/* Tổng Hợp — khớp đúng 3 cột header: Giờ FT | Giờ PT | Tổng */}
      <td className="min-w-[64px] w-[64px] text-center font-bold text-blue-700 border-l border-slate-300 bg-slate-50">{totalFT > 0 ? totalFT.toFixed(2) : '0.00'}</td>
      <td className={`min-w-[64px] w-[64px] text-center font-bold ${
        isPTOvertimed 
          ? 'bg-red-100 text-red-700 font-extrabold cursor-help' 
          : 'bg-slate-100 text-blue-700'
      }`} title={isPTOvertimed ? `⚠️ Cảnh báo: Part-time vượt định mức tháng (${totalPT.toFixed(2)}h / 91h)` : ''}>
        {isPTOvertimed ? `⚠️ ${totalPT.toFixed(2)}` : (totalPT > 0 ? totalPT.toFixed(2) : '0.00')}
      </td>
      <td className="min-w-[64px] w-[64px] text-center font-black text-emerald-700 bg-emerald-50">{tongCong > 0 ? tongCong.toFixed(2) : '0.00'}</td>
      <td className="min-w-[80px] w-[80px] text-center font-bold text-amber-700 bg-amber-50">{estSalary}</td>
    </tr>
  );
});

export default TimesheetRow;