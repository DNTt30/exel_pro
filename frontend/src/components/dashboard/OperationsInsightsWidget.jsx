import React, { useMemo } from 'react';
import { UserX, RefreshCcw, ArrowRight, ArrowLeft } from 'lucide-react';
import { getShiftCode, getCoveringStore } from '../../utils/shiftHelper';

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

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
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col justify-between h-full">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <UserX size={18} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800">Tình Trạng Đi Làm & Nghỉ Phép</h3>
            <p className="text-[11px] text-slate-500 font-medium">Theo dõi vắng mặt tại {filterDept === 'ALL' ? 'Toàn hệ thống' : `Cửa hàng ${filterDept}`} (Tuần này)</p>
          </div>
        </div>

        {leaveStats.total === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-medium">Chưa có dữ liệu lịch làm việc.</div>
        ) : (
          <div className="space-y-4">
            {/* Stacked Bar */}
            <div className="w-full h-4 rounded-full flex overflow-hidden shadow-inner">
              <div style={{ width: `${leaveStats.workedPct}%` }} className="bg-blue-500 hover:bg-blue-600 transition-colors cursor-help" title={`Đi làm: ${leaveStats.worked} ca`}></div>
              <div style={{ width: `${leaveStats.paidPct}%` }} className="bg-emerald-400 hover:bg-emerald-500 transition-colors cursor-help" title={`Phép có lương: ${leaveStats.paidLeave} ca`}></div>
              <div style={{ width: `${leaveStats.unpaidPct}%` }} className="bg-rose-400 hover:bg-rose-500 transition-colors cursor-help" title={`Không lương: ${leaveStats.unpaidLeave} ca`}></div>
              <div style={{ width: `${leaveStats.offPct}%` }} className="bg-slate-200 hover:bg-slate-300 transition-colors cursor-help" title={`OFF thường: ${leaveStats.off} ca`}></div>
            </div>

            {/* Legends */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shrink-0"></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Đi làm</span>
                </div>
                <span className="font-black text-slate-800 text-sm">{leaveStats.worked}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200 shadow-sm shrink-0"></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">OFF thường</span>
                </div>
                <span className="font-black text-slate-800 text-sm">{leaveStats.off}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-emerald-100 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shrink-0"></div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Phép lương</span>
                </div>
                <span className="font-black text-emerald-800 text-sm">{leaveStats.paidLeave}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-rose-100 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-sm shrink-0"></div>
                  <span className="text-[10px] font-bold text-rose-700 uppercase">Không lương</span>
                </div>
                <span className="font-black text-rose-800 text-sm">{leaveStats.unpaidLeave}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cột 2: Hoạt động Chi viện (Chỉ áp dụng Toàn hệ thống) */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col justify-between h-full relative overflow-hidden">
        {filterDept !== 'ALL' && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
            <RefreshCcw size={24} className="text-slate-400 mb-2" />
            <p className="text-xs font-bold text-slate-600">Báo cáo Chi viện chỉ hiển thị ở chế độ "Toàn Bộ Cửa Hàng".</p>
            <p className="text-[10px] text-slate-500 mt-1">Vui lòng bỏ chọn bộ lọc cửa hàng để xem lưới chi viện.</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <RefreshCcw size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Hoạt Động Chi Viện (Cross-Store)</h3>
              <p className="text-[11px] text-slate-500 font-medium">Toàn hệ thống ghi nhận <strong className="text-amber-600">{supportStats.totalTransfers} ca</strong> chi viện (Tuần này)</p>
            </div>
          </div>
        </div>

        {supportStats.totalTransfers === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-medium">Tuần này không có ca chi viện nào.</div>
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
