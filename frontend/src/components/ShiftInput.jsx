import React, { useRef } from 'react';
import { SHIFTS } from '../data/initialData';
import { normalizeShift } from '../utils/shiftHelper';

export default function ShiftInput({ 
  value, 
  rawValue, 
  onChange, 
  rowIndex, 
  colIndex, 
  readOnly = false 
}) {
  const selectRef = useRef(null);

  // Normalize current shift and covering status
  const normalized = normalizeShift(rawValue || value);
  const shiftCode = normalized.shift;
  const isBorrowed = Boolean(normalized.covering_store);
  
  const isUnset = !shiftCode || shiftCode === '';
  const isOff = shiftCode === 'off';
  const shiftInfo = SHIFTS[shiftCode];

  // Determine appearance based on exact status
  let cellBg = '#ffffff';
  let cellText = '#cbd5e1';
  let displayLabel = '-';

  if (isBorrowed) {
    cellBg = '#eab308'; // Vàng cho ca chi viện
    cellText = '#ffffff';
    displayLabel = shiftCode === 'off'
      ? `off ${normalized.covering_store}`
      : `${shiftCode} ${normalized.covering_store}`;
  } else if (isOff) {
    cellBg = '#f1f5f9'; // Xám nhạt cho OFF
    cellText = '#64748b'; // Xám đậm
    displayLabel = 'OFF';
  } else if (shiftInfo) {
    cellBg = shiftInfo.bg;
    cellText = shiftInfo.text;
    displayLabel = shiftInfo.label || shiftCode;
  } else if (!isUnset) {
    cellBg = '#dbeafe';
    cellText = '#1e40af';
    displayLabel = shiftCode;
  }

  // Keyboard navigation for Excel grid (Arrows, Enter, Tab)
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Enter') {
      let nextRow = rowIndex;
      let nextCol = colIndex;

      if (e.key === 'ArrowDown' || e.key === 'Enter') nextRow++;
      if (e.key === 'ArrowUp') nextRow = Math.max(0, nextRow - 1);
      if (e.key === 'ArrowLeft') nextCol = Math.max(0, nextCol - 1);
      if (e.key === 'ArrowRight') nextCol++;

      if (nextRow !== rowIndex || nextCol !== colIndex) {
        e.preventDefault();
        const nextCell = document.getElementById(`cell-${nextRow}-${nextCol}`);
        if (nextCell) {
          nextCell.focus();
        }
      }
    }
  };

  const handleChange = (e) => {
    if (readOnly) return;
    const selectedVal = e.target.value;
    onChange(selectedVal);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Screen Interactive Select Dropdown */}
      <select
        ref={selectRef}
        id={`cell-${rowIndex}-${colIndex}`}
        disabled={readOnly}
        value={isUnset ? '' : shiftCode}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        style={{
          backgroundColor: cellBg,
          color: cellText,
        }}
        title={isBorrowed ? `Hỗ trợ ${normalized.covering_store}` : undefined}
        className={`w-full h-full font-bold text-center appearance-none cursor-pointer outline-none border-0 transition-colors select-none px-0.5 py-0 ${
          isBorrowed ? 'text-[9px] leading-tight pb-2' : 'text-xs'
        } ${
          readOnly ? 'cursor-default' : 'hover:brightness-95 focus:ring-2 focus:ring-blue-500 focus:z-20'
        } ${isUnset ? 'font-normal italic' : 'font-extrabold'}`}
      >
        {/* Option: Chưa xếp ca */}
        <option value="" className="bg-white text-slate-400 font-normal">
          -
        </option>
        {/* Option: OFF / Nghỉ */}
        <option value="off" className="bg-slate-100 text-slate-700 font-bold">
          OFF
        </option>
        {/* Standard Shifts */}
        {Object.entries(SHIFTS).filter(([code]) => code !== 'off').map(([code, info]) => (
          <option 
            key={code} 
            value={code} 
            className="font-bold py-1"
            style={{ backgroundColor: info.bg, color: info.text }}
          >
            {code}
          </option>
        ))}
      </select>

      {isBorrowed && (
        <span
          className="pointer-events-none absolute left-0 right-0 bottom-0 text-[8px] font-black text-center bg-amber-800/75 text-white truncate print:hidden"
          title={`Hỗ trợ ${normalized.covering_store}`}
        >
          {normalized.covering_store}
        </span>
      )}

      {/* Print View Text */}
      <div 
        className="hidden print:flex items-center justify-center w-full h-full min-h-[20px] text-[10px] font-bold text-black leading-none text-center"
      >
        {displayLabel}
      </div>
    </div>
  );
}
