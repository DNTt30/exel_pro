import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { SHIFTS } from '../../data/initialData';
import { getShiftCode } from '../../utils/shiftHelper';
import ManagerActionList from '../../components/ManagerActionList';
import { 
  AlertTriangle, 
  Users, 
  Clock, 
  Building2, 
  Download, 
  Search, 
  CheckCircle2, 
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Info,
  Layers,
  MessageSquare,
  Package,
  PieChart,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardCharts from '../../components/DashboardCharts';
import { canPickStore } from '../../lib/authSession';

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function Dashboard() {
  const { employees, schedule, currentWeek, setCurrentWeek, stores, user, shelves, shelfItems } = useStore();
  const pickStore = canPickStore(user);
  const weekSchedule = schedule[currentWeek] || {};
  const availableWeeks = Object.keys(schedule).sort();

  // Chế độ xem: 'month' (Chu kỳ 26-25 / 31 ngày) hoặc 'week' (7 ngày)
  const [viewMode, setViewMode] = useState('month'); 

  // Chọn chu kỳ tháng (YYYY-M)
  const [selectedMonthCycle, setSelectedMonthCycle] = useState(() => {
    const parts = currentWeek.split('-');
    return `${parts[0]}-${parts[1]}`;
  });

  const availableMonths = useMemo(() => {
    const [y, m] = selectedMonthCycle.split('-').map(Number);
    const list = [];
    // Hiển thị danh sách 13 tháng xoay quanh tháng đang chọn
    for (let i = -6; i <= 6; i++) {
      const d = new Date(y, (m - 1) + i, 1);
      const curY = d.getFullYear();
      const curM = d.getMonth() + 1;
      
      let prevM = curM - 1;
      let prevY = curY;
      if (prevM < 1) { prevM = 12; prevY--; }
      
      const key = `${curY}-${curM}`;
      const prevMStr = prevM.toString().padStart(2, '0');
      const curMStr = curM.toString().padStart(2, '0');
      
      const isCurrent = curY === 2026 && curM === 8;
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
    setSelectedMonthCycle(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonthCycle.split('-').map(Number);
    let newM = m + 1;
    let newY = y;
    if (newM > 12) { newM = 1; newY++; }
    setSelectedMonthCycle(`${newY}-${newM}`);
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

  // 3. Tính toán toàn bộ nhân viên Part-time
  const allPTEmployees = useMemo(() => {
    let ptEmps = employees.filter(e => e.type === 'PARTTIME' || e.type === 'STPT' || (e.role && e.role.includes('PT')));
    
    if (!pickStore && user?.dept) {
      ptEmps = ptEmps.filter(e => e.dept === user.dept);
    }

    return ptEmps.map(emp => {
      const empWeekSched = weekSchedule[emp.id] || {};
      
      // Giờ theo tháng (31 ngày của chu kỳ 26 -> 25)
      let monthTotalHours = 0;
      const monthShifts = {};

      cycleDates.forEach(({ key, weekKey, dayKey }) => {
        // Tìm ca trong schedule[weekKey] hoặc fallback từ empWeekSched[dayKey]
        const s = schedule[weekKey]?.[emp.id]?.[dayKey] || empWeekSched[dayKey];
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
  }, [employees, schedule, weekSchedule, cycleDates, viewMode, pickStore, user?.dept]);

  // 4. Lọc danh sách theo Search, Cửa hàng và Toggle
  const filteredPTList = useMemo(() => {
    let list = allPTEmployees;
    
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(s) || e.id.toLowerCase().includes(s));
    }

    if (filterDept !== 'ALL') {
      list = list.filter(e => e.dept === filterDept);
    }

    if (filterOnlyOvertime) {
      list = list.filter(e => e.isOvertime);
    }

    return list;
  }, [allPTEmployees, search, filterDept, filterOnlyOvertime]);

  // Danh sách vượt hạn mức
  const ptOvertimeList = useMemo(() => {
    return allPTEmployees.filter(e => e.isOvertime);
  }, [allPTEmployees]);

  // 5. Thống kê theo từng cửa hàng
  const storeStats = useMemo(() => {
    const map = {};
    employees.forEach(emp => {
      if (!map[emp.dept]) {
        map[emp.dept] = { totalEmps: 0, ptEmps: 0, ptOver91: 0, totalHours: 0 };
      }
      map[emp.dept].totalEmps++;
      const isPT = emp.type === 'PARTTIME' || emp.type === 'STPT' || (emp.role && emp.role.includes('PT'));
      if (isPT) map[emp.dept].ptEmps++;
      
      const empSched = weekSchedule[emp.id] || {};
      let empHours = 0;
      
      if (viewMode === 'month') {
        cycleDates.forEach(({ weekKey, dayKey }) => {
          const s = schedule[weekKey]?.[emp.id]?.[dayKey] || empSched[dayKey];
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

    return Object.entries(map).map(([dept, data]) => ({ dept, ...data }));
  }, [employees, schedule, weekSchedule, cycleDates, viewMode]);

  // Tổng giờ toàn chuỗi
  const totalSystemHours = useMemo(() => {
    return storeStats.reduce((sum, s) => sum + s.totalHours, 0);
  }, [storeStats]);

  // 6. Tính toán Kệ & Date và Nhân sự hôm nay
  const quickStats = useMemo(() => {
    const today = new Date();
    const dOfWeek = today.getDay();
    const dayKey = WEEK_DAYS[dOfWeek === 0 ? 6 : dOfWeek - 1];
    
    let empsWorkingToday = 0;
    employees.forEach(emp => {
      if (!pickStore && user?.dept && emp.dept !== user.dept) return;
      if (filterDept !== 'ALL' && emp.dept !== filterDept) return;
      
      const s = weekSchedule[emp.id]?.[dayKey];
      const actual = getShiftCode(s);
      if (actual && actual !== 'off') empsWorkingToday++;
    });

    let storeShelves = (shelves || []);
    if (!pickStore && user?.dept) storeShelves = storeShelves.filter(s => s.storeId === user.dept);
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
  }, [employees, shelves, shelfItems, weekSchedule, pickStore, user?.dept, filterDept]);

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

  // 6. Xuất file CSV định dạng chuẩn OFC
  const handleExportOFC_CSV = (listToExport, fileNameSuffix = 'BaoCao') => {
    const isMonth = viewMode === 'month';
    const dateHeaders = isMonth 
      ? cycleDates.map(d => d.display).join(',') 
      : weekDaysInfo.map(d => d.fullDisplay).join(',');

    let csv = `STT,Cửa Hàng,Mã nhân Viên,Mã Điểm Danh,Vị Trí,Họ và Tên,${dateHeaders},Tổng giờ làm\n`;

    listToExport.forEach((emp, idx) => {
      const shiftsMap = isMonth ? emp.monthShifts : emp.weekShifts;
      const keys = isMonth ? cycleDates.map(d => d.key) : WEEK_DAYS;
      const shiftsStr = keys.map(k => shiftsMap[k] || '').join(',');
      csv += `${idx + 1},${emp.dept || ''},${emp.id || ''},${emp.attendanceCode || ''},${emp.role || emp.type || ''},"${emp.name || ''}",${shiftsStr},${emp.activeTotalHours}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `OFC_BaoCao_PartTime_${isMonth ? `Thang_${selectedMonthCycle}` : `Tuan_${currentWeek}`}_${fileNameSuffix}.csv`;
    link.click();
  };

  const depts = [...new Set(employees.map(e => e.dept))].sort();

  return (
    <div className="w-full min-h-full bg-slate-100/90 p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200">
      <ManagerActionList />
      
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Card 1: Cảnh báo PT vượt định mức */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
          ptOvertimeList.length > 0 
            ? 'bg-gradient-to-br from-rose-50/90 via-red-50/50 to-white border-rose-200 shadow-sm' 
            : 'bg-white border-slate-200/80 shadow-2xs'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700">
                {viewMode === 'month' ? 'PT > 91h/Tháng' : 'PT > 23h/Tuần'}
              </span>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                ptOvertimeList.length > 0 ? 'bg-rose-600 text-white shadow-xs' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {ptOvertimeList.length > 0 ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${ptOvertimeList.length > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {ptOvertimeList.length}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">/ {allPTEmployees.length} PT</span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">
              {ptOvertimeList.length > 0 ? '⚠️ Vượt định mức' : '✅ Đạt chuẩn'}
            </span>
            <button 
              onClick={() => scrollToChart('shifts')}
              className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              Xem biểu đồ ↗
            </button>
          </div>
        </div>

        {/* Card 2: Nhân sự & Hôm nay */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Trực Ca Hôm Nay</span>
              <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={14} />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-blue-700">{quickStats.empsWorkingToday}</span>
              <span className="text-[11px] text-slate-500 font-semibold">/ {employees.length} NV</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
              {employees.length - allPTEmployees.length} FT • {allPTEmployees.length} PT
            </span>
            <button 
              onClick={() => scrollToChart('shifts')}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              Cơ cấu ca ↗
            </button>
          </div>
        </div>

        {/* Card 3: Tổng giờ công đã xếp */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Tổng Giờ Công
              </span>
              <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock size={14} />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-700">{totalSystemHours.toLocaleString()}</span>
              <span className="text-[11px] text-slate-500 font-semibold">giờ</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[80px]">
              {viewMode === 'month' ? `Tháng ${selectedMonthCycle.split('-')[1]}` : `Tuần ${currentWeek.slice(5)}`}
            </span>
            <button 
              onClick={() => scrollToChart('workload')}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              Xu hướng ↗
            </button>
          </div>
        </div>

        {/* Card 4: Chuỗi Cửa hàng */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Cửa Hàng</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Building2 size={14} />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-800">{stores.length || 3}</span>
              <span className="text-[11px] text-slate-500 font-semibold">chi nhánh</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded truncate max-w-[70px]">
              {filterDept === 'ALL' ? 'Toàn chuỗi' : filterDept}
            </span>
            <button 
              onClick={() => scrollToChart('stores')}
              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              So sánh ↗
            </button>
          </div>
        </div>

        {/* Card 5: Kệ & Date */}
        <Link to="/admin/shelves" className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden group block ${
          quickStats.warningShelves > 0 
            ? 'bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-white border-amber-200 shadow-sm hover:border-amber-400' 
            : 'bg-white border-slate-200/80 shadow-2xs hover:border-blue-300'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-extrabold uppercase tracking-wider ${quickStats.warningShelves > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
                Kệ Cận Date
              </span>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                quickStats.warningShelves > 0 ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}>
                <Package size={14} />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${quickStats.warningShelves > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                {quickStats.warningShelves}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">kệ cảnh báo</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
            <span className="text-slate-400">{quickStats.pendingShelves} kệ chờ kiểm</span>
            <span className="text-amber-600 group-hover:underline flex items-center gap-0.5">Kiểm date ↗</span>
          </div>
        </Link>

        {/* Card 6: Tỷ Lệ Tuân Thủ Part-Time (Thay thế thẻ AI thừa) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-white border border-emerald-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                Tuân Thủ Định Mức
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white shadow-xs flex items-center justify-center">
                <PieChart size={14} />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-700">
                {complianceStats.complianceRate}%
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                ({complianceStats.optimal}/{complianceStats.total} NV)
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-100/60 flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700">
              {viewMode === 'month' ? 'Chuẩn 50-91h' : 'Chuẩn 16-23h'}
            </span>
            <button 
              onClick={() => scrollToChart('shifts')}
              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              Phân tầng ↗
            </button>
          </div>
        </div>

      </div>

      {/* Visual Analytics & Forecast Charts - Có ID để cuộn mượt */}
      <div id="analytics-section">
        <DashboardCharts
          viewMode={viewMode}
          selectedMonthCycle={selectedMonthCycle}
          currentWeek={currentWeek}
          cycleDates={cycleDates}
          weekDaysInfo={weekDaysInfo}
          employees={employees}
          allPTEmployees={allPTEmployees}
          ptOvertimeList={ptOvertimeList}
          storeStats={storeStats}
          schedule={schedule}
          totalSystemHours={totalSystemHours}
          activeTab={activeChartTab}
          setActiveTab={setActiveChartTab}
        />
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

      {/* Store Breakdown Cards */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Tình Hình Nhân Sự & Giờ Làm Theo Cửa Hàng ({viewMode === 'month' ? `Tháng ${selectedMonthCycle.split('-')[1]}/${selectedMonthCycle.split('-')[0]}` : 'Theo Tuần'})
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Click vào cửa hàng để lọc nhanh danh sách nhân sự</p>
          </div>
          <span className="text-xs text-slate-500 font-semibold px-2.5 py-1 bg-slate-100 rounded-lg">Toàn hệ thống ({storeStats.length} chi nhánh)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {storeStats.map(s => {
            const isCurrentFilter = filterDept === s.dept;
            const pctOfTotal = totalSystemHours > 0 ? Math.round((s.totalHours / totalSystemHours) * 100) : 0;

            return (
              <div 
                key={s.dept} 
                onClick={() => setFilterDept(isCurrentFilter ? 'ALL' : s.dept)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isCurrentFilter 
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40 shadow-xs' 
                    : 'border-slate-200/90 hover:border-blue-300 bg-slate-50/40 hover:bg-white shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-blue-700 text-sm">🏬 {s.dept}</span>
                  {s.ptOver91 > 0 ? (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[10px] font-extrabold">
                      ⚠️ {s.ptOver91} PT vượt {viewMode === 'month' ? '91h' : '23h'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                      ✓ Đạt chuẩn
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-semibold">Nhân sự</span>
                    <span className="font-extrabold text-slate-800">{s.totalEmps} <span className="font-normal text-slate-500">(PT: {s.ptEmps})</span></span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-semibold">Tổng giờ ({pctOfTotal}%)</span>
                    <span className="font-extrabold text-blue-700">{s.totalHours.toLocaleString()}h</span>
                  </div>
                </div>

                {/* Mini Store Share Bar */}
                <div className="w-full bg-slate-200/80 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${pctOfTotal}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Employee Detail Drill-down Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg shadow-inner">
                  👤
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg leading-tight">{selectedEmp.name}</h3>
                    <span className="px-2 py-0.5 bg-white/20 rounded text-[11px] font-bold">
                      {selectedEmp.role || selectedEmp.type || 'STPT'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-100 font-mono mt-0.5">
                    Mã NV: <strong>{selectedEmp.id}</strong> | Cửa hàng: <strong>{selectedEmp.dept}</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEmp(null)}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* Status Alert Banner */}
              <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
                selectedEmp.isOvertime 
                  ? 'bg-rose-50 border-rose-200 text-rose-900' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className={`p-2.5 rounded-xl text-white ${selectedEmp.isOvertime ? 'bg-rose-600 shadow-2xs' : 'bg-emerald-600'}`}>
                  {selectedEmp.isOvertime ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                </div>
                <div>
                  <h4 className="font-extrabold text-xs">
                    {selectedEmp.isOvertime 
                      ? (viewMode === 'month' 
                          ? `CẢNH BÁO: Nhân viên đã làm ${selectedEmp.monthTotalHours}h / 91h trong tháng!`
                          : `CẢNH BÁO: Nhân viên đã đăng ký ${selectedEmp.weekTotalHours}h / 23h trong tuần!`)
                      : `AN TOÀN: Tổng giờ tháng là ${selectedEmp.monthTotalHours}h (Định mức chuẩn ≤ 91h)`}
                  </h4>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    Định mức tuần an toàn: 16h - 23h. Tổng giờ chu kỳ tháng: {selectedEmp.monthTotalHours}h / 91h.
                  </p>
                </div>
              </div>

              {/* Quick Stat Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tổng Giờ Tháng</span>
                  <span className={`text-2xl font-black font-mono mt-0.5 block ${selectedEmp.monthTotalHours > 91 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {selectedEmp.monthTotalHours}h
                  </span>
                </div>
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Giờ Tuần Này</span>
                  <span className="text-2xl font-black font-mono text-blue-700 mt-0.5 block">
                    {selectedEmp.weekTotalHours}h
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
                        ? `Phân bổ 31 ngày chu kỳ Tháng ${selectedMonthCycle.split('-')[1]}/${selectedMonthCycle.split('-')[0]}:` 
                        : `Chi tiết ca làm việc tuần ${currentWeek}:`}
                    </span>
                  </h4>
                  <span className="text-[11px] font-bold text-blue-700">Tổng cộng: {selectedEmp.activeTotalHours}h</span>
                </div>

                {viewMode === 'month' ? (
                  <div className="grid grid-cols-7 gap-1.5 text-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    {cycleDates.map(d => {
                      const val = selectedEmp.monthShifts[d.key];
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
                      const shiftVal = selectedEmp.weekShifts[day];
                      return (
                        <div key={day} className={`p-2.5 rounded-xl border ${shiftVal ? 'bg-blue-50 border-blue-200 shadow-2xs' : 'bg-white border-slate-200'}`}>
                          <span className="font-black text-xs text-blue-800 block">{day}</span>
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
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <Link 
                to="/admin/schedule"
                className="btn btn-primary text-xs py-1.5 px-3.5 rounded-xl font-bold flex items-center gap-1"
              >
                <span>Chỉnh sửa ca tại Bảng Xếp Lịch</span>
                <ArrowRight size={14} />
              </Link>
              <button 
                onClick={() => setSelectedEmp(null)}
                className="btn btn-outline text-xs py-1.5 px-4 rounded-xl font-bold hover:bg-slate-100 cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
