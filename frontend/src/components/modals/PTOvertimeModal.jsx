import React, { useMemo } from 'react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';
import { SHIFTS } from '../../data/initialData';
import { getShiftCode, getShiftHours } from '../../utils/shiftHelper';
import { getPayrollCycleDates, getPayrollCycleFromWeek } from '../../data/constants';
import { Download, AlertTriangle, Users, FileSpreadsheet } from 'lucide-react';

export default function PTOvertimeModal({ isOpen, onClose }) {
  const { employees, schedule, currentWeek, ensureWeeksLoaded } = useStore();
  const weekSchedule = schedule[currentWeek] || {};

  const payrollCycle = useMemo(() => getPayrollCycleFromWeek(currentWeek), [currentWeek]);
  const cycleDates = useMemo(
    () => getPayrollCycleDates(payrollCycle.year, payrollCycle.month),
    [payrollCycle]
  );

  React.useEffect(() => {
    ensureWeeksLoaded(cycleDates.map(d => d.weekKey));
  }, [cycleDates, ensureWeeksLoaded]);

  // Format ca: 14-22 -> 14:00-22:00
  const formatShiftForOFC = (s) => {
    if (!s || s === 'off') return '';
    const actual = getShiftCode(s);
    if (actual === 'off') return '';
    const match = actual.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
    if (match) {
      return `${match[1]}:00-${match[2]}:00`;
    }
    return actual;
  };

  // Lọc và tính toán toàn bộ danh sách nhân viên Part-time
  const { ptOvertimeList, allPTList } = useMemo(() => {
    const ptEmps = employees.filter(e => e.type === 'PARTTIME' || e.type === 'STPT' || (e.role && e.role.includes('PT')));
    
    const analyzed = ptEmps.map(emp => {
      const empSched = weekSchedule[emp.id] || {};
      let totalHours = 0;
      const dailyShifts = {};

      cycleDates.forEach(({ key, weekKey, dayKey }) => {
        const s = schedule[weekKey]?.[emp.id]?.[dayKey] || empSched[dayKey];
        const actual = getShiftCode(s);
        
        if (actual && actual !== 'off') {
          dailyShifts[key] = formatShiftForOFC(actual);
          totalHours += getShiftHours(actual);
        } else {
          dailyShifts[key] = '';
        }
      });

      return {
        ...emp,
        totalHours,
        dailyShifts,
        isOver91: totalHours > 91
      };
    });

    return {
      ptOvertimeList: analyzed.filter(e => e.isOver91),
      allPTList: analyzed
    };
  }, [employees, weekSchedule, cycleDates, schedule]);

  // Xuất file CSV định dạng chuẩn OFC
  const handleExportOFC_CSV = (listToExport, fileNameSuffix = 'Vuot_91h') => {
    const dateHeaders = cycleDates.map(d => d.display).join(',');
    let csv = `STT,Cửa Hàng,Mã nhân Viên,Mã Điểm Danh,Vị Trí,Họ và Tên,${dateHeaders},Tổng giờ làm\n`;

    listToExport.forEach((emp, idx) => {
      const shiftsStr = cycleDates.map(d => emp.dailyShifts[d.key] || '').join(',');
      csv += `${idx + 1},${emp.dept || ''},${emp.id || ''},${emp.attendanceCode || ''},${emp.role || emp.type || ''},"${emp.name || ''}",${shiftsStr},${emp.totalHours}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `OFC_BaoCao_PartTime_${fileNameSuffix}_${currentWeek}.csv`;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <AlertTriangle size={22} className="text-amber-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                BÁO CÁO NHÂN SỰ PART-TIME VƯỢT 91H / THÁNG (OFC)
              </h3>
              <p className="text-xs text-rose-100 font-medium mt-0.5">
                Chu kỳ chấm công: {cycleDates[0]?.display} → {cycleDates[cycleDates.length - 1]?.display} (31 ngày)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Action Bar */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full font-bold text-xs">
              <Users size={14} /> Có {ptOvertimeList.length} nhân sự PT vượt 91h
            </span>
            <span className="text-xs text-slate-500 font-medium">
              (Tổng toàn chuỗi: {allPTList.length} nhân sự Part-time)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportOFC_CSV(ptOvertimeList, 'DS_Vuot_91h')}
              disabled={ptOvertimeList.length === 0}
              className="btn bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs py-1.5 px-3 rounded-lg font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} /> Xuất File OFC ({ptOvertimeList.length} NV vượt 91h)
            </button>
            <button
              onClick={() => handleExportOFC_CSV(allPTList, 'TatCa_PartTime')}
              className="btn btn-outline text-xs py-1.5 px-3 rounded-lg font-semibold flex items-center gap-1.5 hover:text-blue-700"
            >
              <FileSpreadsheet size={14} /> Xuất Toàn Bộ PT
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100">
          <div className="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
            <table className="excel-table whitespace-nowrap text-xs w-full">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-300 font-bold text-slate-700">
                  <th className="p-2 border-r border-slate-300 w-12 text-center sticky left-0 z-20 bg-slate-200">STT</th>
                  <th className="p-2 border-r border-slate-300 text-center sticky left-12 z-20 bg-slate-200">Cửa Hàng</th>
                  <th className="p-2 border-r border-slate-300 text-center sticky left-28 z-20 bg-slate-200">Mã NV</th>
                  <th className="p-2 border-r border-slate-300 text-center">Mã Điểm Danh</th>
                  <th className="p-2 border-r border-slate-300 text-center">Vị Trí</th>
                  <th className="p-2 border-r border-slate-300 text-left sticky left-48 z-20 bg-slate-200">Họ và Tên</th>
                  
                  {/* 31 Cột Ngày */}
                  {cycleDates.map(d => (
                    <th key={d.key} className="p-1.5 border-r border-slate-300 text-center min-w-[70px] text-[11px] font-mono">
                      {d.display}
                    </th>
                  ))}

                  <th className="p-2 text-center bg-red-100 text-red-800 font-extrabold sticky right-0 z-20">
                    Tổng giờ làm
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ptOvertimeList.length === 0 ? (
                  <tr>
                    <td colSpan={7 + cycleDates.length} className="p-8 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="text-3xl">🎉</span>
                        <span className="font-bold text-slate-700 text-sm">Tuyệt vời! Không có nhân viên Part-time nào vượt quá 91 giờ trong tháng.</span>
                        <span className="text-xs text-slate-400">Tất cả nhân sự Part-time đều tuân thủ đúng định mức lao động.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  ptOvertimeList.map((emp, idx) => (
                    <tr key={emp.id} className="hover:bg-red-50/40 transition-colors">
                      <td className="p-2 text-center font-mono text-slate-400 sticky left-0 z-10 bg-white border-r border-slate-300">{idx + 1}</td>
                      <td className="p-2 text-center font-bold text-blue-700 sticky left-12 z-10 bg-white border-r border-slate-300">{emp.dept}</td>
                      <td className="p-2 text-center font-mono font-semibold text-slate-700 sticky left-28 z-10 bg-white border-r border-slate-300">{emp.id}</td>
                      <td className="p-2 text-center text-slate-400 border-r border-slate-300">{emp.attendanceCode || '-'}</td>
                      <td className="p-2 text-center font-semibold text-slate-600 border-r border-slate-300">
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                          {emp.role || 'CSR PT'}
                        </span>
                      </td>
                      <td className="p-2 font-bold text-slate-800 sticky left-48 z-10 bg-white border-r border-slate-300 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                        {emp.name}
                      </td>

                      {/* 31 Ngày Ca Làm Việc */}
                      {cycleDates.map(d => {
                        const shiftVal = emp.dailyShifts[d.key];
                        return (
                          <td key={d.key} className="p-1 text-center font-mono font-bold text-[10px] border-r border-slate-200 text-slate-700">
                            {shiftVal ? (
                              <span className="px-1 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 block">
                                {shiftVal}
                              </span>
                            ) : '-'}
                          </td>
                        );
                      })}

                      {/* Tổng giờ */}
                      <td className="p-2 text-center font-black text-red-700 bg-red-100 border-l border-red-200 sticky right-0 z-10 text-sm">
                        ⚠️ {emp.totalHours}h
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>* Định dạng file xuất khẩu tuân thủ mẫu bảng tính OFC dành cho nhân viên Part-time vượt giờ.</span>
          <button onClick={onClose} className="btn btn-outline text-xs py-1.5 px-4 rounded-lg font-bold">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
