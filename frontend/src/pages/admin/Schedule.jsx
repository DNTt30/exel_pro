import React, { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useGroupedEmployees } from '../../hooks/useGroupedEmployees';

import { WEEK_DAYS, getPayrollCycleDates, getPayrollCycleFromWeek } from '../../data/constants';
import { Download, Printer, Copy, Upload, Sparkles, Bot } from 'lucide-react';
import Toolbar from '../../components/Toolbar';
import { exportScheduleToExcel } from '../../utils/excelExport';
import { normalizeShift, getShiftHours } from '../../utils/shiftHelper';
import { isOpsManager, canPickStore } from '../../lib/authSession';
import { visibleDeptIds } from '../../utils/dataScope';
import WeekFlowBar from '../../components/WeekFlowBar';
import { weekRecordKey, isWeekLocked } from '../../utils/scheduleWeek';
import { analyzeWeek } from '../../utils/scheduleConflicts';
import ConflictPanel from '../../components/schedule/ConflictPanel';

const AddEmployeeModal = React.lazy(() => import('../../components/modals/AddEmployeeModal'));
import AddStoreModal from '../../components/modals/AddStoreModal';
const TransferModal = React.lazy(() => import('../../components/modals/TransferModal'));
const PTOvertimeModal = React.lazy(() => import('../../components/modals/PTOvertimeModal'));
const ImportScheduleModal = React.lazy(() => import('../../components/modals/ImportScheduleModal'));
const ShiftSwapListModal = React.lazy(() => import('../../components/modals/ShiftSwapListModal'));
const AISchedulerModal = React.lazy(() => import('../../components/modals/AISchedulerModal'));
import AICopilotDrawer from '../../components/ai/AICopilotDrawer';
import StaffingGapTable from '../../components/StaffingGapTable';
import EmployeeRow from '../../components/EmployeeRow';
import * as api from '../../services/api';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '../../components/ui/toastStore';

// Ô lịch / mảng trống dùng chung — giữ tham chiếu ổn định cho useMemo & React.memo
const EMPTY_SCHED = {};

export default function Schedule() {
  const { employees, stores, schedule, updateShift, currentWeek, user, shiftSwaps, ensureWeeksLoaded, scheduleWeeks } = useStore(useShallow((s) => ({ employees: s.employees, stores: s.stores, schedule: s.schedule, updateShift: s.updateShift, currentWeek: s.currentWeek, user: s.user, shiftSwaps: s.shiftSwaps, ensureWeeksLoaded: s.ensureWeeksLoaded, scheduleWeeks: s.scheduleWeeks })));
  const weekSchedule = schedule[currentWeek] || EMPTY_SCHED;
  
  const [searchParams, setSearchParams] = useSearchParams();

  const isManager = isOpsManager(user);
  const pickStore = canPickStore(user);
  
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState(pickStore ? 'ALL' : user?.dept);
  // SM da-CH: nhan CH dang chon neu no nam trong pham vi sm_id
  const allowedFlow = new Set(visibleDeptIds(user, stores));
  const flowStore = pickStore ? filterDept : ((filterDept && allowedFlow.has(filterDept)) ? filterDept : (user?.dept || ''));
  const weekLocked = isWeekLocked((scheduleWeeks || {})[weekRecordKey(flowStore === 'ALL' ? '' : flowStore, currentWeek)]?.status);
  const canEditGrid = isManager && !weekLocked;
  const [filterRole, setFilterRole] = useState('ALL');

  const [showAddEmp, setShowAddEmp] = useState(false);
  const [showAddStore, setShowAddStore] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showPTOvertime, setShowPTOvertime] = useState(false);
  const [showImportSchedule, setShowImportSchedule] = useState(false);
  const [showSwapList, setShowSwapList] = useState(false);
  const [showAIScheduler, setShowAIScheduler] = useState(false);
  const [showAICopilot, setShowAICopilot] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Tự động mở modal đơn đổi ca nếu có URL param ?openSwaps=true
  useEffect(() => {
    if (searchParams.get('openSwaps') === 'true') {
      setShowSwapList(true);
      searchParams.delete('openSwaps');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const pendingManagerSwapsCount = useMemo(() => {
    return (shiftSwaps || []).filter(s => s.status === 'pending_manager' && (pickStore || s.store === user?.dept)).length;
  }, [shiftSwaps, pickStore, user?.dept]);

  // Nhóm nhân viên theo cửa hàng + xử lý mượn nhân sự
  const groupedEmps = useGroupedEmployees(search, filterDept, filterRole, weekSchedule);

  // Xử lý thay đổi ca làm việc (Lưu dạng Object nếu là ca chi viện)
  const [viewMode, setViewMode] = useState('week');

  const payrollCycle = useMemo(() => getPayrollCycleFromWeek(currentWeek), [currentWeek]);
  const cycleDates = useMemo(
    () => getPayrollCycleDates(payrollCycle.year, payrollCycle.month),
    [payrollCycle]
  );

  useEffect(() => {
    if (viewMode !== 'month') return;
    ensureWeeksLoaded(cycleDates.map(d => d.weekKey));
  }, [viewMode, cycleDates, ensureWeeksLoaded]);

  const handleShiftChange = useCallback((emp, day, value) => {
    let saveVal = value;
    if (emp.isBorrowedTo && value && value !== 'off') {
      saveVal = {
        shift: value,
        covering_store: emp.isBorrowedTo
      };
    }
    if (viewMode === 'month') {
      const cell = cycleDates.find(d => d.key === day);
      if (cell) {
        updateShift(cell.weekKey, emp.id, cell.dayKey, saveVal);
        return;
      }
    }
    updateShift(currentWeek, emp.id, day, saveVal);
  }, [currentWeek, updateShift, viewMode, cycleDates]);

  // Memo giữ tham chiếu ổn định để EmployeeRow (memo) không re-render hàng loạt
  const activeDays = useMemo(
    () => (viewMode === 'week' ? WEEK_DAYS : cycleDates.map(d => d.key)),
    [viewMode, cycleDates]
  );

  // Xuất file Excel (.xls) có đầy đủ định dạng
  const handleExportExcel = () => {
    exportScheduleToExcel({
      currentWeek,
      deptName: (pickStore ? filterDept : user?.dept) === 'ALL' ? 'Toan_Bo_Cua_Hang' : (pickStore ? filterDept : user?.dept),
      groupedEmps,
      weekSchedule,
      viewMode
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Sao chép nhanh lịch làm việc từ tuần trước sang tuần này
  const handleCopyPreviousWeek = async () => {
    const parts = currentWeek.split('-').map(Number);
    const prevMon = new Date(parts[0], parts[1] - 1, parts[2]);
    prevMon.setDate(prevMon.getDate() - 7);
    const prevWeekKey = `${prevMon.getFullYear()}-${String(prevMon.getMonth() + 1).padStart(2, '0')}-${String(prevMon.getDate()).padStart(2, '0')}`;

    const prevSun = new Date(prevMon);
    prevSun.setDate(prevMon.getDate() + 6);
    const prevRange = `${String(prevMon.getDate()).padStart(2, '0')}/${String(prevMon.getMonth() + 1).padStart(2, '0')} → ${String(prevSun.getDate()).padStart(2, '0')}/${String(prevSun.getMonth() + 1).padStart(2, '0')}`;

    const curSun = new Date(parts[0], parts[1] - 1, parts[2]);
    curSun.setDate(curSun.getDate() + 6);
    const curRange = `${String(parts[2]).padStart(2, '0')}/${String(parts[1]).padStart(2, '0')} → ${String(curSun.getDate()).padStart(2, '0')}/${String(curSun.getMonth() + 1).padStart(2, '0')}`;

    if (weekLocked) return toast.error('Tuần đang chờ duyệt hoặc đã duyệt — không copy đè.');
    const confirmed = window.confirm(`Sao chép toàn bộ ca làm việc từ tuần trước (${prevRange}) sang tuần này (${curRange})?`);
    if (!confirmed) return;

    setIsCopying(true);
    try {
      let sourceSched = schedule[prevWeekKey];
      if (!sourceSched || Object.keys(sourceSched).length === 0) {
        sourceSched = await api.getSchedulesByWeek(prevWeekKey);
      }

      if (!sourceSched || Object.keys(sourceSched).length === 0) {
        return toast.error(`Tuần trước (${prevRange}) chưa có lịch làm việc nào để sao chép!`);
      }

      let targetEmps = employees;
      if (filterDept && filterDept !== 'ALL') {
        targetEmps = targetEmps.filter(e => e.dept === filterDept);
      }

      const destSched = { ...(schedule[currentWeek] || {}) };
      let copiedCount = 0;

      const bulkUpdates = {};
      for (const emp of targetEmps) {
        if (sourceSched[emp.id]) {
          destSched[emp.id] = { ...sourceSched[emp.id] };
          bulkUpdates[emp.id] = destSched[emp.id];
          copiedCount++;
        }
      }

      // Lưu hàng loạt lên Supabase thay vì N+1 request
      if (copiedCount > 0) {
        await api.saveBulkEmployeeSchedules(currentWeek, bulkUpdates);
        useStore.getState().appendAdminLog('COPY_SHIFT_WEEK', currentWeek, `${copiedCount} nhân sự`, {
          resourceType: 'shift',
          resourceId: currentWeek,
          storeId: user?.dept || '',
          description: `Sao chép lịch tuần ${currentWeek} · ${copiedCount} NV`
        });
      }

      useStore.setState(state => ({
        schedule: {
          ...state.schedule,
          [currentWeek]: destSched
        }
      }));

      toast.success(`✅ Đã sao chép lịch làm việc của ${copiedCount} nhân sự sang tuần này (${curRange})!`);
    } catch (err) {
      console.error('Lỗi sao chép lịch:', err);
      toast.error('Không thể sao chép lịch: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setIsCopying(false);
    }
  };

  // Phase 4: Conflict engine — quét lịch tuần hiện tại của các NV trong phạm vi
  const conflictFindings = useMemo(() => {
    try {
      const weekSched = schedule[currentWeek] || {};
      const ids = new Set(employees.map(e => e.id));
      const scoped = {};
      for (const [id, sh] of Object.entries(weekSched)) {
        if (ids.has(id)) scoped[id] = sh;
      }
      return analyzeWeek(employees, scoped);
    } catch {
      return [];
    }
  }, [employees, schedule, currentWeek]);

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

        let empHours = 0;
        const cells = viewMode === 'month'
          ? cycleDates.map(d => schedule[d.weekKey]?.[emp.id]?.[d.dayKey])
          : activeDays.map(d => (weekSchedule[emp.id] || {})[d]);

        cells.forEach(rawVal => {
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
  }, [groupedEmps, weekSchedule, activeDays, viewMode, cycleDates, schedule]);

  return (
    <div className="space-y-4">
      {/* 1. Modal Components */}
      <Suspense fallback={null}>
        <AddEmployeeModal isOpen={showAddEmp} onClose={() => setShowAddEmp(false)} />
        {React.createElement(AddStoreModal, { isOpen: showAddStore, onClose: () => setShowAddStore(false) })}
        <TransferModal isOpen={showTransfer} onClose={() => setShowTransfer(false)} />
        <PTOvertimeModal isOpen={showPTOvertime} onClose={() => setShowPTOvertime(false)} />
        <ImportScheduleModal
          isOpen={showImportSchedule}
          onClose={() => setShowImportSchedule(false)}
          currentWeek={currentWeek}
        />
        <ShiftSwapListModal
          isOpen={showSwapList}
          onClose={() => setShowSwapList(false)}
          currentWeek={currentWeek}
        />
        <AISchedulerModal
          isOpen={showAIScheduler}
          onClose={() => setShowAIScheduler(false)}
          currentWeek={currentWeek}
          storeId={filterDept}
        />
      </Suspense>
      <AICopilotDrawer
        isOpen={showAICopilot}
        onClose={() => setShowAICopilot(false)}
        currentWeek={currentWeek}
        storeId={filterDept}
      />

      {/* 2. Top Toolbar */}
      <div className="print:hidden">
        <Toolbar 
          search={search} 
          setSearch={setSearch}
          filterDept={filterDept} 
          setFilterDept={setFilterDept}
          filterRole={filterRole} 
          setFilterRole={setFilterRole}
          disableDeptFilter={false}
          onOpenAddEmp={() => setShowAddEmp(true)}
          onOpenAddStore={() => setShowAddStore(true)}
          onOpenTransfer={() => setShowTransfer(true)}
          onOpenPTOvertime={() => setShowPTOvertime(true)}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      </div>

      <div className="print:hidden px-2 pt-2">
        <WeekFlowBar storeId={flowStore} weekDate={currentWeek} />
        <ConflictPanel findings={conflictFindings} />
      </div>

      {/* 3. KPI Summary Bar & Actions */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4 text-xs flex-wrap">
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút AI Xếp Lịch Thông Minh */}
          <button
            type="button"
            onClick={() => setShowAIScheduler(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
            title="Xếp lịch từ định biên hoặc ảnh doanh số"
          >
            <Sparkles size={13} />
            AI xếp lịch
          </button>

          {/* Nút Trợ lý AI Copilot */}
          <button
            type="button"
            onClick={() => setShowAICopilot(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Mở trợ lý AI giải đáp thắc mắc và phân tích tình hình nhân sự"
          >
            <Bot size={13} className="text-purple-600" />
            <span>Trợ lý AI</span>
          </button>

          {/* Nút Đơn Đổi Ca */}
          <button
            type="button"
            onClick={() => setShowSwapList(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Xem và duyệt các yêu cầu đổi ca"
          >
            <span>🔄 Đơn đổi ca</span>
            {pendingManagerSwapsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-black animate-pulse">
                {pendingManagerSwapsCount}
              </span>
            )}
          </button>

          {/* Nút Sao Chép Tuần Trước */}
          <button 
            type="button"
            onClick={handleCopyPreviousWeek}
            disabled={isCopying || weekLocked}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Sao chép toàn bộ ca làm việc từ tuần trước sang tuần này"
          >
            <Copy size={13} />
            <span>{isCopying ? 'Đang sao chép...' : 'Sao chép tuần trước'}</span>
          </button>

          {/* Nút Nhập Excel */}
          <button 
            type="button"
            onClick={() => setShowImportSchedule(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Nhập lịch từ file Excel hoặc CSV"
          >
            <Upload size={13} />
            <span>Nhập Excel</span>
          </button>

          {/* Nút Xuất Excel */}
          <button 
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Xuất file Excel chuẩn"
          >
            <Download size={13} />
            <span>Xuất Excel</span>
          </button>

          {/* Nút In */}
          <button 
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Printer size={13} />
            <span>In / PDF</span>
          </button>
        </div>
      </div>

      {/* 3.5 Staffing Gap Analysis Widget */}
      <StaffingGapTable 
        employees={employees} 
        weekSchedule={weekSchedule} 
        filterDept={filterDept} 
      />

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
                  if (viewMode === 'month') {
                    const cell = cycleDates[idx];
                    dateStr = cell?.display || '';
                    const now = new Date();
                    isToday = cell && cell.dateObj.toDateString() === now.toDateString();
                  } else if (currentWeek) {
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
                        const empSched = viewMode === 'month'
                          ? Object.fromEntries(cycleDates.map(d => [d.key, schedule[d.weekKey]?.[emp.id]?.[d.dayKey] || '']))
                          : (weekSchedule[emp.id] || {});
                        const currentRow = absoluteRowIdx++;
                        return (
                          <EmployeeRow 
                            key={emp.id + (emp.isBorrowedTo ? `_borrowed_${emp.isBorrowedTo}` : '')}
                            emp={emp}
                            empSched={empSched}
                            idx={idx}
                            absoluteRowIdx={currentRow}
                            handleShiftChange={handleShiftChange}
                            isAdmin={canEditGrid}
                            canEdit={canEditGrid}
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