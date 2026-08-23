import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { 
  Download, 
  Printer, 
  Search, 
  FileText, 
  AlertCircle, 
  X 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import TimesheetTable from '../../components/timesheet/TimesheetTable';
import { useGroupedEmployees } from '../../hooks/useGroupedEmployees';
import { exportTimesheetToExcel } from '../../utils/excelExport';
import { getShiftCode, getShiftHours } from '../../utils/shiftHelper';
import { getPayrollCycleDates, getPayrollCycleFromWeek } from '../../utils/dateHelper';
import PersonalTimesheetModal from '../../components/modals/PersonalTimesheetModal';

export default function EmployeeTimesheet() {
  const { user, schedule, currentWeek, ensureWeeksLoaded } = useStore();
  const weekSchedule = schedule[currentWeek] || {};
  const myDept = user?.dept || 'VN0497';

  const [search, setSearch] = useState('');
  const [filterOnlyMe, setFilterOnlyMe] = useState(true);
  const [showPersonalSlip, setShowPersonalSlip] = useState(false);

  const payrollCycle = useMemo(() => getPayrollCycleFromWeek(currentWeek), [currentWeek]);
  const cycleDates = useMemo(
    () => getPayrollCycleDates(payrollCycle.year, payrollCycle.month),
    [payrollCycle]
  );
  const activeDays = useMemo(() => cycleDates.map(d => d.key), [cycleDates]);

  useEffect(() => {
    ensureWeeksLoaded(cycleDates.map(d => d.weekKey));
  }, [cycleDates, ensureWeeksLoaded]);

  const rawGroupedEmps = useGroupedEmployees(search, myDept, 'ALL', weekSchedule);

  // Lọc chỉ xem của tôi hoặc toàn bộ cửa hàng
  const groupedEmps = useMemo(() => {
    if (!filterOnlyMe) return rawGroupedEmps;
    const result = {};
    Object.entries(rawGroupedEmps).forEach(([dept, emps]) => {
      const mine = emps.filter(e => e.id === user?.id);
      if (mine.length) result[dept] = mine;
    });
    return result;
  }, [rawGroupedEmps, filterOnlyMe, user?.id]);

  const getDayValue = (empId, day) => {
    const cell = cycleDates.find(d => d.key === day);
    if (!cell) return '';
    const actual = getShiftCode(schedule[cell.weekKey]?.[empId]?.[cell.dayKey]);
    if (!actual || actual === 'off' || actual === 'OFF') return 'OFF';
    const hours = getShiftHours(actual);
    return hours > 0 ? String(hours) : actual;
  };

  // Tính tổng giờ công của cá nhân
  const myTotalHours = useMemo(() => {
    let total = 0;
    activeDays.forEach(day => {
      const val = getDayValue(user?.id, day);
      if (val && val !== 'OFF') {
        const num = parseFloat(val);
        if (!isNaN(num)) total += num;
        else total += 8;
      }
    });
    return total;
  }, [user, activeDays, weekSchedule, cycleDates]);

  const isPT = user?.type === 'PARTTIME' || user?.type === 'STPT' || (user?.role && user?.role.includes('PT'));
  const isOver91 = isPT && myTotalHours > 91;

  const handleExportExcel = () => {
    exportTimesheetToExcel({
      currentWeek,
      deptName: myDept,
      groupedEmps,
      getDayValue,
      activeDays,
      filterOnlyMe,
      currentUserId: user?.id
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative print:bg-white print:block">
      {/* Modal Phiếu Chấm Công Cá Nhân */}
      <PersonalTimesheetModal
        isOpen={showPersonalSlip}
        onClose={() => setShowPersonalSlip(false)}
        user={user}
        activeDays={activeDays}
        weekSchedule={weekSchedule}
      />
      
      {/* Top Toolbar */}
      <div className="print:hidden">
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          
          {/* Left: Search & Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              <input
                type="text"
                placeholder="Tìm nhân viên trong CH..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-44 sm:w-56"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Toggle Only Me */}
            <button
              onClick={() => setFilterOnlyMe(!filterOnlyMe)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                filterOnlyMe 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filterOnlyMe ? '✓ Đang xem công của tôi' : '👁️ Chỉ xem công của tôi'}
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold">
              <AlertCircle size={14} className="text-amber-600" />
              <span>Chốt C&B: <strong>17h30 Ngày 10</strong></span>
            </div>

            {/* Nút Xem Phiếu Công Cá Nhân */}
            <button
              type="button"
              onClick={() => setShowPersonalSlip(true)}
              className="btn bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs py-1.5 px-3 rounded-xl font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileText size={13} className="text-indigo-600" />
              <span>Phiếu công cá nhân</span>
            </button>

            <Link
              to="/employee/feedback"
              className="btn bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3 rounded-xl font-bold shadow-xs flex items-center gap-1.5"
            >
              <FileText size={13} /> Báo Bù Công
            </Link>

            <button className="btn btn-outline text-xs py-1.5 px-3 rounded-xl font-semibold hover:text-emerald-700 hover:border-emerald-300 flex items-center gap-1 cursor-pointer" onClick={handleExportExcel} title="Xuất file Excel có đầy đủ kẻ bảng và màu sắc">
              <Download size={13} className="text-emerald-600" /> <span className="hidden md:inline">Xuất Excel</span>
            </button>
            <button className="btn btn-outline text-xs py-1.5 px-3 rounded-xl font-semibold hover:text-blue-700 flex items-center gap-1 cursor-pointer" onClick={() => window.print()} title="In bảng công">
              <Printer size={13} /> <span className="hidden md:inline">In PDF</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stats Summary Bar */}
        <div className="bg-slate-100/90 px-4 py-1.5 border-b border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <span className="font-semibold text-slate-700">
              👤 Nhân viên: <strong className="text-slate-900">{user?.name}</strong> ({user?.id})
            </span>
            <span className="text-slate-300">|</span>
            <span>
              📅 Chu kỳ lương: <strong>26 tháng trước → 25 tháng này</strong> (31 ngày)
            </span>
            <span className="text-slate-300">|</span>
            <span>
              ⏱️ Tổng giờ làm của tôi: <strong className="text-blue-700 font-bold">{myTotalHours}h</strong>
            </span>

            {isPT && (
              <>
                <span className="text-slate-300">|</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  isOver91 
                    ? 'bg-red-100 text-red-700 border border-red-300 animate-pulse'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}>
                  {isOver91 
                    ? `⚠️ Vượt hạn mức 91h/tháng (${myTotalHours}h / 91h)`
                    : `✓ Định mức PT an toàn (${myTotalHours}h / 91h)`}
                </span>
              </>
            )}
          </div>

          <div className="text-[10px] text-slate-500 flex items-center gap-2">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500"></span> Vượt 91h PT</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-600"></span> Đủ công</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-300"></span> Nghỉ (OFF)</span>
          </div>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-4 pb-2 border-b border-slate-300">
        <h1 className="text-xl font-black uppercase text-slate-900 tracking-wide">
          BẢNG CHẤM CÔNG THÁNG (CHU KỲ 26 - 25)
        </h1>
        <div className="flex justify-between items-center text-xs text-slate-600 mt-1 px-2">
          <span>Cửa hàng: {myDept} | Nhân viên: {user?.name} ({user?.id})</span>
          <span>Ngày in: {new Date().toLocaleDateString('vi-VN')}</span>
          <span>Đơn vị: Chuỗi Cửa Hàng GS25</span>
        </div>
      </div>

      {/* Shared Timesheet Table */}
      <TimesheetTable
        groupedEmps={groupedEmps}
        cycleDates={cycleDates}
        activeDays={activeDays}
        getDayValue={getDayValue}
      />
    </div>
  );
}
