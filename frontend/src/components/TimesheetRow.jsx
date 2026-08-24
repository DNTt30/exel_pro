import React, { memo, useState, useEffect } from 'react';
import { SHIFTS } from '../data/initialData';
import { getRoleBadgeInfo } from '../data/constants';
import { getShiftCode, getCoveringStore } from '../utils/shiftHelper';

/**
 * Ô nhap cong thuc te: tu giu gia tri khi dang go (khong bi reset boi re-render),
 * chi commit len DB khi roi khoi o hoac nhan Enter. Neu trong = tra ve theo lich.
 */
function AttendanceCell({ empId, day, initial, placeholderText, onCommit }) {
  const [val, setVal] = useState(initial ?? '');
  const [focused, setFocused] = useState(false);

  // Dong bo khi du lieu thay doi tu ngoai (tai lai / xoa override) neu khong focus
  useEffect(() => {
    if (!focused) setVal(initial ?? '');
  }, [initial, focused]);

  const has = String(val).trim() !== '';
  return (
    <input
      type="number" step="0.5" min="0" max="16"
      value={val}
      placeholder={has ? '' : placeholderText}
      onFocus={() => setFocused(true)}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
      onBlur={() => {
        setFocused(false);
        if (String(val).trim() !== String(initial ?? '')) onCommit(empId, day, val);
      }}
      className={`w-full px-0.5 py-1 text-[10px] font-bold text-center rounded border outline-none focus:ring-1 focus:ring-blue-500 ${has ? 'bg-amber-50 border-amber-400 text-amber-800' : 'bg-white border-slate-200 text-slate-700'}`}
      title={has ? 'Cong thuc te (ezHR) - nen vang = ghi de lich xep' : 'Nhap gio thuc te de ghi de lich xep'}
    />
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
    if (val && val !== 'OFF') {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        if (isPT) totalPT += num;
        else totalFT += num;
      }
    }
  });

  const isPTOvertimed = isPT && totalPT > 91;
  const tongCong = totalPT + totalFT;
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

        return (
          <td key={day} className="min-w-[48px] w-[48px] max-w-[48px] p-0.5 border-r border-slate-200 text-center font-semibold">
            {isOff ? (
              <span className="text-slate-300 text-[11px] block py-1">-</span>
            ) : (
              <span 
                className="inline-block w-full py-0.5 px-0.5 rounded text-[10px] font-bold truncate leading-tight shadow-2xs"
                style={badgeStyle}
              >
                {val}
              </span>
            )}
            <div className="hidden print:block text-center font-bold text-[10px] text-black py-0.5">
              {val || '-'}
            </div>
          </td>
        );
      })}
      
      {/* Tổng Hợp */}
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-200 bg-slate-50">0.00</td>
      <td className={`min-w-[64px] w-[64px] text-center font-bold border-r border-slate-200 ${
        isPTOvertimed 
          ? 'bg-red-100 text-red-700 font-extrabold cursor-help' 
          : 'text-blue-700 bg-slate-50'
      }`} title={isPTOvertimed ? `⚠️ Cảnh báo: Nhân viên Part-time vượt quá 91h/tháng (${totalPT.toFixed(2)}h / 91h)` : ''}>
        {isPTOvertimed ? `⚠️ ${totalPT.toFixed(2)}` : (totalPT > 0 ? totalPT.toFixed(2) : '0.00')}
      </td>
      <td className="min-w-[64px] w-[64px] text-center font-bold text-blue-700 border-r border-slate-200 bg-slate-50">{totalFT > 0 ? totalFT.toFixed(2) : '0.00'}</td>
      <td className="min-w-[48px] w-[48px] text-center text-red-600 border-r border-slate-200 bg-slate-50">0.00</td>
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-200 bg-slate-50">0.00</td>
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-200 bg-slate-50">0.00</td>
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-200 bg-slate-50">0.00</td>
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-200 bg-slate-50">0.00</td>
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-200 bg-slate-50">0.00</td>
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-200 bg-slate-50">0.00</td>
      <td className="min-w-[80px] w-[80px] text-center font-bold text-emerald-700 bg-emerald-50 border-r border-slate-400">{tongCong > 0 ? tongCong.toFixed(2) : '0.00'}</td>

      {/* OT Ngày */}
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-200">0.00</td>
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-200">0.00</td>
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-400">0.00</td>

      {/* OT Đêm */}
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-200">0.00</td>
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-200">0.00</td>
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-400">0.00</td>

      {/* Nghỉ bù */}
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-200">0.00</td>
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-200">0.00</td>
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-400">0.00</td>

      {/* Training */}
      <td className="min-w-[64px] w-[64px] text-center border-r border-slate-200">0.00</td>
      <td className="min-w-[64px] w-[64px] text-center">0.00</td>
    </tr>
  );
});

export default TimesheetRow;