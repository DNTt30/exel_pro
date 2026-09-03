import React, { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useGroupedEmployees } from '../../hooks/useGroupedEmployees';

import { WEEK_DAYS, getPayrollCycleDates, getPayrollCycleFromWeek } from '../../data/constants';
import { Download, Printer, Copy, Upload, Sparkles, Bot, Users, Clock, UserPlus, ArrowRightLeft, RefreshCw, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import Toolbar from '../../components/Toolbar';
import { exportScheduleToExcel } from '../../utils/excelExport';
import { exportScheduleToPDF } from '../../utils/pdfExport';
import { normalizeShift, getShiftHours } from '../../utils/shiftHelper';
import { isOpsManager, canPickStore } from '../../lib/authSession';
import { visibleDeptIds } from '../../utils/dataScope';
import WeekFlowBar from '../../components/WeekFlowBar';
import { weekRecordKey, isWeekLocked } from '../../utils/scheduleWeek';
import { analyzeWeek } from '../../utils/scheduleConflicts';
import ConflictPanel from '../../components/schedule/ConflictPanel';
import { analyzeScheduleVulnerabilities } from '../../utils/vulnerabilityRadarHelper';

const AddEmployeeModal = React.lazy(() => import('../../components/modals/AddEmployeeModal'));
import AddStoreModal from '../../components/modals/AddStoreModal';
const TransferModal = React.lazy(() => import('../../components/modals/TransferModal'));
const PTOvertimeModal = React.lazy(() => import('../../components/modals/PTOvertimeModal'));
const ImportScheduleModal = React.lazy(() => import('../../components/modals/ImportScheduleModal'));
const ShiftSwapListModal = React.lazy(() => import('../../components/modals/ShiftSwapListModal'));
const AISchedulerModal = React.lazy(() => import('../../components/modals/AISchedulerModal'));
const VulnerabilityRadarModal = React.lazy(() => import('../../components/modals/VulnerabilityRadarModal'));
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
  const [showRadarModal, setShowRadarModal] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Tính toán lỗ hổng ca trực & định biên thời gian thực (Vulnerability Radar)
  const currentStoreInfo = useMemo(() => {
    if (!filterDept || filterDept === 'ALL') {
      return stores.find(s => s.id === user?.dept) || stores[0] || {};
    }
    return stores.find(s => s.id === filterDept) || {};
  }, [stores, filterDept, user?.dept]);

  const radarResults = useMemo(() => {
    return analyzeScheduleVulnerabilities({
      weekSchedule,
      employees,
      storeInfo: currentStoreInfo,
      weekDate: currentWeek
    });
  }, [weekSchedule, employees, currentStoreInfo, currentWeek]);

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
  const allVisibleEmployees = useMemo(() => Object.values(groupedEmps).flat(), [groupedEmps]);

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
      userName: user?.name
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
        <VulnerabilityRadarModal
          isOpen={showRadarModal}
          onClose={() => setShowRadarModal(false)}
          radarResults={radarResults}
          storeName={currentStoreInfo?.name || filterDept}
          currentWeek={currentWeek}
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
      {/* 3. KPI Summary Bar & Segmented Action Center */}
      <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:hidden">
        
        {/* Left Metric Badges */}
        <div className="flex items-center gap-2.5 text-xs flex-wrap">
          {/* Total Staff Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <Users size={15} className="text-blue-600" />
            <span className="text-slate-600 font-medium">Nhân sự:</span>
            <span className="font-mono font-bold text-slate-900">{summaryMetrics.totalEmps}</span>
            <span className="text-[11px] text-slate-400 font-semibold">({summaryMetrics.totalFT} FT • {summaryMetrics.totalPT} PT)</span>
          </div>

          {/* Total Hours Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-emerald-900">
            <Clock size={15} className="text-emerald-600" />
            <span className="font-medium">Tổng giờ:</span>
            <span className="font-mono font-black text-emerald-700 text-sm">{summaryMetrics.totalHours}h</span>
          </div>

          {/* PT Overtime Alert Pill */}
          {summaryMetrics.ptOver91Count > 0 && (
            <div 
              onClick={() => setShowPTOvertime(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold cursor-pointer hover:bg-rose-100 hover:border-rose-300 transition-all shadow-2xs group"
              title="Click để xem chi tiết danh sách Part-time vượt ngưỡng"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span>{summaryMetrics.ptOver91Count} Part-Time vượt {viewMode === 'month' ? '91h/tháng' : '23h/tuần'}</span>
              <span className="text-[10px] text-rose-500 underline ml-1 group-hover:text-rose-700">Chi tiết ↗</span>
            </div>
          )}

          {/* Radar Ca Trực & An Ninh Pill */}
          <div 
            onClick={() => setShowRadarModal(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all shadow-2xs group border ${
              radarResults.hasCritical
                ? 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100 hover:border-rose-300'
                : radarResults.warningCount > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300'
                  : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-800 hover:bg-emerald-100'
            }`}
            title="Bấm để xem chi tiết Radar cảnh báo rủi ro ca trực & an ninh"
          >
            <span className={`w-2 h-2 rounded-full ${
              radarResults.hasCritical ? 'bg-rose-500 animate-pulse' : radarResults.warningCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}></span>
            <span>
              {radarResults.hasCritical 
                ? `🚨 ${radarResults.criticalCount} Lỗ hổng ca đêm nghiêm trọng` 
                : radarResults.warningCount > 0 
                  ? `⚠️ ${radarResults.warningCount} Ca cần lưu ý`
                  : '🛡️ Ca trực an toàn (0 rủi ro)'}
            </span>
            <span className="text-[10px] opacity-70 underline ml-0.5 group-hover:opacity-100">Chi tiết ↗</span>
          </div>
        </div>

        {/* Right Segmented Actions Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Group 1: Staff & Transfer */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 shadow-2xs">
            <button
              type="button"
              onClick={() => setShowAddEmp(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Thêm nhân viên mới"
            >
              <UserPlus size={13} className="text-blue-600" />
              <span>Thêm NV</span>
            </button>
            <button
              type="button"
              onClick={() => setShowTransfer(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-700 border border-slate-200/80 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Điều chuyển / Mượn nhân sự giữa các cửa hàng"
            >
              <ArrowRightLeft size={13} className="text-orange-600" />
              <span>Chi viện</span>
            </button>
          </div>

          {/* Group 2: AI & Swaps & Radar */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 shadow-2xs">
            <button
              type="button"
              onClick={() => setShowRadarModal(true)}
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer border ${
                radarResults.hasCritical 
                  ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100' 
                  : radarResults.warningCount > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                    : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
              }`}
              title="Mở Radar quét lỗ hổng ca trực & định biên an ninh 24/7"
            >
              {radarResults.hasCritical ? (
                <ShieldAlert size={13} className="text-rose-600 animate-pulse" />
              ) : radarResults.warningCount > 0 ? (
                <AlertTriangle size={13} className="text-amber-600" />
              ) : (
                <ShieldCheck size={13} className="text-emerald-600" />
              )}
              <span>Radar {radarResults.totalCount > 0 ? `(${radarResults.totalCount})` : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAIScheduler(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Tự động xếp lịch thông minh từ định biên hoặc ảnh chụp doanh số"
            >
              <Sparkles size={13} className="text-amber-300" />
              <span>AI xếp ca</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAICopilot(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-purple-700 hover:bg-purple-50 border border-purple-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Mở trợ lý AI giải đáp thắc mắc và phân tích tình hình nhân sự"
            >
              <Bot size={13} className="text-purple-600" />
              <span>Trợ lý AI</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSwapList(true)}
              className="relative flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Xem và duyệt các yêu cầu đổi ca"
            >
              <RefreshCw size={13} className="text-indigo-600" />
              <span>Đổi ca</span>
              {pendingManagerSwapsCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-black animate-pulse">
                  {pendingManagerSwapsCount}
                </span>
              )}
            </button>
            <button 
              type="button"
              onClick={handleCopyPreviousWeek}
              disabled={isCopying || weekLocked}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Sao chép toàn bộ ca làm việc từ tuần trước sang tuần này"
            >
              <Copy size={13} className="text-slate-500" />
              <span>{isCopying ? 'Đang chép...' : 'Chép tuần trước'}</span>
            </button>
          </div>

          {/* Group 3: Data IO & Export */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 shadow-2xs">
            <button 
              type="button"
              onClick={() => setShowImportSchedule(true)}
              className="p-1.5 bg-white text-amber-800 hover:bg-amber-50 border border-slate-200/80 rounded-lg transition-all shadow-2xs cursor-pointer"
              title="Nhập lịch từ file Excel"
            >
              <Upload size={14} className="text-amber-600" />
            </button>
            <button 
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Xuất file Excel chuẩn"
            >
              <Download size={13} />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={() => exportScheduleToPDF(currentWeek, allVisibleEmployees, schedule[currentWeek] || {}, filterDept)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Xuất file PDF để in"
            >
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 rounded-lg transition-all shadow-2xs cursor-pointer"
              title="In bảng lịch (Print)"
            >
              <Printer size={14} className="text-slate-600" />
            </button>
          </div>

        </div>
      </div>

      {/* 3.5 Staffing Gap Analysis Widget */}
      <StaffingGapTable 
        employees={employees} 
        weekSchedule={weekSchedule} 
        filterDept={filterDept} 
      />

      <div className="bg-blue-50/60 p-3 sm:px-5 sm:py-3 border-y border-blue-100 flex flex-col gap-1 text-[11px] text-blue-900 print:hidden">
        <div className="font-bold flex items-center gap-1.5"><Sparkles size={14} className="text-blue-600" /> QUY TẮC & TRẠNG THÁI XẾP LỊCH:</div>
        <ul className="list-disc list-inside space-y-1 ml-1 opacity-90 text-[10.5px]">
          <li><strong>Ô lịch nền trắng (không màu):</strong> Ca đăng ký / Lịch nháp. Đang chờ Quản lý duyệt.</li>
          <li><strong>Ô lịch có màu nền theo ca:</strong> Lịch đã được Quản lý CHỐT & BAN HÀNH chính thức.</li>
          <li><strong>Ưu tiên AI tự động xếp:</strong> Giữ nguyên lịch đăng ký (Lịch rảnh) ➔ Ưu tiên Full-time đạt chuẩn 48h ➔ Part-time lấp ca thiếu. Không ép Part-time dư giờ nếu cửa hàng không cần.</li>
        </ul>
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
                  let cell = null;
                  if (viewMode === 'month') {
                    cell = cycleDates[idx];
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

                  const dayLabel = viewMode === 'month' ? (cell?.dayKey || day) : day;
                  const isSunday = dayLabel === 'CN';

                  return (
                    <th 
                      key={day} 
                      className={`min-w-[70px] max-w-[80px] text-center font-bold border-r border-slate-300 py-1 px-0.5 transition-colors ${
                        isToday 
                          ? 'bg-blue-200/90 text-blue-950 font-black ring-1 ring-blue-500' 
                          : (isSunday ? 'bg-orange-50/80 text-orange-950' : 'bg-slate-200 text-slate-700')
                      }`}
                      title={`${dayLabel} ngày ${dateStr}`}
                    >
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span className={`text-xs font-black ${isSunday ? 'text-rose-600' : ''}`}>
                          {dayLabel}
                        </span>
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
                        
                        // Nếu là view tháng thì ta kiểm tra status của tuần đầu tiên chứa ngày đang render hoặc cứ mặc định nếu không rõ.
                        // Để đơn giản, nếu view tuần thì lấy currentWeekStatus, view tháng thì check mỗi tuần
                        let isDraftRow = false;
                        if (viewMode === 'week') {
                          const wKey = weekRecordKey(flowStore === 'ALL' ? '' : flowStore, currentWeek);
                          const currentWeekStatus = (scheduleWeeks || {})[wKey]?.status || 'draft';
                          isDraftRow = currentWeekStatus !== 'approved';
                        }
                        
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
                            isDraft={isDraftRow}
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