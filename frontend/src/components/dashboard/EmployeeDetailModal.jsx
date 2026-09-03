import React from 'react';
import { Link } from 'react-router-dom';
import { X, AlertTriangle, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { WEEK_DAYS } from '../../data/constants';
import Modal from '../modals/Modal';

// Modal chi tiết nhân viên — dùng chung Modal.jsx chuẩn
export default function EmployeeDetailModal({ 
  emp, 
  onClose, 
  viewMode = 'week', 
  selectedMonthCycle = '', 
  cycleDates = [],
  currentWeek = ''
}) {
  if (!emp) return null;

  const weekDayDates = React.useMemo(() => {
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

  return (
    <Modal
      isOpen={Boolean(emp)}
      onClose={onClose}
      hideHeader
      maxWidth="max-w-3xl"
      bodyClassName="p-0 flex flex-col max-h-[85vh]"
    >
      {/* Modal Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 text-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg shadow-inner">
            👤
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg leading-tight">{emp.name}</h3>
              <span className="px-2 py-0.5 bg-white/20 rounded text-[11px] font-bold">
                {emp.role || emp.type || 'STPT'}
              </span>
            </div>
            <p className="text-xs text-blue-100 font-mono mt-0.5">
              Mã NV: <strong>{emp.id}</strong> | Cửa hàng: <strong>{emp.dept}</strong>
            </p>
          </div>
        </div>
        <button 
          type="button"
          onClick={onClose}
          className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/20 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Modal Body */}
      <div className="p-5 space-y-5 overflow-y-auto flex-1">
        
        {/* Status Alert Banner */}
        <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
          emp.isOvertime 
            ? 'bg-rose-50 border-rose-200 text-rose-900' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className={`p-2.5 rounded-xl text-white ${emp.isOvertime ? 'bg-rose-600 shadow-2xs' : 'bg-emerald-600'}`}>
            {emp.isOvertime ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
          </div>
          <div>
            <h4 className="font-extrabold text-xs">
              {emp.isOvertime 
                ? (viewMode === 'month' 
                    ? `CẢNH BÁO: Nhân viên đã làm ${emp.monthTotalHours}h / 91h trong tháng!`
                    : `CẢNH BÁO: Nhân viên đã đăng ký ${emp.weekTotalHours}h / 23h trong tuần!`)
                : `AN TOÀN: Tổng giờ tháng là ${emp.monthTotalHours}h (Định mức chuẩn ≤ 91h)`}
            </h4>
            <p className="text-[11px] opacity-90 mt-0.5">
              Định mức tuần an toàn: 16h - 23h. Tổng giờ chu kỳ tháng: {emp.monthTotalHours}h / 91h.
            </p>
          </div>
        </div>

        {/* Quick Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tổng Giờ Tháng</span>
            <span className={`text-2xl font-black font-mono mt-0.5 block ${emp.monthTotalHours > 91 ? 'text-rose-600' : 'text-slate-800'}`}>
              {emp.monthTotalHours}h
            </span>
          </div>
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Giờ Tuần Này</span>
            <span className="text-2xl font-black font-mono text-blue-700 mt-0.5 block">
              {emp.weekTotalHours}h
            </span>
          </div>
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Hạn Mức Chuẩn</span>
            <span className="text-2xl font-black font-mono text-slate-700 mt-0.5 block">
              91h
            </span>
          </div>
        </div>

        {/* Detail Shifts Matrix */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
              <Clock size={14} className="text-blue-600" />
              <span>
                {viewMode === 'month' 
                  ? `Phân bổ 31 ngày chu kỳ Tháng ${selectedMonthCycle ? selectedMonthCycle.split('-')[1] + '/' + selectedMonthCycle.split('-')[0] : ''}:` 
                  : `Chi tiết ca làm việc tuần ${currentWeek}:`}
              </span>
            </h4>
            <span className="text-[11px] font-bold text-blue-700">Tổng cộng: {emp.activeTotalHours}h</span>
          </div>

          {viewMode === 'month' ? (
            <div className="grid grid-cols-7 gap-1.5 text-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              {cycleDates.map(d => {
                const val = emp.monthShifts ? emp.monthShifts[d.key] : '';
                return (
                  <div key={d.key} className={`p-1.5 rounded-lg border text-center ${val ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                    <span className="text-[9px] font-bold text-slate-500 block">{d.shortDisplay} ({d.dayKey})</span>
                    <span className={`text-[10px] font-extrabold font-mono mt-0.5 block ${val ? 'text-blue-700' : 'text-slate-300'}`}>
                      {val || '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2 text-center bg-slate-50 p-3 rounded-xl border border-slate-200">
              {WEEK_DAYS.map(day => {
                const shiftVal = emp.weekShifts ? emp.weekShifts[day] : '';
                return (
                  <div key={day} className={`p-2.5 rounded-xl border ${shiftVal ? 'bg-blue-50 border-blue-200 shadow-2xs' : 'bg-white border-slate-200'}`}>
                    <span className="font-black text-xs text-blue-800 block">{day}</span>
                    {weekDayDates[day] && (
                      <span className="text-[10px] font-mono font-medium text-slate-400 block -mt-0.5">
                        {weekDayDates[day]}
                      </span>
                    )}
                    <span className={`text-xs font-extrabold font-mono mt-1 block ${shiftVal ? 'text-blue-700' : 'text-slate-300'}`}>
                      {shiftVal || '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Modal Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center flex-shrink-0">
        <Link 
          to="/admin/schedule"
          className="btn btn-primary text-xs py-1.5 px-3.5 rounded-xl font-bold flex items-center gap-1"
        >
          <span>Chỉnh sửa ca tại Bảng Xếp Lịch</span>
          <ArrowRight size={14} />
        </Link>
        <button 
          type="button"
          onClick={onClose}
          className="btn btn-outline text-xs py-1.5 px-4 rounded-xl font-bold hover:bg-slate-100 cursor-pointer"
        >
          Đóng
        </button>
      </div>
    </Modal>
  );
}
