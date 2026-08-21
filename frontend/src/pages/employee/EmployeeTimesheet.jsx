import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { 
  Download, 
  Printer, 
  Search, 
  FileText, 
  AlertCircle, 
  Clock, 
  Building2, 
  Users, 
  X,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import TimesheetRow from '../../components/TimesheetRow';
import { useGroupedEmployees } from '../../hooks/useGroupedEmployees';
import { exportTimesheetToExcel } from '../../utils/excelExport';
import { getShiftCode, getShiftHours } from '../../utils/shiftHelper';
import { getPayrollCycleDates, getPayrollCycleFromWeek } from '../../data/constants';
import PersonalTimesheetModal from '../../components/modals/PersonalTimesheetModal';

export default function EmployeeTimesheet() {
  const { user, schedule, currentWeek, employees, ensureWeeksLoaded } = useStore();
  const weekSchedule = schedule[currentWeek] || {};
  const myDept = user?.dept || 'VN0497';

  const [search, setSearch] = useState('');
  const [filterOnlyMe, setFilterOnlyMe] = useState(false);
  const [showPersonalSlip, setShowPersonalSlip] = useState(false);

  const payrollCycle = useMemo(() => getPayrollCycleFromWeek(currentWeek), [currentWeek]);
  const cycleDates = useMemo(
    () => getPayrollCycleDates(payrollCycle.year, payrollCycle.month),
    [payrollCycle]
  );
  const activeDays = useMemo(() => cycleDates.map(d => d.key), [cycleDates]);

  React.useEffect(() => {
    ensureWeeksLoaded(cycleDates.map(d => d.weekKey));
  }, [cycleDates, ensureWeeksLoaded]);

  const groupedEmps = useGroupedEmployees(search, myDept, 'ALL', weekSchedule);

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
    const isPT = user?.type === 'PARTTIME' || user?.type === 'STPT' || (user?.role && user?.role.includes('PT'));
    activeDays.forEach(day => {
      const val = getDayValue(user?.id, day);
      if (val && val !== 'OFF') {
        const num = parseFloat(val);
        if (!isNaN(num)) total += num;
        else total += 8; // Mặc định ca đủ 8 tiếng
      }
    });
    return total;
  }, [user, activeDays, weekSchedule]);

  const isPT = user?.type === 'PARTTIME' || user?.type === 'STPT' || (user?.role && user?.role.includes('PT'));
  const isOver91 = isPT && myTotalHours > 91;

  // Xuất file Excel (.xls) bảng chấm công đầy đủ kẻ bảng, màu sắc
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

  const handlePrint = () => {
    window.print();
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
      
      {/* Top Toolbar (Full-Width Matching Admin Timesheet) */}
      <div className="print:hidden">
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          
          {/* Left: Search & Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              <input
                type="text"
                placeholder="Tìm nhân viên trong CH..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-7 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-44 sm:w-56"
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
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                filterOnlyMe 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filterOnlyMe ? '✓ Đang xem bảng công của tôi' : '👁️ Chỉ xem công của tôi'}
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-bold">
              <AlertCircle size={14} className="text-amber-600" />
              <span>Chốt C&B: <strong>17h30 Ngày 10</strong></span>
            </div>

            {/* Nút Xem Phiếu Công Cá Nhân */}
            <button
              type="button"
              onClick={() => setShowPersonalSlip(true)}
              className="btn bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs py-1 px-2.5 rounded-lg font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <FileText size={13} className="text-indigo-600" />
              <span>Phiếu công cá nhân</span>
            </button>

            <Link
              to="/employee/feedback"
              className="btn bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-2.5 rounded-lg font-bold shadow-xs flex items-center gap-1"
            >
              <FileText size={13} /> Báo Bù Công
            </Link>

            <button className="btn btn-outline text-xs py-1 px-2.5 rounded-lg font-semibold hover:text-emerald-700 hover:border-emerald-300" onClick={handleExportExcel} title="Xuất file Excel có đầy đủ kẻ bảng và màu sắc">
              <Download size={13} className="text-emerald-600" /> <span className="hidden md:inline">Xuất Excel</span>
            </button>
            <button className="btn btn-outline text-xs py-1 px-2.5 rounded-lg font-semibold hover:text-blue-700" onClick={handlePrint} title="In hoặc lưu PDF">
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
                    ? `⚠️ Cảnh báo: Vượt hạn mức 91h/tháng (${myTotalHours}h / 91h)`
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
          <span>Đơn vị: Chuỗi Cửa Hàng OFC</span>
        </div>
      </div>

      {/* Full-Width Excel Spreadsheet Table */}
      <div className="flex-1 overflow-auto bg-slate-100 p-2 relative print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:h-auto">
        <div className="bg-white shadow border border-slate-300 inline-block min-w-full print:shadow-none print:border-none print:w-full print:block">
          <table className="excel-table print:w-full">
            <thead>
              {/* Header Tầng 1 */}
              <tr className="bg-slate-200 border-b border-slate-300 font-bold text-slate-700 text-xs">
                <th rowSpan={2} className="min-w-[40px] w-[40px] max-w-[40px] text-center md:sticky left-0 z-20 bg-slate-200 border-r border-slate-300">STT</th>
                <th rowSpan={2} className="hidden md:table-cell min-w-[96px] w-[96px] max-w-[96px] text-center md:sticky z-20 bg-slate-200 border-r border-slate-300" style={{ left: '40px' }}>Mã NV</th>
                <th rowSpan={2} className="min-w-[150px] md:min-w-[192px] w-[150px] md:w-[192px] max-w-[150px] md:max-w-[192px] text-left md:sticky z-20 bg-slate-200 border-r border-slate-300 px-2 left-0 md:left-[136px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">Họ và Tên</th>
                <th rowSpan={2} className="hidden md:table-cell min-w-[80px] w-[80px] max-w-[80px] text-center md:sticky z-20 bg-slate-200 border-r border-slate-300" style={{ left: '328px' }}>Bộ phận</th>
                <th rowSpan={2} className="hidden lg:table-cell min-w-[120px] w-[120px] max-w-[120px] text-center lg:sticky z-20 bg-slate-200 border-r border-slate-400" style={{ left: '408px' }}>Vị trí / Chức vụ</th>

                {/* 31 Cột Ngày */}
                <th colSpan={31} className="text-center border-r border-slate-400 bg-slate-100 py-1">
                  CHI TIẾT CHẤM CÔNG CHU KỲ (26 THÁNG TRƯỚC → 25 THÁNG NÀY)
                </th>

                {/* Các Cột Tổng Hợp */}
                <th rowSpan={2} className="min-w-[64px] w-[64px] text-center border-r border-slate-300 bg-slate-200">Công chuẩn</th>
                <th rowSpan={2} className="min-w-[64px] w-[64px] text-center border-r border-slate-300 bg-slate-200 text-blue-800">Công PT</th>
                <th rowSpan={2} className="min-w-[64px] w-[64px] text-center border-r border-slate-300 bg-slate-200 text-blue-800">Công FT</th>
                <th rowSpan={2} className="min-w-[48px] w-[48px] text-center border-r border-slate-300 bg-slate-200 text-red-600">Vắng KL</th>
                <th rowSpan={2} className="min-w-[64px] w-[64px] text-center border-r border-slate-300 bg-slate-200">Tổng công</th>
              </tr>

              {/* Header Tầng 2 (Các Ngày 26 -> 25) */}
              <tr className="bg-slate-100 border-b border-slate-300 font-mono text-[10px] text-slate-600">
                {activeDays.map(day => (
                  <th key={day} className="min-w-[48px] w-[48px] max-w-[48px] text-center border-r border-slate-200 p-1">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedEmps).map(([dept, emps]) => {
                const filtered = filterOnlyMe 
                  ? emps.filter(e => e.id === user?.id) 
                  : emps;

                return (
                  <React.Fragment key={dept}>
                    {/* Header Cửa Hàng */}
                    <tr className="bg-slate-100 font-bold border-b border-slate-300">
                      <td colSpan={activeDays.length + 11} className="px-4 py-1.5 text-blue-800 text-xs sticky left-0 z-10 bg-slate-100">
                        🏬 CỬA HÀNG: {dept} ({filtered.length} nhân sự)
                      </td>
                    </tr>

                    {/* Các Dòng Nhân Viên */}
                    {filtered.map((emp, idx) => (
                      <TimesheetRow 
                        key={emp.id}
                        emp={emp}
                        idx={idx}
                        activeDays={activeDays}
                        getDayValue={getDayValue}
                      />
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}