import React, { memo } from 'react';
import ShiftInput from './ShiftInput';
import { SHIFTS } from '../data/initialData';

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const EmployeeRow = memo(({ emp, empSched, idx, handleShiftChange }) => {
  let totalH = 0;
  let totalShifts = 0;
  
  const parseShiftForCell = (emp, val) => {
    if (!val) return { display: '', isBorrowedSlot: false, colorClass: '' };
    if (val.includes('_')) {
      const parts = val.split('_');
      const targetStore = parts.pop();
      const actualShift = parts.join('_');
      
      if (emp.isBorrowedTo) {
        if (targetStore === emp.isBorrowedTo) {
          return { display: actualShift === 'off' ? '' : actualShift, isBorrowedSlot: true, colorClass: 'bg-orange-50 text-orange-700' };
        } else {
          return { display: '', isBorrowedSlot: false, colorClass: 'bg-slate-100' };
        }
      } else {
        return { display: actualShift === 'off' ? `off ${targetStore}` : `${actualShift} ${targetStore}`, isBorrowedSlot: true, colorClass: 'bg-slate-100 text-slate-500 italic text-[10px]' };
      }
    } else {
      if (emp.isBorrowedTo) {
        return { display: '', isBorrowedSlot: false, colorClass: 'bg-slate-100' };
      }
      return { display: val, isBorrowedSlot: false, colorClass: '' };
    }
  };

  WEEK_DAYS.forEach(d => {
    const s = empSched[d];
    if (s && s !== 'off') {
      if (emp.isBorrowedTo && (!s.includes('_' + emp.isBorrowedTo))) return;
      if (!emp.isBorrowedTo && s.includes('_')) return;
      
      let actualShift = s;
      if (s.includes('_')) actualShift = s.split('_')[0];
      if (actualShift === 'off') return;

      totalShifts++;
      if (SHIFTS[actualShift]) {
        totalH += SHIFTS[actualShift].hours;
      } else {
        const match = actualShift.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
        if (match) {
          let start = parseInt(match[1], 10);
          let end = parseInt(match[2], 10);
          if (end < start) end += 24;
          totalH += (end - start);
        }
      }
    }
  });
  
  const isOvertime = totalH > (emp.maxH || 48);
  const isMissing = totalH === 0;
  
  let validationWarning = null;
  const role = emp.role || emp.type || '';
  if (!emp.isBorrowedTo) {
    if (role.includes('PT') && totalH > 0 && totalH < 16) {
      validationWarning = 'Thiếu giờ (Min 16h)';
    } else if ((role.includes('FT') || role.includes('CSR')) && totalShifts > 0 && totalShifts !== 6) {
      validationWarning = `Sai số ca (${totalShifts}/6)`;
    }
  }

  return (
    <tr className="hover:bg-slate-50 group">
      <td className="text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
      <td className="sticky-col-1 font-bold text-slate-800 group-hover:bg-slate-50" style={{ left: 0 }}>
        <div className="truncate w-52 flex items-center gap-1" title={emp.name}>
          {emp.name} {emp.isBorrowedTo && <span className="text-xs text-orange-600 font-normal italic">(Hỗ trợ)</span>}
          {validationWarning && (
            <span title={validationWarning} className="text-red-500 cursor-help flex-shrink-0">⚠️</span>
          )}
        </div>
        <div className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">{emp.id}</div>
      </td>
      <td className="sticky-col-2 text-center" style={{ left: '224px' }}>
        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-200">{emp.role || emp.type}</span>
      </td>
      
      {WEEK_DAYS.map(day => {
        const val = empSched[day] || '';
        const { display, colorClass } = parseShiftForCell(emp, val);
        
        return (
          <td key={day} className={`p-0 border-r border-b border-slate-300 ${colorClass}`}>
            <ShiftInput 
              value={display}
              onChange={(newVal) => handleShiftChange(emp, day, newVal)}
            />
          </td>
        );
      })}
      
      <td className={`text-center font-bold ${isOvertime || validationWarning ? 'bg-red-50 text-red-600' : isMissing ? 'text-amber-500' : 'text-emerald-600'}`}>
        {totalH}h
        {validationWarning && <div className="text-[9px] font-normal leading-none mt-1">{validationWarning}</div>}
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  // Custom memo comparison function:
  // Only re-render if empSched object ref changed, or emp object ref changed
  return prevProps.empSched === nextProps.empSched && prevProps.emp === nextProps.emp && prevProps.idx === nextProps.idx;
});

export default EmployeeRow;
