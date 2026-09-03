import React, { useMemo } from 'react';
import { UserX, RefreshCcw, ArrowRight, ArrowLeft } from 'lucide-react';
import { getShiftCode, getCoveringStore } from '../../utils/shiftHelper';
import { WEEK_DAYS } from '../../data/constants';

export default function OperationsInsightsWidget({ employees, weekSchedule, filterDept }) {

  // 1. Phân tích Tỷ lệ Vắng mặt / Phép (Leaves & Attendance)
  const leaveStats = useMemo(() => {
    let worked = 0;
    let off = 0;
    let paidLeave = 0;
    let unpaidLeave = 0;

    const filteredEmps = filterDept === 'ALL' 
      ? employees 
      : employees.filter(e => e.dept === filterDept || e.sm_id === filterDept);

    filteredEmps.forEach(emp => {
      const mySched = weekSchedule[emp.id] || {};
      WEEK_DAYS.forEach(day => {
        const raw = mySched[day];
        if (!raw) return;
        
        const code = getShiftCode(raw).toUpperCase();
        if (code === 'OFF' || code === '-') {
          off++;
        } else if (['AL', 'AL_H', 'PL', 'PL_H'].includes(code)) {
          paidLeave++;
        } else if (['UL', 'UL_H', 'KL', 'KL_H'].includes(code)) {
          unpaidLeave++;
        } else {
          worked++;
        }
      });
    });

    const total = worked + off + paidLeave + unpaidLeave;
    return {
      worked, off, paidLeave, unpaidLeave, total,
      workedPct: total ? (worked / total) * 100 : 0,
      offPct: total ? (off / total) * 100 : 0,
      paidPct: total ? (paidLeave / total) * 100 : 0,
      unpaidPct: total ? (unpaidLeave / total) * 100 : 0,
    };
  }, [employees, weekSchedule, filterDept]);

  // 2. Phân tích Chi viện (Cross-store Support)
  const supportStats = useMemo(() => {
    const borrowing = {}; // Cửa hàng ĐI MƯỢN người (covering_store)
    const lending = {};   // Cửa hàng CHO MƯỢN người (emp.dept)

    employees.forEach(emp => {
      const mySched = weekSchedule[emp.id] || {};
      const empDept = emp.dept;

      WEEK_DAYS.forEach(day => {
        const raw = mySched[day];
        if (!raw) return;

        const cover = getCoveringStore(raw);
        if (cover && cover !== empDept) {
          borrowing[cover] = (borrowing[cover] || 0) + 1;
          if (empDept) {
            lending[empDept] = (lending[empDept] || 0) + 1;
          }
        }
      });
    });

    const topBorrowers = Object.entries(borrowing).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topLenders = Object.entries(lending).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const totalTransfers = Object.values(borrowing).reduce((a, b) => a + b, 0);

    return { topBorrowers, topLenders, totalTransfers };
  }, [employees, weekSchedule]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
      
      {/* Cột 1: Tỷ lệ Đi làm & Nghỉ phép */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <UserX size={20} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800">Tình Trạng Đi Làm & Nghỉ Phép</h3>
            <p className="text-[11px] text-slate-500 font-medium">Theo dõi vắng mặt tại {filterDept === 'ALL' ? 'Toàn hệ thống' : `CH ${filterDept}`} (Tuần này)</p>
          </div>
        </div>

        {leaveStats.total === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-medium pb-4">
            Chưa có dữ liệu lịch làm việc.
          </div>
        ) : (
          <div className="space-y-6 flex-1 flex flex-col justify-center">
            {/* Stacked Bar dày dặn */}
            <div className="w-full h-8 rounded-2xl flex overflow-hidden shadow-inner bg-slate-100">
              <div style={{ width: `${leaveStats.workedPct}%` }} className="bg-blue-500 hover:bg-blue-600 transition-colors cursor-help" title={`Đi làm: ${leaveStats.worked} ca`}></div>
              <div style={{ width: `${leaveStats.paidPct}%` }} className="bg-emerald-400 hover:bg-emerald-500 transition-colors cursor-help" title={`Phép có lương: ${leaveStats.paidLeave} ca`}></div>
              <div style={{ width: `${leaveStats.unpaidPct}%` }} className="bg-rose-400 hover:bg-rose-500 transition-colors cursor-help" title={`Không lương: ${leaveStats.unpaidLeave} ca`}></div>
              <div style={{ width: `${leaveStats.offPct}%` }} className="bg-slate-300 hover:bg-slate-400 transition-colors cursor-help" title={`OFF thường: ${leaveStats.off} ca`}></div>
            </div>

            {/* Legends bớt rời rạc */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shrink-0"></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Đi làm</span>
                </div>
                <span className="font-black text-slate-800 text-sm">{leaveStats.worked}</span>
              </div>
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-300 shadow-sm shrink-0"></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">OFF thường</span>
                </div>
                <span className="font-black text-slate-800 text-sm">{leaveStats.off}</span>
              </div>
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shrink-0"></div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Phép lương</span>
                </div>
                <span className="font-black text-emerald-800 text-sm">{leaveStats.paidLeave}</span>
              </div>
              <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400 shadow-sm shrink-0"></div>
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wide">Không lương</span>
                </div>
                <span className="font-black text-rose-800 text-sm">{leaveStats.unpaidLeave}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cột 2: Hoạt động Chi viện (Chỉ áp dụng Toàn hệ thống) */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col h-full relative overflow-hidden">
        {filterDept !== 'ALL' && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-md z-10 flex flex-col items-center justify-center p-6 text-center">
            <RefreshCcw size={28} className="text-slate-400 mb-3" />
            <p className="text-sm font-extrabold text-slate-700">Chỉ hiển thị ở chế độ "Toàn Hệ Thống"</p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium max-w-[200px]">Vui lòng bỏ chọn bộ lọc cửa hàng để xem bức tranh chi viện tổng thể.</p>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <RefreshCcw size={20} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800">Hoạt Động Chi Viện (Cross-Store)</h3>
            <p className="text-[11px] text-slate-500 font-medium">Toàn hệ thống ghi nhận <strong className="text-amber-600">{supportStats.totalTransfers} ca</strong> chi viện (Tuần này)</p>
          </div>
        </div>

        {supportStats.totalTransfers === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
              <RefreshCcw size={20} className="text-slate-300" />
            </div>
            <p className="text-xs text-slate-500 font-bold">Tuần này không có ca chi viện nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Top Mượn */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5 border-b border-slate-100 pb-1.5">
                <ArrowRight size={13} className="text-rose-500" />
                <span className="text-[10px] font-bold text-slate-600 uppercase">Top Đi Mượn</span>
              </div>
              <div className="space-y-2">
                {supportStats.topBorrowers.map(([store, count], idx) => {
                  const max = supportStats.topBorrowers[0][1];
                  const pct = (count / max) * 100;
                  return (
                    <div key={store} className="relative group">
                      <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                        <span>{idx + 1}. {store}</span>
                        <span className="text-rose-600">{count} ca</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-rose-400 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Cho mượn */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5 border-b border-slate-100 pb-1.5">
                <ArrowLeft size={13} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-600 uppercase">Top Hỗ Trợ</span>
              </div>
              <div className="space-y-2">
                {supportStats.topLenders.map(([store, count], idx) => {
                  const max = supportStats.topLenders[0][1];
                  const pct = (count / max) * 100;
                  return (
                    <div key={store} className="relative group">
                      <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                        <span>{idx + 1}. {store}</span>
                        <span className="text-emerald-600">{count} ca</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
