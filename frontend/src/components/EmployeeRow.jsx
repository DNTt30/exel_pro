import React, { memo, useState } from 'react';
import ShiftInput from './ShiftInput';
import { useStore } from '../store/useStore';
import { Edit2 } from 'lucide-react';
import { STANDARD_ROLES, getRoleBadgeInfo } from '../data/constants';
import { parseShiftForCell, calculateEmployeeWeeklyHours, validateEmployeeSchedule } from '../utils/shiftHelper';

// So sánh lịch theo GIÁ TRỊ: view tháng ở cha tạo object mới mỗi render,
// so sánh tham chiếu sẽ vô hiệu hóa memo.
const schedShallowEqual = (a, b) => {
  if (a === b) return true;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => a[k] === b[k]);
};

const EmployeeRow = memo(({ 
  emp, 
  empSched, 
  idx, 
  absoluteRowIdx, 
  handleShiftChange, 
  isAdmin, 
  canEdit,
  days,
  isDraft
}) => {
  const canEditShifts = canEdit ?? isAdmin;
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
      const roleInfo = STANDARD_ROLES.find(r => r.id === editRole.trim()) || { type: 'STFT', defaultMaxH: 48 };
      updateEmployee(emp.id, { 
        role: editRole.trim(), 
        type: roleInfo.type, 
        maxH: roleInfo.defaultMaxH 
      });
    } else {
      setEditRole(emp.role || emp.type);
    }
  };

  const handleKeyDown = (e, blurFn) => {
    if (e.key === 'Enter') blurFn();
  };

  const isMonthView = days.length > 7;

  // Tính toán trực tiếp tổng giờ & tổng số ca từ lịch thực tế
  const { totalHours, totalShifts } = calculateEmployeeWeeklyHours(emp, empSched, days);

  // Validate theo rules (PT min/max, FT min hours/shifts)
  const validation = validateEmployeeSchedule(emp, totalHours, totalShifts, isMonthView);

  return (
    <tr className="hover:bg-slate-50 group/row h-8">
      {/* STT */}
      <td className="text-center text-slate-400 font-mono text-xs min-w-[48px] w-[48px] max-w-[48px] sticky left-0 z-10 group-hover/row:bg-slate-50 bg-white border-r border-b border-slate-300 p-0">
        {idx + 1}
      </td>

      {/* Mã Nhân Viên */}
      <td className="hidden md:table-cell text-center font-mono text-slate-600 text-xs min-w-[96px] w-[96px] max-w-[96px] sticky left-[48px] z-10 group-hover/row:bg-slate-50 border-r border-b border-slate-300 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] p-0 align-middle">
        {emp.id}
      </td>

      {/* Họ và Tên */}
      <td className="min-w-[150px] md:min-w-[192px] w-[150px] md:w-[192px] max-w-[150px] md:max-w-[192px] sticky left-[48px] md:left-[144px] z-10 group-hover/row:bg-slate-50 border-r border-b border-slate-300 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] p-0">
        <div className="flex flex-col justify-center h-full">
          <div className="flex items-center gap-1 w-full overflow-hidden px-1">
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
                className={`font-bold text-slate-800 truncate flex items-center gap-1 ${
                  isAdmin && !emp.isBorrowedTo ? 'cursor-pointer hover:bg-slate-200 px-1 -ml-1 rounded group/name' : ''
                }`}
                title={isAdmin && !emp.isBorrowedTo ? "Click để sửa họ tên" : emp.name}
                onClick={() => { if (isAdmin && !emp.isBorrowedTo) setIsEditingName(true); }}
              >
                {emp.name} 
                {isAdmin && !emp.isBorrowedTo && (
                  <Edit2 size={12} className="opacity-0 group-hover/name:opacity-100 text-blue-500 flex-shrink-0" />
                )}
                {emp.isBorrowedTo && (
                  <span className="text-xs text-orange-600 font-normal italic ml-1 flex-shrink-0">
                    (Hỗ trợ)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Vị trí / Loại hình */}
      <td 
        className="hidden md:table-cell min-w-[96px] w-[96px] max-w-[96px] text-center align-middle sticky z-10 group-hover/row:bg-slate-50 border-r border-b border-slate-300 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] p-0" 
        style={{ left: '336px' }}
      >
        {isEditingRole ? (
          <select 
            autoFocus
            className="w-full bg-white text-slate-700 px-1 py-0.5 rounded text-[10px] font-bold border-2 border-blue-500 outline-none"
            value={editRole}
            onChange={e => setEditRole(e.target.value)}
            onBlur={handleRoleBlur}
            onKeyDown={e => handleKeyDown(e, handleRoleBlur)}
          >
            {STANDARD_ROLES.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        ) : (
          (() => {
            const badge = getRoleBadgeInfo(emp.role || emp.type);
            return (
              <span 
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.badgeCls} group/role ${
                  isAdmin && !emp.isBorrowedTo ? 'cursor-pointer hover:brightness-95' : ''
                }`}
                title={isAdmin && !emp.isBorrowedTo ? "Click để sửa vị trí" : ''}
                onClick={() => { if (isAdmin && !emp.isBorrowedTo) setIsEditingRole(true); }}
              >
                <span className="truncate">{badge.id}</span>
                {isAdmin && !emp.isBorrowedTo && (
                  <Edit2 size={10} className="opacity-0 group-hover/role:opacity-100 text-blue-500 flex-shrink-0" />
                )}
              </span>
            );
          })()
        )}
      </td>
      
      {/* Dynamic Day Shift Cells */}
      {days.map((day, dIdx) => {
        const rawVal = empSched[day] || '';
        const { display, colorClass } = parseShiftForCell(emp, rawVal);
        
        return (
          <td key={day} className={`p-0 border-r border-b border-slate-300 ${colorClass}`}>
            <ShiftInput 
              value={display}
              rawValue={rawVal}
              onChange={(newVal) => handleShiftChange(emp, day, newVal)}
              rowIndex={absoluteRowIdx}
              colIndex={dIdx}
              readOnly={!canEditShifts}
              isDraft={isDraft}
            />
          </td>
        );
      })}
      
      {/* Total Hours Cell with Dynamic Warning Badges */}
      <td className={`text-center font-bold border-b border-slate-300 relative group/totalcell ${
        validation.hasErrors 
          ? 'bg-red-100 text-red-700 font-extrabold cursor-help' 
          : validation.hasWarnings 
            ? 'bg-amber-50 text-amber-800 font-semibold cursor-help' 
            : totalHours === 0 
              ? 'text-slate-400 bg-slate-50' 
              : 'text-emerald-700 bg-emerald-50/50'
      }`}>
        <div className="flex items-center justify-center gap-1">
          {validation.hasErrors && <span className="text-[11px] text-red-600 animate-pulse">⚠️</span>}
          {!validation.hasErrors && validation.hasWarnings && <span className="text-[11px] text-amber-500">⚡</span>}
          <span>{totalHours}h</span>
          {validation.isFT && !isMonthView && (
            <span className="text-[10px] font-normal text-slate-500">({totalShifts}ca)</span>
          )}
        </div>

        {/* Warning Tooltip */}
        {validation.warnings.length > 0 && (
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-1 hidden group-hover/totalcell:block bg-slate-900 text-white text-[11px] font-medium py-2 px-3 rounded-xl shadow-2xl z-30 whitespace-nowrap pointer-events-none border border-slate-700 min-w-[200px] text-left">
            <div className="font-bold text-amber-300 border-b border-slate-700 pb-1 mb-1 flex items-center gap-1">
              <span>CẢNH BÁO QUY CHUẨN XẾP CA:</span>
            </div>
            <ul className="space-y-1 text-slate-200">
              {validation.warnings.map((w, wIdx) => (
                <li key={wIdx} className={`flex items-start gap-1.5 ${w.type === 'error' ? 'text-red-300' : 'text-amber-200'}`}>
                  <span>•</span>
                  <span>{w.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  return (
    schedShallowEqual(prevProps.empSched, nextProps.empSched) && 
    prevProps.emp === nextProps.emp && 
    prevProps.idx === nextProps.idx && 
    prevProps.isAdmin === nextProps.isAdmin && 
    prevProps.canEdit === nextProps.canEdit && 
    prevProps.absoluteRowIdx === nextProps.absoluteRowIdx && 
    prevProps.days === nextProps.days &&
    prevProps.isDraft === nextProps.isDraft
  );
});

export default EmployeeRow;
