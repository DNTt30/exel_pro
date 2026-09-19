import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { SHIFTS } from '../data/initialData';
import { normalizeShift } from '../utils/shiftHelper';

export default function ShiftInput({ 
  value, 
  rawValue, 
  onChange, 
  rowIndex, 
  colIndex, 
  readOnly = false,
  isDraft: _isDraft = false,
  empName = '',
  dayLabel = ''
}) {

  // Normalize current shift and covering status
  const normalized = normalizeShift(rawValue || value);
  const shiftCode = normalized.shift;
  const isBorrowed = Boolean(normalized.covering_store);
  
  const isUnset = !shiftCode || shiftCode === '';
  const isOff = shiftCode === 'off';
  const shiftInfo = SHIFTS[shiftCode];

  // Determine appearance based on exact status
  let cellBg = 'transparent';
  let cellText = '#cbd5e1';
  let displayLabel = '-';

  if (isBorrowed) {
    cellBg = '#f59e0b'; // Màu hổ phách nổi bật cho ca chi viện
    cellText = '#ffffff';
    displayLabel = shiftCode === 'off'
      ? `off ${normalized.covering_store}`
      : `${shiftCode} ${normalized.covering_store}`;
  } else if (isOff) {
    cellBg = '#f1f5f9'; // Xám nhạt cho OFF
    cellText = '#64748b'; // Xám đậm
    displayLabel = 'OFF';
  } else if (shiftInfo) {
    // Luôn hiển thị màu sắc ca trực trực quan chuẩn nhận diện GS25
    cellBg = shiftInfo.bg;
    cellText = shiftInfo.text;
    displayLabel = shiftInfo.label || shiftCode;
  } else if (!isUnset) {
    // Ca tùy chỉnh / ngoài danh mục chuẩn: tự động nhận diện màu theo giờ bắt đầu
    const match = shiftCode.match(/^(\d+)/);
    const startH = match ? parseInt(match[1], 10) : 12;
    if (startH >= 5 && startH < 12) {
      cellBg = '#22c55e'; // Xanh lá ca sáng
      cellText = '#ffffff';
    } else if (startH >= 12 && startH < 18) {
      cellBg = '#3b82f6'; // Xanh biển ca chiều
      cellText = '#ffffff';
    } else {
      cellBg = '#ef4444'; // Đỏ/tím ca đêm
      cellText = '#ffffff';
    }
    displayLabel = shiftCode;
  }

  // --- Tích hợp Input text giống Excel & Popover chọn ca ---
  const cellRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState('');
  const [showMobilePicker, setShowMobilePicker] = useState(false);
  const [popoverPos, setPopoverPos] = useState({
    top: 0,
    left: 0,
    width: 315,
    placement: 'bottom',
    arrowLeft: 140
  });

  const updatePopoverPosition = useCallback(() => {
    if (!cellRef.current || typeof window === 'undefined') return;
    const rect = cellRef.current.getBoundingClientRect();
    const popoverWidth = Math.min(315, window.innerWidth - 20);
    const popoverHeight = 225; // Chiều cao ước tính của popover chọn ca

    // Canh giữa theo chiều ngang của ô đang chọn
    const cellCenter = rect.left + rect.width / 2;
    let left = cellCenter - popoverWidth / 2;
    // Giữ popover luôn nằm trong viền màn hình
    left = Math.max(10, Math.min(window.innerWidth - popoverWidth - 10, left));

    // Vị trí mũi tên tam giác trỏ thẳng vào giữa ô
    const arrowLeft = Math.max(16, Math.min(popoverWidth - 20, cellCenter - left));

    // Canh theo chiều dọc: ưu tiên hiển thị ngay dưới ô, lật lên trên nếu chạm đáy màn hình
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    let top = 0;
    let placement = 'bottom';

    if (spaceBelow >= popoverHeight + 12 || spaceBelow >= spaceAbove) {
      top = rect.bottom + 8;
      placement = 'bottom';
    } else {
      top = Math.max(10, rect.top - popoverHeight - 8);
      placement = 'top';
    }

    setPopoverPos({ top, left, width: popoverWidth, placement, arrowLeft });
  }, []);

  // Tự động đóng popover khi cuộn bảng hoặc thay đổi kích thước màn hình
  useEffect(() => {
    if (!showMobilePicker) return;
    const handleScrollOrResize = () => {
      setShowMobilePicker(false);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [showMobilePicker]);

  const handleKeyDown = (e) => {
    // Nếu đang gõ text, Enter sẽ lưu và nhảy xuống, Esc sẽ hủy
    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishEdit(localText, true); // true = nhảy xuống dưới
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditing(false);
        setLocalText('');
      }
      // Không cản mũi tên khi đang edit để họ di chuyển con trỏ trong text
      return;
    }

    // Khi đang focus ô (không edit mode), bấm ký tự -> tự động vào edit mode
    // Bỏ qua các phím meta
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      setIsEditing(true);
      setLocalText(e.key);
      e.preventDefault();
      return;
    }

    // Điều hướng Excel khi không ở Edit Mode (phím mũi tên, Enter)
    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
      e.preventDefault();
      let nextRow = rowIndex;
      let nextCol = colIndex;

      if (e.key === 'ArrowDown' || e.key === 'Enter') nextRow++;
      if (e.key === 'ArrowUp') nextRow = Math.max(0, nextRow - 1);
      if (e.key === 'ArrowLeft') nextCol = Math.max(0, nextCol - 1);
      if (e.key === 'ArrowRight') nextCol++;

      if (nextRow !== rowIndex || nextCol !== colIndex) {
        const nextCell = document.getElementById(`cell-${nextRow}-${nextCol}`);
        if (nextCell) {
          nextCell.focus();
        }
      }
    }
  };

  const finishEdit = (val, moveDown = false) => {
    setIsEditing(false);
    setLocalText('');
    
    // Tự parse nhanh dựa trên rule của user
    // VD: "1" -> "6-14", "0" -> "off"
    let parsed = val.trim();
    if (parsed === '1') parsed = '6-14';
    else if (parsed === '2') parsed = '14-22';
    else if (parsed === '3') parsed = '22-6';
    else if (parsed === '0') parsed = 'off';
    
    if (parsed !== shiftCode) {
      onChange(parsed);
    }

    if (moveDown) {
      setTimeout(() => {
        const nextCell = document.getElementById(`cell-${rowIndex + 1}-${colIndex}`);
        if (nextCell) nextCell.focus();
      }, 10);
    }
  };

  const onBlur = () => {
    if (isEditing) finishEdit(localText, false);
  };

  const onDoubleClick = () => {
    if (readOnly) return;
    setIsEditing(true);
    setLocalText(shiftCode || '');
  };

  const handleClick = () => {
    if (readOnly) return;
    // Mở nhanh Popover chọn ca nổi ngay tại vị trí ô bấm trên mobile / touch
    const isTouchOrMobile = typeof window !== 'undefined' && (
      window.innerWidth < 1024 ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    );
    if (isTouchOrMobile) {
      updatePopoverPosition();
      setShowMobilePicker(true);
    }
  };

  const selectShiftFromPicker = (selected) => {
    setShowMobilePicker(false);
    if (selected !== shiftCode) {
      onChange(selected);
    }
  };

  const onCopy = (e) => {
    e.clipboardData.setData('text/plain', shiftCode || '');
    e.preventDefault();
  };

  const onPaste = (e) => {
    if (readOnly) return;
    const pastedText = e.clipboardData.getData('text');
    if (pastedText !== undefined) {
      finishEdit(pastedText, false);
    }
    e.preventDefault();
  };

  // Render input mode vs read/nav mode
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {isEditing ? (
        <input
          ref={(el) => { if(el) el.focus(); }}
          type="text"
          className="w-full h-full text-center px-0.5 py-0 border-2 border-blue-500 outline-none text-xs font-bold text-gray-900 bg-white z-30"
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
        />
      ) : (
        <div
          ref={cellRef}
          id={`cell-${rowIndex}-${colIndex}`}
          tabIndex={readOnly ? -1 : 0}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onDoubleClick={onDoubleClick}
          onCopy={onCopy}
          onPaste={onPaste}
          style={{
            backgroundColor: cellBg,
            color: cellText,
          }}
          title={isBorrowed ? `Chi viện ${normalized.covering_store} (Click đúp để sửa)` : '(Chạm để chọn ca, click đúp hoặc gõ để sửa)'}
          className={`w-full h-full min-h-[38px] flex items-center justify-center select-none px-0.5 py-0 ${
            isBorrowed ? 'text-[11px] font-black tracking-tight pb-2' : 'text-xs font-bold'
          } ${
            readOnly ? 'cursor-default' : 'cursor-pointer sm:cursor-cell focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:z-20'
          } ${isUnset ? 'font-normal italic' : ''}`}
        >
          {isUnset ? '-' : displayLabel}
        </div>
      )}

      {isBorrowed && !isEditing && (
        <span
          className="pointer-events-none absolute left-0 right-0 bottom-0 text-[8.5px] leading-[11px] font-black text-center bg-amber-900/90 text-white tracking-wider truncate py-[0.5px] print:hidden shadow-xs uppercase"
        >
          {normalized.covering_store}
        </span>
      )}

      {/* Contextual Floating Shift Picker right at the tapped cell */}
      {showMobilePicker && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto">
          {/* Subtle click-away backdrop to dismiss without obscuring the schedule */}
          <div 
            className="fixed inset-0 bg-black/10 backdrop-blur-[0.5px] transition-opacity"
            onClick={() => setShowMobilePicker(false)}
          />

          {/* Floating Popover Container */}
          <div 
            className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3 animate-in fade-in zoom-in-95 duration-150 select-none text-slate-800"
            style={{
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              width: `${popoverPos.width}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Arrow pointer toward the cell */}
            {popoverPos.placement === 'bottom' ? (
              <div 
                className="absolute -top-1.5 w-3 h-3 bg-white border-t border-l border-slate-200/90 rotate-45 transform pointer-events-none"
                style={{ left: `${popoverPos.arrowLeft}px` }}
              />
            ) : (
              <div 
                className="absolute -bottom-1.5 w-3 h-3 bg-white border-b border-r border-slate-200/90 rotate-45 transform pointer-events-none"
                style={{ left: `${popoverPos.arrowLeft}px` }}
              />
            )}

            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-black text-slate-800 truncate">{empName || 'Nhân sự'}</span>
                {dayLabel && (
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                    {dayLabel}
                  </span>
                )}
              </div>
              <button 
                type="button" 
                onClick={() => setShowMobilePicker(false)} 
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 cursor-pointer"
                title="Đóng"
              >
                <X size={15} />
              </button>
            </div>

            {/* Ca chính 8 tiếng & OFF */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              <button 
                type="button" 
                onClick={() => selectShiftFromPicker('6-14')} 
                className="p-1.5 rounded-xl bg-[#22c55e]/15 hover:bg-[#22c55e]/25 border border-[#22c55e]/40 flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                <span className="text-xs font-black text-emerald-800">6-14</span>
                <span className="text-[9px] text-emerald-700 font-bold">Sáng (8h)</span>
              </button>

              <button 
                type="button" 
                onClick={() => selectShiftFromPicker('14-22')} 
                className="p-1.5 rounded-xl bg-[#3b82f6]/15 hover:bg-[#3b82f6]/25 border border-[#3b82f6]/40 flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                <span className="text-xs font-black text-blue-800">14-22</span>
                <span className="text-[9px] text-blue-700 font-bold">Chiều (8h)</span>
              </button>

              <button 
                type="button" 
                onClick={() => selectShiftFromPicker('22-6')} 
                className="p-1.5 rounded-xl bg-[#ef4444]/15 hover:bg-[#ef4444]/25 border border-[#ef4444]/40 flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                <span className="text-xs font-black text-rose-800">22-6</span>
                <span className="text-[9px] text-rose-700 font-bold">Đêm (8h)</span>
              </button>

              <button 
                type="button" 
                onClick={() => selectShiftFromPicker('8-17')} 
                className="p-1.5 rounded-xl bg-[#8b5cf6]/15 hover:bg-[#8b5cf6]/25 border border-[#8b5cf6]/40 flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                <span className="text-xs font-black text-purple-800">8-17</span>
                <span className="text-[9px] text-purple-700 font-bold">HC (8h)</span>
              </button>

              <button 
                type="button" 
                onClick={() => selectShiftFromPicker('10-18')} 
                className="p-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                <span className="text-xs font-black text-sky-800">10-18</span>
                <span className="text-[9px] text-sky-700 font-bold">Giữa (8h)</span>
              </button>

              <button 
                type="button" 
                onClick={() => selectShiftFromPicker('off')} 
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                <span className="text-xs font-black text-slate-700">OFF</span>
                <span className="text-[9px] text-slate-500 font-bold">Nghỉ ca</span>
              </button>
            </div>

            {/* Ca 4 tiếng Part-time */}
            <div className="text-[10px] font-bold text-slate-500 mb-1 flex items-center justify-between px-0.5">
              <span>Ca 4 tiếng (Part-Time):</span>
            </div>
            <div className="grid grid-cols-4 gap-1 mb-2">
              {['6-10', '10-14', '14-18', '18-22'].map(s => (
                <button 
                  key={s} 
                  type="button" 
                  onClick={() => selectShiftFromPicker(s)} 
                  className="py-1 px-0.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-center transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-[11px] font-bold text-sky-900 block">{s}</span>
                </button>
              ))}
            </div>

            {/* Thao tác xóa ca hoặc chuyển sang gõ bàn phím */}
            <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => selectShiftFromPicker('')} 
                className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
              >
                Xóa ca
              </button>
              <button 
                type="button" 
                onClick={() => { setShowMobilePicker(false); setIsEditing(true); setLocalText(shiftCode || ''); }} 
                className="flex-1 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
              >
                Nhập tay...
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

