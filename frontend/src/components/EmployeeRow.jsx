import React, { memo, useState } from 'react';
import ShiftInput from './ShiftInput';
import { SHIFTS } from '../data/initialData';
import { useStore } from '../store/useStore';
import { Edit2 } from 'lucide-react';

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const EmployeeRow = memo(({ emp, empSched, idx, absoluteRowIdx, handleShiftChange, isAdmin }) => {
  const updateEmployee = useStore(state => state.updateEmployee);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(emp.name);
  
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editRole, setEditRole] = useState(emp.role || emp.type);

  const handleNameBlur = () => {
    setIsEditingName(false);
    if (editName !== emp.name && editName.trim()) {
      updateEmployee(emp.id, { name: editName.trim() });
    } else {
      setEditName(emp.name);
    }
  };

  const handleRoleBlur = () => {
    setIsEditingRole(false);
    if (editRole !== (emp.role || emp.type) && editRole.trim()) {
      const type = editRole.includes('PT') ? 'PARTTIME' : 'FULLTIME';
      updateEmployee(emp.id, { role: editRole.trim(), type });
    } else {
      setEditRole(emp.role || emp.type);
    }
  };

  const handleKeyDown = (e, blurFn) => {
    if (e.key === 'Enter') blurFn();
  };

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
    <tr className="hover:bg-slate-50 group/row">
      <td className="text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
      <td className="sticky-col-1 group-hover/row:bg-slate-50" style={{ left: 0 }}>
        <div className="flex items-center gap-1 w-52 overflow-hidden">
          {isEditingName ? (
            <input 
              autoFocus
              className="w-full text-sm font-bold text-slate-800 border-b-2 border-blue-500 outline-none bg-white px-1"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={e => handleKeyDown(e, handleNameBlur)}
            />
          ) : (
            <div 
              className={`font-bold text-slate-800 truncate flex items-center gap-1 ${isAdmin && !emp.isBorrowedTo ? 'cursor-pointer hover:bg-slate-200 px-1 -ml-1 rounded group/name' : ''}`}
              title={isAdmin && !emp.isBorrowedTo ? "Click để sửa" : emp.name}
              onClick={() => { if(isAdmin && !emp.isBorrowedTo) setIsEditingName(true); }}
            >
              {emp.name} 
              {isAdmin && !emp.isBorrowedTo && <Edit2 size={12} className="opacity-0 group-hover/name:opacity-100 text-blue-500" />}
              {emp.isBorrowedTo && <span className="text-xs text-orange-600 font-normal italic ml-1">(Hỗ trợ)</span>}
              {validationWarning && (
                <span title={validationWarning} className="text-red-500 cursor-help flex-shrink-0 ml-1">⚠️</span>
              )}
            </div>
          )}
        </div>
        <div className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">{emp.id}</div>
      </td>
      <td className="sticky-col-2 text-center align-middle" style={{ left: '224px' }}>
        {isEditingRole ? (
          <select 
            autoFocus
            className="w-full bg-white text-slate-600 px-1 py-0.5 rounded text-[10px] font-bold border-2 border-blue-500 outline-none"
            value={editRole}
            onChange={e => setEditRole(e.target.value)}
            onBlur={handleRoleBlur}
            onKeyDown={e => handleKeyDown(e, handleRoleBlur)}
          >
            <option value="STFT">STFT</option>
            <option value="PT">PT</option>
            <option value="CSR">CSR</option>
            <option value="Cửa hàng trưởng">Cửa hàng trưởng</option>
            <option value="SM">SM</option>
          </select>
        ) : (
          <span 
            className={`inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-200 group/role ${isAdmin && !emp.isBorrowedTo ? 'cursor-pointer hover:bg-slate-200 hover:border-slate-300' : ''}`}
            title={isAdmin && !emp.isBorrowedTo ? "Click để sửa" : ''}
            onClick={() => { if(isAdmin && !emp.isBorrowedTo) setIsEditingRole(true); }}
          >
            {emp.role || emp.type}
            {isAdmin && !emp.isBorrowedTo && <Edit2 size={10} className="opacity-0 group-hover/role:opacity-100 text-blue-500" />}
          </span>
        )}
      </td>
      
      {WEEK_DAYS.map((day, dIdx) => {
        const val = empSched[day] || '';
        const { display, colorClass } = parseShiftForCell(emp, val);
        
        return (
          <td key={day} className={`p-0 border-r border-b border-slate-300 ${colorClass}`}>
            <ShiftInput 
              value={display}
              onChange={(newVal) => handleShiftChange(emp, day, newVal)}
              rowIndex={absoluteRowIdx}
              colIndex={dIdx}
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
  return prevProps.empSched === nextProps.empSched && prevProps.emp === nextProps.emp && prevProps.idx === nextProps.idx && prevProps.isAdmin === nextProps.isAdmin && prevProps.absoluteRowIdx === nextProps.absoluteRowIdx;
});

export default EmployeeRow;
