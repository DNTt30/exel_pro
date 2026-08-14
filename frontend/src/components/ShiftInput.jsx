import React, { useState, useRef, useEffect } from 'react';
import { SHIFTS } from '../data/initialData';

export default function ShiftInput({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value === 'off' ? '' : value);
  const wrapperRef = useRef(null);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value === 'off' ? '' : value);
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    onChange(e.target.value || 'off');
  };

  const handleOptionClick = (code) => {
    setInputValue(code === 'off' ? '' : code);
    onChange(code);
    setIsOpen(false);
  };

  // Determine current color for the input cell
  const currentShift = SHIFTS[value];
  const isOff = value === 'off' || !value;
  const inputStyle = {
    backgroundColor: currentShift ? currentShift.bg : (isOff ? 'white' : '#fef3c7'), // amber-50 for custom
    color: currentShift ? currentShift.text : (isOff ? '#94a3b8' : '#78350f'),
    border: '1px solid transparent'
  };

  return (
    <div className="relative w-full h-full" ref={wrapperRef}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder="-"
        style={inputStyle}
        className="excel-select w-full h-full px-1 py-1 text-center font-bold outline-none focus:ring-2 focus:ring-blue-500 rounded-sm"
      />
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-slate-300 shadow-xl rounded-md z-50 max-h-64 overflow-y-auto">
          <ul className="py-1">
            <li 
              className="px-3 py-1.5 text-xs font-bold cursor-pointer hover:bg-slate-100"
              onClick={() => handleOptionClick('off')}
            >
              - Nghỉ -
            </li>
            {Object.entries(SHIFTS).filter(([code]) => code !== 'off').map(([code, info]) => (
              <li 
                key={code}
                onClick={() => handleOptionClick(code)}
                className="px-3 py-1.5 text-xs font-bold cursor-pointer border-b border-white"
                style={{ backgroundColor: info.bg, color: info.text }}
              >
                {info.label || code}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
