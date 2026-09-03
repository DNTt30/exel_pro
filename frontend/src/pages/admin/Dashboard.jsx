import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { SHIFTS } from '../../data/initialData';
import { getShiftCode } from '../../utils/shiftHelper';
import ManagerActionList from '../../components/ManagerActionList';
import { AlertTriangle, Clock, Building2, Download, Search, FileSpreadsheet, ArrowRight, TrendingUp, Calendar, ChevronLeft, ChevronRight, Eye, X, DatabaseBackup } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardCharts from '../../components/DashboardCharts';
import StaffingGapChart from '../../components/charts/StaffingGapChart';
import KpiCardsGrid from '../../components/dashboard/KpiCardsGrid';
import MonthConfirmWidget from '../../components/dashboard/MonthConfirmWidget';
import { visibleStoresForAdmin } from '../../utils/dataScope';
import StoreBreakdownCards from '../../components/dashboard/StoreBreakdownCards';
import EmployeeDemographicsWidget from '../../components/dashboard/EmployeeDemographicsWidget';
import OperationsInsightsWidget from '../../components/dashboard/OperationsInsightsWidget';
import EmployeeDetailModal from '../../components/dashboard/EmployeeDetailModal';
import { downloadOFCReportXlsx } from '../../utils/exportOFC';
import { toast } from '../../components/ui/toastStore';
import { downloadBackupXlsx } from '../../utils/exportBackup';
import { canPickStore } from '../../lib/authSession';
import { useShallow } from 'zustand/react/shallow';
import { WEEK_DAYS } from '../../data/constants';

// Ô lịch / mảng trống dùng chung — giữ tham chiếu ổn định cho useMemo & React.memo
const EMPTY_SCHED = {};

export default function Dashboard() {
  const { employees, schedule, currentWeek, setCurrentWeek, stores, user, shelves, shelfItems, ensureWeeksLoaded } = useStore(useShallow((s) => ({ employees: s.employees, schedule: s.schedule, currentWeek: s.currentWeek, setCurrentWeek: s.setCurrentWeek, stores: s.stores, user: s.user, shelves: s.shelves, shelfItems: s.shelfItems, ensureWeeksLoaded: s.ensureWeeksLoaded })));
  const pickStore = canPickStore(user);
  const weekSchedule = schedule[currentWeek] || EMPTY_SCHED;
  const availableWeeks = Object.keys(schedule).sort();

  // Chế độ xem: 'month' (Chu kỳ 26-25 / 31 ngày) hoặc 'week' (7 ngày)
  const [viewMode, setViewMode] = useState('month'); 

  // Chọn chu kỳ tháng (YYYY-MM)
  const [selectedMonthCycle, setSelectedMonthCycle] = useState(() => {
    const parts = (currentWeek || '').split('-').map(Number);
    const y = parts[0] || new Date().getFullYear();
    const m = parts[1] || (new Date().getMonth() + 1);
    const d = parts[2] || 1;
    if (d >= 26) {
      let nextM = m + 1;
      let nextY = y;
      if (nextM > 12) { nextM = 1; nextY++; }
      return `${nextY}-${String(nextM).padStart(2, '0')}`;
    }
    return `${y}-${String(m).padStart(2, '0')}`;
  });

  const availableMonths = useMemo(() => {
    const [y, m] = selectedMonthCycle.split('-').map(Number);
    const list = [];
    const now = new Date();
    const currentRealYear = now.getFullYear();
    const currentRealMonth = now.getMonth() + 1;

    // Hiển thị danh sách 13 tháng xoay quanh tháng đang chọn
    for (let i = -6; i <= 6; i++) {
      const d = new Date(y, (m - 1) + i, 1);
      const curY = d.getFullYear();
      const curM = d.getMonth() + 1;
      
      let prevM = curM - 1;
      let prevY = curY;
      if (prevM < 1) { prevM = 12; prevY--; }
      
      const prevMStr = prevM.toString().padStart(2, '0');
      const curMStr = curM.toString().padStart(2, '0');
      const key = `${curY}-${curMStr}`; // Đồng bộ YYYY-MM
      
      const isCurrent = curY === currentRealYear && curM === currentRealMonth;
      let label = `Tháng ${curMStr}/${curY} (26/${prevMStr} → 25/${curMStr})`;
      if (isCurrent) {
        label = `📍 Tháng ${curMStr}/${curY} (26/${prevMStr} → 25/${curMStr}) [Hiện tại]`;
      }
      
      list.push({ key, label, year: curY, month: curM });
    }
    return list;
  }, [selectedMonthCycle]);

  const handlePrevMonth = () => {
    const [y, m] = selectedMonthCycle.split('-').map(Number);
    let newM = m - 1;
    let newY = y;
    if (newM < 1) { newM = 12; newY--; }
    setSelectedMonthCycle(`${newY}-${String(newM).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonthCycle.split('-').map(Number);
    let newM = m + 1;
    let newY = y;
    if (newM > 12) { newM = 1; newY++; }
    setSelectedMonthCycle(`${newY}-${String(newM).padStart(2, '0')}`);
  };

  const handlePrevWeek = () => {
    const parts = currentWeek.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() - 7);
    const wKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setCurrentWeek(wKey);
  };

  const handleNextWeek = () => {
    const parts = currentWeek.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + 7);
    const wKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setCurrentWeek(wKey);
  };

  // Bộ lọc
  const [search, setSearch] = useState('');
  const visibleStores = useMemo(() => visibleStoresForAdmin(user, stores), [user, stores]);
  const [filterDept, setFilterDept] = useState(pickStore ? 'ALL' : (user?.dept || 'ALL'));
  const [filterOnlyOvertime, setFilterOnlyOvertime] = useState(false);

  // Xem chi tiết nhân viên
  const [selectedEmp, setSelectedEmp] = useState(null);

  // 1. Tính toán 31 ngày theo chu kỳ lương 26 tháng trước -> 25 tháng này
  const cycleDates = useMemo(() => {
    const [selY, selM] = selectedMonthCycle.split('-').map(Number);
    
    let prevM = selM - 1;
    let prevY = selY;
    let curM = selM;
    let curY = selY;
    
    if (prevM < 1) { prevM = 12; prevY--; }
    
    const dates = [];
    const daysInPrevMonth = new Date(prevY, prevM, 0).getDate();
    for (let day = 26; day <= daysInPrevMonth; day++) {
      const dateObj = new Date(prevY, prevM - 1, day);
      const dOfWeek = dateObj.getDay();
      const dayKey = WEEK_DAYS[dOfWeek === 0 ? 6 : dOfWeek - 1];

      const monDiff = dateObj.getDate() - dOfWeek + (dOfWeek === 0 ? -6 : 1);
      const monDate = new Date(dateObj);
      monDate.setDate(monDiff);
      const weekKey = `${monDate.getFullYear()}-${String(monDate.getMonth() + 1).padStart(2, '0')}-${String(monDate.getDate()).padStart(2, '0')}`;

      dates.push({
        key: `prev_${day}`,
        display: `${day}/${prevM}/${prevY}`,
        shortDisplay: `${day}/${prevM}`,
        dayNum: `${day}`,
        monthNum: `${prevM}`,
        dayKey,
        weekKey,
        dateObj
      });
    }
    for (let day = 1; day <= 25; day++) {
      const dateObj = new Date(curY, curM - 1, day);
      const dOfWeek = dateObj.getDay();
      const dayKey = WEEK_DAYS[dOfWeek === 0 ? 6 : dOfWeek - 1];

      const monDiff = dateObj.getDate() - dOfWeek + (dOfWeek === 0 ? -6 : 1);
      const monDate = new Date(dateObj);
      monDate.setDate(monDiff);
      const weekKey = `${monDate.getFullYear()}-${String(monDate.getMonth() + 1).padStart(2, '0')}-${String(monDate.getDate()).padStart(2, '0')}`;

      dates.push({
        key: `cur_${day}`,
        display: `${day}/${curM}/${curY}`,
        shortDisplay: `${day}/${curM}`,
        dayNum: `${day}`,
        monthNum: `${curM}`,
        dayKey,
        weekKey,
        dateObj
      });
    }
    return dates;
  }, [selectedMonthCycle]);

  // Tự động tải dữ liệu các tuần thuộc chu kỳ tháng được chọn từ CSDL Supabase
  useEffect(() => {
    if (viewMode === 'month' && cycleDates.length > 0 && ensureWeeksLoaded) {
      const neededWeeks = Array.from(new Set(cycleDates.map(d => d.weekKey)));
      ensureWeeksLoaded(neededWeeks);
    }
  }, [viewMode, cycleDates, ensureWeeksLoaded]);

  // 2. Tính toán 7 ngày trong tuần
  const weekDaysInfo = useMemo(() => {
    const parts = currentWeek.split('-');
    const weekStartDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    
    return WEEK_DAYS.map((day, idx) => {
      const dateObj = new Date(weekStartDate);
      dateObj.setDate(weekStartDate.getDate() + idx);
      const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
      const fullDateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
      return {
        key: day,
        dayLabel: day,
        display: `${day} (${dateStr})`,
        shortDisplay: dateStr,
        fullDisplay: fullDateStr,
        dateObj
      };
    });
  }, [currentWeek]);

  // Format ca: 14-22 -> 14:00-22:00
  const formatShiftForOFC = (s) => {
    const actual = getShiftCode(s);
    if (!actual || actual === 'off') return '';
    const match = actual.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
    if (match) {
      return `${match[1]}:00-${match[2]}:00`;
    }
    return actual;
  };

  // 1. Danh sách nhân viên theo cửa hàng đang chọn (hoặc toàn chuỗi nếu ALL)
  const currentDeptEmployees = useMemo(() => {
    let list = employees;
    // Nếu user không thể pick store toàn quyền (OFC/Admin), họ bị giới hạn bởi visibleStores
    if (!pickStore && visibleStores.length > 0) {
      const allowedDepts = new Set(visibleStores.map(s => s.id));
      list = list.filter(e => allowedDepts.has(e.dept));
    }
    if (filterDept !== 'ALL') {
      list = list.filter(e => e.dept === filterDept);
    }
    return list;
  }, [employees, filterDept, pickStore, visibleStores]);

  // 3. Tính toán toàn bộ nhân viên Part-time (đã lọc theo cửa hàng đang chọn)
  const allPTEmployees = useMemo(() => {
    let ptEmps = currentDeptEmployees.filter(e => e.type === 'PARTTIME' || e.type === 'STPT' || (e.role && e.role.includes('PT')));

    return ptEmps.map(emp => {
      const empWeekSched = weekSchedule[emp.id] || {};
      
      // Giờ theo tháng (31 ngày của chu kỳ 26 -> 25)
      let monthTotalHours = 0;
      const monthShifts = {};

      cycleDates.forEach(({ key, weekKey, dayKey }) => {
        // Tìm ca thực tế trong schedule[weekKey] đã lưu
        const s = schedule[weekKey]?.[emp.id]?.[dayKey];
        const actual = getShiftCode(s);
        if (actual && actual !== 'off') {
          monthShifts[key] = formatShiftForOFC(actual);
          if (SHIFTS[actual]) monthTotalHours += SHIFTS[actual].hours;
          else {
            const match = actual.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
            if (match) {
              let start = parseInt(match[1], 10);
              let end = parseInt(match[2], 10);
              if (end < start) end += 24;
              monthTotalHours += (end - start);
            }
          }
        } else {
          monthShifts[key] = '';
        }
      });

      // Giờ theo tuần (7 ngày)
      let weekTotalHours = 0;
      const weekShifts = {};
      WEEK_DAYS.forEach(day => {
        const s = empWeekSched[day];
        const actual = getShiftCode(s);
        if (actual && actual !== 'off') {
          weekShifts[day] = formatShiftForOFC(actual);
          if (SHIFTS[actual]) weekTotalHours += SHIFTS[actual].hours;
          else {
            const match = actual.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
            if (match) {
              let start = parseInt(match[1], 10);
              let end = parseInt(match[2], 10);
              if (end < start) end += 24;
              weekTotalHours += (end - start);
            }
          }
        } else {
          weekShifts[day] = '';
        }
      });

      const isOver91Month = monthTotalHours > 91;
      const isOverWeekCap = weekTotalHours > 23;
      const isUnderWeekMin = weekTotalHours > 0 && weekTotalHours < 16;

      const isOvertime = viewMode === 'month' ? isOver91Month : isOverWeekCap;
      const activeTotalHours = viewMode === 'month' ? monthTotalHours : weekTotalHours;

      return {
        ...emp,
        monthTotalHours,
        weekTotalHours,
        activeTotalHours,
        monthShifts,
        weekShifts,
        isOver91Month,
        isOverWeekCap,
        isUnderWeekMin,
        isOvertime
      };
    });
  }, [currentDeptEmployees, schedule, weekSchedule, cycleDates, viewMode]);

  // 4. Lọc danh sách theo Search, Cửa hàng và Toggle
  const filteredPTList = useMemo(() => {
    let list = allPTEmployees;
    
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(s) || e.id.toLowerCase().includes(s));
    }

    if (filterOnlyOvertime) {
      list = list.filter(e => e.isOvertime);
    }

    return list;
  }, [allPTEmployees, search, filterOnlyOvertime]);

  // Danh sách vượt hạn mức (đã lọc theo cửa hàng đang chọn)
  const ptOvertimeList = useMemo(() => {
    return allPTEmployees.filter(e => e.isOvertime);
  }, [allPTEmployees]);

  const allowedDepts = useMemo(() => new Set(visibleStores.map(s => s.id)), [visibleStores]);

  // 5. Thống kê theo từng cửa hàng
  const storeStats = useMemo(() => {
    const map = {};
    employees.forEach(emp => {
      if (!pickStore && allowedDepts.size > 0 && !allowedDepts.has(emp.dept)) return;
      if (!map[emp.dept]) {
        map[emp.dept] = { dept: emp.dept, totalEmps: 0, ptEmps: 0, ptOver91: 0, totalHours: 0 };
      }
      map[emp.dept].totalEmps++;
      const isPT = emp.type === 'PARTTIME' || emp.type === 'STPT' || (emp.role && emp.role.includes('PT'));
      if (isPT) map[emp.dept].ptEmps++;
      
      const empSched = weekSchedule[emp.id] || {};
      let empHours = 0;
      
      if (viewMode === 'month') {
        cycleDates.forEach(({ weekKey, dayKey }) => {
          const s = schedule[weekKey]?.[emp.id]?.[dayKey];
          const actual = getShiftCode(s);
          if (actual && actual !== 'off') {
            if (SHIFTS[actual]) empHours += SHIFTS[actual].hours;
            else {
              const match = actual.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
              if (match) {
                let start = parseInt(match[1], 10);
                let end = parseInt(match[2], 10);
                if (end < start) end += 24;
                empHours += (end - start);
              }
            }
          }
        });
      } else {
        WEEK_DAYS.forEach(day => {
          const s = empSched[day];
          const actual = getShiftCode(s);
          if (actual && actual !== 'off') {
            if (SHIFTS[actual]) empHours += SHIFTS[actual].hours;
            else {
              const match = actual.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
              if (match) {
                let start = parseInt(match[1], 10);
                let end = parseInt(match[2], 10);
                if (end < start) end += 24;
                empHours += (end - start);
              }
            }
          }
        });
      }

      map[emp.dept].totalHours += empHours;
      if (isPT && (viewMode === 'month' ? empHours > 91 : empHours > 23)) {
        map[emp.dept].ptOver91++;
      }
    });

    return Object.values(map);
  }, [employees, schedule, weekSchedule, cycleDates, viewMode, pickStore, allowedDepts]);

  // Tổng giờ toàn chuỗi (Tất cả cửa hàng)
  const totalSystemHours = useMemo(() => {
    return storeStats.reduce((sum, s) => sum + s.totalHours, 0);
  }, [storeStats]);

  // Tổng giờ theo cửa hàng đang chọn (hoặc toàn chuỗi nếu ALL)
  const currentDeptTotalHours = useMemo(() => {
    if (filterDept === 'ALL') return totalSystemHours;
    const found = storeStats.find(s => s.dept === filterDept);
    return found ? found.totalHours : 0;
  }, [storeStats, filterDept, totalSystemHours]);

  // 6. Tính toán Kệ & Date và Nhân sự hôm nay
  const quickStats = useMemo(() => {
    const today = new Date();
    const dOfWeek = today.getDay();
    const dayKey = WEEK_DAYS[dOfWeek === 0 ? 6 : dOfWeek - 1];
    
    let empsWorkingToday = 0;
    employees.forEach(emp => {
      if (!pickStore && allowedDepts.size > 0 && !allowedDepts.has(emp.dept)) return;
      if (filterDept !== 'ALL' && emp.dept !== filterDept) return;
      
      const s = weekSchedule[emp.id]?.[dayKey];
      const actual = getShiftCode(s);
      if (actual && actual !== 'off') empsWorkingToday++;
    });

    let storeShelves = (shelves || []);
    if (!pickStore && allowedDepts.size > 0) {
      storeShelves = storeShelves.filter(s => allowedDepts.has(s.storeId));
    }
    if (filterDept !== 'ALL') storeShelves = storeShelves.filter(s => s.storeId === filterDept);
    
    let pendingShelves = 0;
    let warningShelves = 0;
    
    storeShelves.forEach(s => {
      const items = (shelfItems || []).filter(i => i.shelfId === s.id);
      if (items.length === 0) {
        pendingShelves++;
      } else {
        let hasWarn = false;
        items.forEach(item => {
          const d1 = item.expiryDate ? new Date(item.expiryDate) : null;
          const d2 = item.expiryDate2 ? new Date(item.expiryDate2) : null;
          const earliest = [d1, d2].filter(Boolean).sort((a, b) => a - b)[0];
          if (earliest) {
            const diff = Math.ceil((earliest - today) / 86400000);
            if (diff <= (s.notifyDays || 3)) hasWarn = true;
          }
        });
        if (hasWarn) warningShelves++;
      }
    });

    return { empsWorkingToday, pendingShelves, warningShelves, totalShelves: storeShelves.length };
  }, [employees, shelves, shelfItems, weekSchedule, pickStore, allowedDepts, filterDept]);

  // 7. Thống kê tỷ lệ tuân thủ định mức Part-time
  const complianceStats = useMemo(() => {
    let optimal = 0;
    let under = 0;
    let overtime = 0;

    allPTEmployees.forEach(emp => {
      const hrs = emp.activeTotalHours;
      if (viewMode === 'month') {
        if (hrs > 91) overtime++;
        else if (hrs >= 50) optimal++;
        else under++;
      } else {
        if (hrs > 23) overtime++;
        else if (hrs >= 16) optimal++;
        else under++;
      }
    });

    const total = allPTEmployees.length || 1;
    const complianceRate = Math.round(((total - overtime) / total) * 100);

    return {
      optimal,
      under,
      overtime,
      total: allPTEmployees.length,
      complianceRate
    };
  }, [allPTEmployees, viewMode]);

  // Tab điều khiển biểu đồ liên thông từ KPI cards
  const [activeChartTab, setActiveChartTab] = useState('workload');

  const scrollToChart = (tabName) => {
    if (tabName) setActiveChartTab(tabName);
    const el = document.getElementById('analytics-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // 6a. Sao lưu toàn bộ dữ liệu ra .xlsx (SM/OFC)
  const handleBackupXlsx = async () => {
    try {
      toast.info('Đang tổng hợp dữ liệu sao lưu...');
      const fileName = await downloadBackupXlsx(useStore.getState());
      useStore.getState().appendAdminLog('DATA_BACKUP', fileName, 'admin', {
        category: 'security',
        entityType: 'backup',
        entityId: fileName,
        description: 'Sao lưu dữ liệu ra Excel: ' + fileName
      });
      toast.success('Đã tải ' + fileName);
    } catch (e) {
      console.error('Lỗi sao lưu:', e);
      toast.error('Lỗi sao lưu: ' + e.message);
    }
  };

  // 6. Xuất báo cáo PT — file Excel chuẩn (.xlsx), mở trực tiếp không lỗi font/cột
  const handleExportOFC_CSV = (listToExport, fileNameSuffix = 'BaoCao') => {
    const isMonth = viewMode === 'month';
    downloadOFCReportXlsx({
      list: listToExport.map(emp => ({ ...emp, shiftsMap: isMonth ? emp.monthShifts : emp.weekShifts })),
      dayKeys: isMonth ? cycleDates.map(d => d.key) : WEEK_DAYS,
      dateLabels: isMonth ? cycleDates.map(d => d.display) : weekDaysInfo.map(d => d.fullDisplay)
    }, `OFC_BaoCao_PartTime_${isMonth ? `Thang_${selectedMonthCycle}` : `Tuan_${currentWeek}`}_${fileNameSuffix}.xlsx`);
  };

  const depts = visibleStores.map(s => s.id).sort();

  return (
    <div className="w-full min-h-full bg-slate-100/90 p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200">
      <ManagerActionList storeId={filterDept} />
      
      {/* Modern Full-width Header & Command Bar */}
      <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/20 flex-shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Dashboard GS25 — Tổng Quan Quản Trị
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[11px] font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Hệ Thống Trực Tuyến
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Theo dõi định mức giờ công Part-time (chu kỳ 26→25), nhân sự trực ca & cảnh báo hàng cận date
            </p>
          </div>
        </div>

        {/* Command Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Store Quick Selector */}
          {pickStore && (
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <Building2 size={14} className="text-blue-600 mr-1.5 flex-shrink-0" />
              <select
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer pr-1"
              >
                <option value="ALL">Toàn Bộ Cửa Hàng</option>
                {depts.map(d => (
                  <option key={d} value={d}>🏬 Cửa Hàng {d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Unified Mode + Date Navigator */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'month' 
                    ? 'bg-white shadow-xs text-blue-700 font-extrabold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar size={13} />
                <span>Tháng (26-25)</span>
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'week' 
                    ? 'bg-white shadow-xs text-blue-700 font-extrabold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock size={13} />
                <span>Tuần (T2-CN)</span>
              </button>
            </div>

            <div className="w-[1px] h-5 bg-slate-300 mx-1.5 shrink-0"></div>

            <div className="flex items-center">
              <button 
                onClick={viewMode === 'month' ? handlePrevMonth : handlePrevWeek}
                className="p-1 hover:bg-slate-200/80 rounded-md text-slate-600 transition-colors cursor-pointer"
                title={viewMode === 'month' ? 'Tháng trước' : 'Tuần trước'}
              >
                <ChevronLeft size={16} />
              </button>

              {viewMode === 'month' ? (
                <select 
                  value={selectedMonthCycle}
                  onChange={e => setSelectedMonthCycle(e.target.value)}
                  className="border-none bg-transparent text-blue-700 font-bold text-xs outline-none px-2 cursor-pointer max-w-[210px] sm:max-w-none"
                >
                  {availableMonths.map(m => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              ) : (
                <select 
                  value={currentWeek}
                  onChange={e => setCurrentWeek(e.target.value)}
                  className="border-none bg-transparent text-blue-700 font-bold text-xs outline-none px-2 cursor-pointer"
                >
                  {availableWeeks.map(w => {
                    const parts = w.split('-');
                    return <option key={w} value={w}>Tuần: {parts[2]}/{parts[1]}/{parts[0]}</option>;
                  })}
                </select>
              )}

              <button 
                onClick={viewMode === 'month' ? handleNextMonth : handleNextWeek}
                className="p-1 hover:bg-slate-200/80 rounded-md text-slate-600 transition-colors cursor-pointer"
                title={viewMode === 'month' ? 'Tháng sau' : 'Tuần sau'}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Full-data Backup (.xlsx) — SM/OFC sao lưu toàn bộ dữ liệu đã tải */}
          <button
            onClick={handleBackupXlsx}
            className="btn bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs py-2 px-3.5 rounded-xl font-bold shadow-sm shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            title="Tải toàn bộ dữ liệu (nhân viên, lịch mọi tuần đã tải, feedback, đổi ca, kệ) ra file Excel"
          >
            <DatabaseBackup size={14} /> Sao lưu .xlsx
          </button>

          {/* Export Button */}
          <button
            onClick={() => handleExportOFC_CSV(ptOvertimeList, 'DS_Vuot_DinhMuc')}
            disabled={ptOvertimeList.length === 0}
            className="btn bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs py-2 px-3.5 rounded-xl font-bold shadow-sm shadow-rose-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all shrink-0"
            title={`Xuất file mẫu cho các nhân sự Part-time vượt ${viewMode === 'month' ? '91h/tháng' : '23h/tuần'}`}
          >
            <Download size={14} /> Xuất Báo Cáo ({ptOvertimeList.length} NV)
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - Responsive 6 Columns with Chart Drill-downs */}
      <KpiCardsGrid
        ptOvertimeList={ptOvertimeList}
        allPTEmployees={allPTEmployees}
        viewMode={viewMode}
        quickStats={quickStats}
        complianceStats={complianceStats}
        currentDeptEmployees={currentDeptEmployees}
        currentDeptTotalHours={currentDeptTotalHours}
        selectedMonthCycle={selectedMonthCycle}
        currentWeek={currentWeek}
        filterDept={filterDept}
        stores={visibleStores}
        scrollToChart={scrollToChart}
      />

      <MonthConfirmWidget />

      {/* Visual Analytics & Forecast Charts - Có ID để cuộn mượt */}
      <div id="analytics-section">
        <DashboardCharts
          viewMode={viewMode}
          selectedMonthCycle={selectedMonthCycle}
          currentWeek={currentWeek}
          cycleDates={cycleDates}
          weekDaysInfo={weekDaysInfo}
          employees={currentDeptEmployees}
          allPTEmployees={allPTEmployees}
          ptOvertimeList={ptOvertimeList}
          storeStats={filterDept === 'ALL' ? storeStats : storeStats.filter(s => s.dept === filterDept)}
          schedule={schedule}
          totalSystemHours={currentDeptTotalHours}
          activeTab={activeChartTab}
          setActiveTab={setActiveChartTab}
        />
        {/* Định biên vs Thực tế theo Ngày × Ca (tuần hiện tại) */}
        <div className="mt-4">
          <StaffingGapChart
            employees={currentDeptEmployees}
            weekSchedule={weekSchedule}
            stores={visibleStores}
            scopeStoreId={filterDept}
            currentWeek={currentWeek}
          />
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        
        {/* Table Header Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <h2 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Danh Sách Theo Dõi Giờ Làm Part-Time ({viewMode === 'month' ? `Theo Tháng ${selectedMonthCycle.split('-')[1]}/${selectedMonthCycle.split('-')[0]}` : 'Theo Tuần'})
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {viewMode === 'month' 
                ? 'Tự động kiểm tra và gắn cờ đỏ khi nhân sự Part-time vượt quá 91 giờ trong chu kỳ tháng'
                : 'Xem chi tiết 7 ngày trong tuần, cảnh báo khi vượt 23h/tuần hoặc thiếu 16h/tuần'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
              <input
                type="text"
                placeholder="Tìm nhân viên / Mã NV..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-44 sm:w-56 shadow-2xs"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Store Filter */}
            {pickStore && (
              <select
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
              >
                <option value="ALL">Tất cả cửa hàng</option>
                {depts.map(d => (
                  <option key={d} value={d}>🏬 {d}</option>
                ))}
              </select>
            )}

            {/* Toggle Only Overtime */}
            <button
              onClick={() => setFilterOnlyOvertime(!filterOnlyOvertime)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                filterOnlyOvertime 
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs' 
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <AlertTriangle size={13} className={filterOnlyOvertime ? 'text-white' : 'text-rose-600'} />
              <span>Chỉ hiện PT vượt ({ptOvertimeList.length})</span>
            </button>
          </div>
        </div>

        {/* Scrollable Spreadsheet Table */}
        <div className="overflow-x-auto max-h-[520px] border border-slate-200 rounded-xl bg-white shadow-2xs">
          <table className="excel-table whitespace-nowrap text-xs min-w-full">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-300 font-bold text-slate-700">
                <th className="p-2 border-r border-slate-300 w-12 min-w-[48px] text-center sticky left-0 z-20 bg-slate-200">STT</th>
                <th className="p-2 border-r border-slate-300 w-20 min-w-[80px] text-center sticky z-20 bg-slate-200" style={{ left: '48px' }}>Cửa Hàng</th>
                <th className="p-2 border-r border-slate-300 w-24 min-w-[96px] text-center sticky z-20 bg-slate-200" style={{ left: '128px' }}>Mã NV</th>
                <th className="p-2 border-r border-slate-300 w-20 min-w-[80px] text-center">Vị Trí</th>
                <th className="p-2 border-r border-slate-300 min-w-[160px] text-left sticky z-20 bg-slate-200 px-3 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ left: '224px' }}>
                  Họ và Tên
                </th>
                
                {/* Dynamic Columns: 31 Ngày (Tháng) hoặc 7 Ngày (Tuần) */}
                {viewMode === 'month' ? (
                  cycleDates.map(d => (
                    <th key={d.key} className="p-1 border-r border-slate-300 text-center min-w-[56px] w-[56px] max-w-[56px]">
                      <span className="text-[11px] font-bold text-slate-800 block">{d.shortDisplay}</span>
                      <span className={`text-[9px] font-bold block ${d.dayKey === 'CN' ? 'text-orange-600' : 'text-slate-500'}`}>{d.dayKey}</span>
                    </th>
                  ))
                ) : (
                  weekDaysInfo.map(d => (
                    <th key={d.key} className="p-2 border-r border-slate-300 text-center min-w-[85px]">
                      <span className="font-extrabold text-blue-800 text-xs block">{d.dayLabel}</span>
                      <span className="block text-[10px] font-normal text-slate-500">{d.shortDisplay}</span>
                    </th>
                  ))
                )}

                <th className="p-2 text-center bg-slate-300 text-slate-800 font-extrabold sticky z-20 min-w-[90px] w-[90px] border-l border-slate-400" style={{ right: '56px' }}>
                  Tổng {viewMode === 'month' ? 'Tháng' : 'Tuần'}
                </th>
                <th className="p-2 text-center bg-slate-300 text-slate-800 font-bold sticky right-0 z-20 w-14 min-w-[56px] border-l border-slate-400">
                  Chi tiết
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPTList.length === 0 ? (
                <tr>
                  <td colSpan={8 + (viewMode === 'month' ? cycleDates.length : weekDaysInfo.length)} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <span className="text-2xl">📋</span>
                      <span className="font-bold text-slate-600 text-xs">
                        {filterOnlyOvertime 
                          ? `Không có nhân viên Part-time nào vượt quá hạn mức ${viewMode === 'month' ? '91h/tháng' : '23h/tuần'}.` 
                          : 'Không tìm thấy dữ liệu nhân viên Part-time phù hợp.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPTList.map((emp, idx) => {
                  const shiftsMap = viewMode === 'month' ? emp.monthShifts : emp.weekShifts;
                  const keys = viewMode === 'month' ? cycleDates.map(d => d.key) : WEEK_DAYS;

                  return (
                    <tr key={emp.id} className={`transition-colors ${emp.isOvertime ? 'bg-red-50/50 hover:bg-red-100/50' : 'hover:bg-slate-50'}`}>
                      <td className="p-2 text-center font-mono text-slate-400 sticky left-0 z-10 bg-white border-r border-slate-300 w-12 min-w-[48px]">{idx + 1}</td>
                      <td className="p-2 text-center font-bold text-blue-700 sticky z-10 bg-white border-r border-slate-300 w-20 min-w-[80px]" style={{ left: '48px' }}>{emp.dept}</td>
                      <td className="p-2 text-center font-mono font-semibold text-slate-700 sticky z-10 bg-white border-r border-slate-300 w-24 min-w-[96px]" style={{ left: '128px' }}>{emp.id}</td>
                      <td className="p-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-20 min-w-[80px]">
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                          {emp.role || 'CSR PT'}
                        </span>
                      </td>
                      <td className="p-2 font-bold text-slate-800 sticky z-10 bg-white border-r border-slate-300 px-3 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] min-w-[160px] truncate" style={{ left: '224px' }}>
                        {emp.name}
                      </td>

                      {/* Các Ngày Ca Làm Việc */}
                      {keys.map(k => {
                        const shiftVal = shiftsMap[k];
                        return (
                          <td key={k} className="p-1 text-center font-mono font-bold text-[10px] border-r border-slate-200 text-slate-700">
                            {shiftVal ? (
                              <span className="px-1 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 block text-[10px]">
                                {shiftVal}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-normal">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Tổng giờ làm */}
                      <td className={`p-2 text-center font-black border-l sticky z-10 text-xs min-w-[90px] w-[90px] border-r border-slate-300 ${
                        emp.isOvertime 
                          ? 'text-red-700 bg-red-100 border-red-200 font-black' 
                          : 'text-slate-800 bg-slate-50 border-slate-200'
                      }`} style={{ right: '56px' }}>
                        <span className="flex items-center justify-center gap-1">
                          {emp.isOvertime && <span>⚠️</span>}
                          <span>{emp.activeTotalHours}h</span>
                        </span>
                      </td>

                      {/* Nút Xem Chi Tiết */}
                      <td className="p-1.5 text-center sticky right-0 z-10 bg-white border-l border-slate-300 w-14 min-w-[56px]">
                        <button
                          onClick={() => setSelectedEmp(emp)}
                          className="p-1 hover:bg-blue-50 text-blue-600 hover:text-blue-800 rounded transition-colors"
                          title="Xem chi tiết phân bổ ca làm việc"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Actions */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 text-xs text-slate-600">
          <span>
            Đang hiển thị <strong>{filteredPTList.length}</strong> / {allPTEmployees.length} nhân sự Part-time ({viewMode === 'month' ? 'Chu kỳ 31 ngày' : 'Tuần 7 ngày'})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportOFC_CSV(filteredPTList, 'DS_Dang_Loc')}
              className="btn btn-outline text-xs py-1 px-3 rounded-lg font-semibold flex items-center gap-1 hover:text-blue-700"
            >
              <FileSpreadsheet size={14} /> Xuất DS đang lọc
            </button>
            <Link
              to="/admin/schedule"
              className="btn btn-primary text-xs py-1 px-3 rounded-lg font-bold flex items-center gap-1"
            >
              <span>Đến Bảng Xếp Lịch</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Phân tích nhân sự & cửa hàng */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="lg:col-span-1">
          <EmployeeDemographicsWidget 
            employees={employees} 
            filterDept={filterDept} 
          />
        </div>
        <div className="lg:col-span-3">
          <StoreBreakdownCards
            storeStats={storeStats}
            totalSystemHours={totalSystemHours}
            filterDept={filterDept}
            setFilterDept={setFilterDept}
            viewMode={viewMode}
            selectedMonthCycle={selectedMonthCycle}
          />
        </div>
      </div>

      {/* Phân tích Vắng mặt / Phép & Chi viện */}
      <OperationsInsightsWidget 
        employees={employees} 
        weekSchedule={weekSchedule} 
        filterDept={filterDept} 
      />

      {/* Employee Detail Drill-down Modal */}
      {selectedEmp && (
        <EmployeeDetailModal
          emp={selectedEmp}
          onClose={() => setSelectedEmp(null)}
          viewMode={viewMode}
          selectedMonthCycle={selectedMonthCycle}
          cycleDates={cycleDates}
          currentWeek={currentWeek}
        />
      )}

    </div>
  );
}