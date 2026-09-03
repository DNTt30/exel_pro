import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { Sparkles, CheckCircle2, Calendar } from 'lucide-react';
import { WEEK_DAYS } from '../../data/constants';
import { generateEmployeeSuggestedSchedule } from '../../utils/shiftSuggestionHelper';
import { SHIFTS } from '../../data/initialData';

const SHIFT_OPTIONS = [
  { id: 'any', label: 'Linh hoạt (Khuyên dùng)', desc: 'Xoay ca tự động theo cửa hàng', color: 'border-blue-300 bg-blue-50/70 text-blue-900' },
  { id: '6-14', label: 'Ca Sáng (06:00 - 14:00)', desc: 'Ưu tiên làm ban ngày', color: 'border-emerald-300 bg-emerald-50/70 text-emerald-900' },
  { id: '14-22', label: 'Ca Chiều (14:00 - 22:00)', desc: 'Ưu tiên chiều tối', color: 'border-amber-300 bg-amber-50/70 text-amber-900' },
  { id: '22-6', label: 'Ca Đêm (22:00 - 06:00)', desc: 'Ưu tiên ca đêm (x1.3 lương)', color: 'border-purple-300 bg-purple-50/70 text-purple-900' }
];

export default function ShiftSuggestionModal({ isOpen, onClose, emp, onApply, currentWeek }) {
  const [preferredShift, setPreferredShift] = useState('any');
  const [busyDays, setBusyDays] = useState([]);
  const [isApplying, setIsApplying] = useState(false);

  const isPT = String(emp?.type || emp?.role || '').toUpperCase().includes('PT');

  const weekDayDates = useMemo(() => {
    if (!currentWeek) return {};
    const parts = currentWeek.split('-').map(Number);
    if (parts.length !== 3) return {};
    const start = new Date(parts[0], parts[1] - 1, parts[2]);
    const map = {};
    WEEK_DAYS.forEach((d, idx) => {
      const dt = new Date(start);
      dt.setDate(start.getDate() + idx);
      map[d] = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
    });
    return map;
  }, [currentWeek]);

  const toggleBusyDay = (dayKey) => {
    setBusyDays(prev => 
      prev.includes(dayKey) ? prev.filter(d => d !== dayKey) : [...prev, dayKey]
    );
  };

  const preview = useMemo(() => {
    return generateEmployeeSuggestedSchedule({
      emp,
      preferredShift,
      busyDays
    });
  }, [emp, preferredShift, busyDays]);

  const handleConfirm = async () => {
    if (!onApply) return;
    setIsApplying(true);
    try {
      await onApply(preview.suggestedShifts);
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="✨ Gợi Ý Ca Làm Việc Thông Minh">
      <div className="space-y-4 text-slate-700">
        
        {/* Intro banner */}
        <div className="p-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/80 rounded-xl text-xs flex items-start gap-2.5">
          <div className="p-1.5 bg-blue-600 text-white rounded-lg flex-shrink-0">
            <Sparkles size={14} />
          </div>
          <div>
            <div className="font-bold text-slate-800">
              Trợ lý Xếp Ca Cá Nhân — {emp?.name} ({isPT ? 'Part-time' : 'Full-time'})
            </div>
            <div className="text-slate-600 mt-0.5">
              Hệ thống tự động tính toán số ca để đạt chuẩn 
              <strong className="text-blue-700 font-bold ml-1">
                {isPT ? '16h - 23h/tuần (an toàn không quá 91h)' : '48h/tuần (đủ 6 ca & 1 ngày nghỉ)'}
              </strong>.
            </div>
          </div>
        </div>

        {/* 1. Chọn ca ưu tiên */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-2">
            1. Khung giờ bạn mong muốn làm việc:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SHIFT_OPTIONS.map(opt => {
              const selected = preferredShift === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPreferredShift(opt.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selected 
                      ? `${opt.color} ring-2 ring-blue-500 shadow-xs font-bold` 
                      : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>{opt.label}</span>
                    {selected && <CheckCircle2 size={13} className="text-blue-600 flex-shrink-0" />}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Chọn ngày bận */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-800">
              2. Ngày bạn bận (không thể nhận ca):
            </label>
            <span className="text-[10px] text-slate-400">Click để chọn ngày bận</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEK_DAYS.map(dayKey => {
              const isBusy = busyDays.includes(dayKey);
              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => toggleBusyDay(dayKey)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    isBusy 
                      ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs ring-1 ring-rose-300' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{dayKey}</span>
                  {weekDayDates[dayKey] && (
                    <span className="text-[8.5px] font-mono text-slate-400 font-normal">
                      {weekDayDates[dayKey]}
                    </span>
                  )}
                  <span className={`text-[9px] font-medium ${isBusy ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                    {isBusy ? 'Bận' : 'Rảnh'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Xem trước kết quả gợi ý */}
        <div className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar size={14} className="text-blue-600" />
              <span>Xem trước lịch được gợi ý:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-blue-700 font-mono">
                {preview.totalHours}h / {preview.totalShifts} ca
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                <CheckCircle2 size={11} /> Đạt định mức
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {WEEK_DAYS.map(dayKey => {
              const shift = preview.suggestedShifts[dayKey];
              const isOff = !shift || shift === 'off';
              const shiftObj = SHIFTS[shift];
              return (
                <div 
                  key={dayKey} 
                  className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center min-h-[56px] ${
                    isOff 
                      ? 'bg-slate-100/90 border-slate-200 text-slate-400' 
                      : 'bg-white border-blue-200 text-blue-700 shadow-2xs font-bold'
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-600 leading-tight">{dayKey}</span>
                  {weekDayDates[dayKey] && (
                    <span className="text-[8.5px] font-mono text-slate-400 mb-0.5 leading-tight">
                      {weekDayDates[dayKey]}
                    </span>
                  )}
                  <span className={`text-xs font-black ${isOff ? 'text-slate-400 font-medium' : 'text-slate-900'}`}>
                    {isOff ? 'OFF' : shift}
                  </span>
                  {!isOff && shiftObj && (
                    <span className="text-[9px] text-blue-600 font-semibold">{shiftObj.hours}h</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isApplying}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles size={13} className="text-amber-300" />
            <span>{isApplying ? 'Đang áp dụng...' : 'Áp Dụng Lịch Này'}</span>
          </button>
        </div>

      </div>
    </Modal>
  );
}
