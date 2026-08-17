import React, { useState } from 'react';
import { Users, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { WEEK_DAYS, DAY_FULL_NAMES } from '../data/constants';
import { calculateStaffingGap } from '../utils/shiftHelper';

export default function StaffingGapTable({ employees, weekSchedule, filterDept }) {
  const [selectedDay, setSelectedDay] = useState('T2');
  const [isExpanded, setIsExpanded] = useState(false);

  // Mặc định định biên yêu cầu theo ca chuẩn của cửa hàng
  const defaultRequiredMatrix = {
    '6-14': 2,   // Ca sáng: 2 nhân sự
    '14-22': 2,  // Ca chiều: 2 nhân sự
    '22-6': 1    // Ca đêm: 1 nhân sự
  };

  const storeId = filterDept === 'ALL' ? 'VN0485' : filterDept;
  const gapData = calculateStaffingGap(employees, weekSchedule, selectedDay, storeId, defaultRequiredMatrix);

  // Tính tổng số ca thiếu trong ngày
  const totalDeficits = Object.values(gapData).filter(d => d.gap < 0).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden print:hidden">
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-blue-50/50 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition-colors"
      >
        <div className="flex items-center gap-2.5 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Users size={15} className="text-blue-600" />
            <span>Phân Tích Định Biên Ca (Staffing Gap):</span>
            <span className="font-mono text-blue-700 font-extrabold">{storeId}</span>
          </div>

          {totalDeficits > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200 flex items-center gap-1 animate-pulse">
              <AlertTriangle size={11} /> Có {totalDeficits} ca đang thiếu nhân sự!
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 size={11} /> Đủ định biên nhân sự các ca
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <span>{isExpanded ? 'Thu gọn' : 'Xem chi tiết định biên'}</span>
          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-200 space-y-3 bg-white">
          {/* Day Selector Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1">Chọn ngày:</span>
            {WEEK_DAYS.map(dayKey => (
              <button
                key={dayKey}
                type="button"
                onClick={() => setSelectedDay(dayKey)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedDay === dayKey
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {dayKey} ({DAY_FULL_NAMES[dayKey]})
              </button>
            ))}
          </div>

          {/* Shift Matrix Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(gapData).map(([shiftCode, data]) => {
              const isDeficit = data.gap < 0;
              const isBalanced = data.gap === 0;
              const isSurplus = data.gap > 0;

              return (
                <div
                  key={shiftCode}
                  className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                    isDeficit
                      ? 'bg-red-50/70 border-red-200'
                      : isBalanced
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-indigo-50/70 border-indigo-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-sm text-slate-900">Ca {shiftCode}</span>
                      <span className="text-[10px] text-slate-500">
                        {shiftCode === '6-14' ? '(Sáng)' : shiftCode === '14-22' ? '(Chiều)' : '(Đêm)'}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isDeficit
                          ? 'bg-red-200 text-red-800'
                          : isBalanced
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-indigo-200 text-indigo-800'
                      }`}
                    >
                      {isDeficit
                        ? `Thiếu ${Math.abs(data.gap)} NV`
                        : isBalanced
                        ? 'Chuẩn định biên'
                        : `Dư ${data.gap} NV`}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center bg-white/80 p-2 rounded-lg border border-slate-200/60 text-xs">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Cần (Req)</span>
                      <strong className="font-mono text-slate-800">{data.required}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Tại chỗ</span>
                      <strong className="font-mono text-blue-700">{data.actual}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Chi viện</span>
                      <strong className="font-mono text-orange-600">+{data.support}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Hiện có</span>
                      <strong className={`font-mono ${isDeficit ? 'text-red-700' : 'text-emerald-700'}`}>
                        {data.total}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
