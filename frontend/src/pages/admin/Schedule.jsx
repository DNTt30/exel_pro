import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { useGroupedEmployees } from '../../hooks/useGroupedEmployees';
import { SHIFTS } from '../../data/initialData';
import { WEEK_DAYS } from '../../data/constants';
import { Save, Download, Printer } from 'lucide-react';
import Toolbar from '../../components/Toolbar';
import { exportScheduleToExcel } from '../../utils/excelExport';
import { 
  normalizeShift, 
  getShiftCode, 
  getCoveringStore, 
  getShiftHours 
} from '../../utils/shiftHelper';

import AddEmployeeModal from '../../components/modals/AddEmployeeModal';
import AddStoreModal from '../../components/modals/AddStoreModal';
import TransferModal from '../../components/modals/TransferModal';
import PTOvertimeModal from '../../components/modals/PTOvertimeModal';
import EmployeeRow from '../../components/EmployeeRow';

export default function Schedule() {
  const { employees, schedule, updateShift, currentWeek, user } = useStore();
  const weekSchedule = schedule[currentWeek] || {};
  
  const isAdmin = user?.role === 'admin';
  const isManager = user?.isManager;
  
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState(isAdmin ? 'ALL' : user?.dept);
  const [filterRole, setFilterRole] = useState('ALL');

  const [showAddEmp, setShowAddEmp] = useState(false);
  const [showAddStore, setShowAddStore] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showPTOvertime, setShowPTOvertime] = useState(false);

  // Nhóm nhân viên theo cửa hàng + xử lý mượn nhân sự
  const groupedEmps = useGroupedEmployees(search, filterDept, filterRole, weekSchedule);

  // Xử lý thay đổi ca làm việc (Lưu dạng Object nếu là ca chi viện)
  const handleShiftChange = useCallback((emp, day, value) => {
    let saveVal = value;
    if (emp.isBorrowedTo && value && value !== 'off') {
      saveVal = {
        shift: value,
        covering_store: emp.isBorrowedTo
      };
    }
    updateShift(currentWeek, emp.id, day, saveVal);
  }, [currentWeek, updateShift]);

  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'

  const activeDays = useMemo(() => {
    if (viewMode === 'week') return WEEK_DAYS;
    
    // Tạo 31 ngày chu kỳ lương 26 -> 25
    const days = [];
    for (let i = 26; i <= 31; i++) days.push(`${i}`);
    for (let i = 1; i <= 25; i++) days.push(`${i}`);
    return days;
  }, [viewMode]);

  // Xuất file Excel (.xls) có đầy đủ định dạng
  const handleExportExcel = () => {
    exportScheduleToExcel({
      currentWeek,
      deptName: (isAdmin ? filterDept : user?.dept) === 'ALL' ? 'Toan_Bo_Cua_Hang' : (isAdmin ? filterDept : user?.dept),
      groupedEmps,
      weekSchedule,
      viewMode
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Tổng hợp chỉ số KPI
  const summaryMetrics = useMemo(() => {
    let totalEmps = 0;
    let totalHours = 0;
    let totalFT = 0;
    let totalPT = 0;
    let ptOver91Count = 0;

    Object.values(groupedEmps).forEach(emps => {
      emps.forEach(emp => {
        totalEmps++;
        const isPartTime = emp.type === 'STPT' || emp.type === 'PARTTIME' || (emp.role && emp.role.includes('PT'));
        if (isPartTime) totalPT++;
        else totalFT++;

        const empSched = weekSchedule[emp.id] || {};
        let empHours = 0;

        activeDays.forEach(d => {
          const rawVal = empSched[d];
          if (!rawVal) return;
          const { shift, covering_store } = normalizeShift(rawVal);
          if (!shift || shift === 'off') return;

          if (emp.isBorrowedTo && covering_store !== emp.isBorrowedTo) return;
          if (!emp.isBorrowedTo && covering_store) return;

          empHours += getShiftHours(shift);
        });

        totalHours += empHours;
        if (isPartTime && (viewMode === 'month' ? empHours > 91 : empHours > 23)) {
          ptOver91Count++;
        }
      });
    });

    return { totalEmps, totalHours, totalFT, totalPT, ptOver91Count };
  }, [groupedEmps, weekSchedule, activeDays, viewMode]);

  return (
    <div className="space-y-4">
      {/* 1. Modal Components */}
      <AddEmployeeModal isOpen={showAddEmp} onClose={() => setShowAddEmp(false)} />
      <AddStoreModal isOpen={showAddStore} onClose={() => setShowAddStore(false)} />
      <TransferModal isOpen={showTransfer} onClose={() => setShowTransfer(false)} />
      <PTOvertimeModal isOpen={showPTOvertime} onClose={() => setShowPTOvertime(false)} />

      {/* 2. Top Toolbar */}
      <div className="print:hidden">
        <Toolbar 
          search={search} 
          setSearch={setSearch}
          filterDept={filterDept} 
          setFilterDept={setFilterDept}
          filterRole={filterRole} 
          setFilterRole={setFilterRole}
          onOpenAddEmp={() => setShowAddEmp(true)}
          onOpenAddStore={() => setShowAddStore(true)}
          onOpenTransfer={() => setShowTransfer(true)}
          onOpenPTOvertime={() => setShowPTOvertime(true)}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      </div>

      {/* 3. KPI Summary Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Tổng nhân sự: <strong className="font-mono text-slate-900">{summaryMetrics.totalEmps}</strong> ({summaryMetrics.totalFT} FT, {summaryMetrics.totalPT} PT)</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Tổng giờ công: <strong className="font-mono text-emerald-700">{summaryMetrics.totalHours}h</strong></span>
          </div>
          {summaryMetrics.ptOver91Count > 0 && (
            <div 
              onClick={() => setShowPTOvertime(true)}
              className="flex items-center gap-1.5 font-extrabold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-red-100 transition-all shadow-2xs"
            >
              <span className="animate-pulse">⚠️</span>
              <span>Có {summaryMetrics.ptOver91Count} nhân sự Part-Time vượt {viewMode === 'month' ? '91h/tháng' : '23h/tuần'}! (Xem chi tiết)</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Xuất file Excel chuẩn"
          >
            <Download size={14} />
            <span>Xuất Excel (.xls)</span>
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Printer size={14} />
            <span>In / PDF</span>
          </button>
        </div>
      </div>

      {/* 4. Main Schedule Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
        
        {/* Print Header */}
        <div className="hidden print:block p-4 border-b border-slate-300 text-center">
          <h1 className="text-xl font-bold uppercase tracking-wider text-black">
            BẢNG PHÂN CÔNG LỊCH LÀM VIỆC - {viewMode === 'week' ? `TUẦN ${currentWeek}` : 'THEO THÁNG'}
          </h1>
          <p className="text-xs text-slate-600 mt-1">Hệ thống Quản lý Phân ca & Chấm công OFC</p>
        </div>

        <div className="overflow-x-auto excel-table-container">
          <table className="w-full text-left border-collapse select-none">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 h-9">
                <th className="min-w-[48px] w-[48px] max-w-[48px] text-center font-bold text-slate-600 text-xs sticky left-0 z-20 bg-slate-100 border-r border-slate-300">STT</th>
                <th className="hidden md:table-cell min-w-[96px] w-[96px] max-w-[96px] text-center font-bold text-slate-600 text-xs sticky left-[48px] z-20 bg-slate-100 border-r border-slate-300 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">Mã NV</th>
                <th className="min-w-[150px] md:min-w-[192px] w-[150px] md:w-[192px] max-w-[150px] md:max-w-[192px] text-left font-bold text-slate-800 text-xs sticky left-[48px] md:left-[144px] z-20 bg-slate-100 border-r border-slate-300 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] pl-2">Họ và Tên</th>
                <th className="hidden md:table-cell min-w-[96px] w-[96px] max-w-[96px] text-center font-bold text-slate-600 text-xs sticky z-20 bg-slate-100 border-r border-slate-300 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ left: '336px' }}>Vị trí</th>
                
                {/* Dynamic Day Headers */}
                {activeDays.map((day, idx) => {
                  let isToday = false;
                  let dateStr = '';
                  if (viewMode === 'week' && currentWeek) {
                    const parts = currentWeek.split('-');
                    const y = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10);
                    const d = parseInt(parts[2], 10);
                    const curr = new Date(y, m - 1, d);
                    curr.setDate(curr.getDate() + idx);
                    
                    const now = new Date();
                    isToday = curr.getDate() === now.getDate() && curr.getMonth() === now.getMonth() && curr.getFullYear() === now.getFullYear();
                    dateStr = `${curr.getDate().toString().padStart(2, '0')}/${(curr.getMonth() + 1).toString().padStart(2, '0')}`;
                  }

                  return (
                    <th 
                      key={day} 
                      className={`min-w-[70px] max-w-[80px] text-center font-bold border-r border-slate-300 py-1 px-0.5 transition-colors ${
                        isToday 
                          ? 'bg-blue-200/90 text-blue-950 font-black ring-1 ring-blue-500' 
                          : (viewMode === 'week' && day === 'CN' ? 'bg-orange-50/80 text-orange-900' : 'bg-slate-200 text-slate-700')
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span className="text-xs font-black">{day}</span>
                        {dateStr && <span className="text-[10px] font-mono font-bold opacity-80 mt-0.5">{dateStr}</span>}
                        {isToday && (
                          <span className="text-[8px] uppercase tracking-tighter bg-blue-600 text-white px-1 rounded font-black mt-0.5 shadow-2xs">
                            Hôm nay
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="min-w-[80px] w-[80px] max-w-[80px] text-center font-bold text-slate-800 text-xs">Tổng giờ</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedEmps).length === 0 ? (
                <tr>
                  <td colSpan={5 + activeDays.length} className="p-8 text-center text-slate-400">
                    Không tìm thấy nhân viên nào phù hợp bộ lọc
                  </td>
                </tr>
              ) : (
                (() => {
                  let absoluteRowIdx = 0;
                  return Object.entries(groupedEmps).map(([dept, emps]) => (
                    <React.Fragment key={dept}>
                      {/* Department Header Row */}
                      <tr className="bg-blue-50 border-b border-slate-300">
                        <td colSpan={5 + activeDays.length} className="font-bold text-blue-800 sticky left-0 z-10 border-r-0 py-1 px-3">
                          🏬 Cửa hàng: {dept} ({emps.length} nhân sự)
                        </td>
                      </tr>
                      
                      {/* Employees Rows */}
                      {emps.map((emp, idx) => {
                        const empSched = weekSchedule[emp.id] || {};
                        const currentRow = absoluteRowIdx++;
                        return (
                          <EmployeeRow 
                            key={emp.id + (emp.isBorrowedTo ? `_borrowed_${emp.isBorrowedTo}` : '')}
                            emp={emp}
                            empSched={empSched}
                            idx={idx}
                            absoluteRowIdx={currentRow}
                            handleShiftChange={handleShiftChange}
                            isAdmin={isAdmin}
                            days={activeDays}
                          />
                        );
                      })}
                    </React.Fragment>
                  ));
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}