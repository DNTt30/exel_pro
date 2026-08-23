import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  PieChart, 
  BarChart3, 
  Users, 
  Clock, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  Calendar,
  Layers,
  BarChart2
} from 'lucide-react';
import { SHIFTS } from '../data/initialData';
import { getShiftCode, getCoveringStore } from '../utils/shiftHelper';

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DAY_FULL_NAMES = {
  'T2': 'Thứ Hai',
  'T3': 'Thứ Ba',
  'T4': 'Thứ Tư',
  'T5': 'Thứ Năm',
  'T6': 'Thứ Sáu',
  'T7': 'Thứ Bảy',
  'CN': 'Chủ Nhật'
};

export default function DashboardCharts({ 
  viewMode, 
  selectedMonthCycle, 
  currentWeek, 
  cycleDates, 
  weekDaysInfo, 
  employees, 
  allPTEmployees, 
  ptOvertimeList, 
  storeStats, 
  schedule, 
  totalSystemHours,
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab
}) {
  const [internalActiveTab, setInternalActiveTab] = useState('workload'); // 'workload' | 'stores' | 'shifts'
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = externalSetActiveTab || setInternalActiveTab;
  // Chế độ phân tích: 'avg_week' (Mặc định: Trung bình các tuần) | 'detailed' (Chi tiết kỳ đang chọn) | 'monthly' (So sánh các tháng)
  const [chartScope, setChartScope] = useState('avg_week');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // 1. Dữ liệu TRUNG BÌNH CÁC TUẦN (Average Weekly Workload Pattern across all recorded weeks)
  const averageWeeklyWorkload = useMemo(() => {
    const weekKeys = Object.keys(schedule);
    const totalWeeks = Math.max(weekKeys.length, 1);

    return WEEK_DAYS.map(day => {
      let sumHours = 0;
      let sumShifts = 0;
      let sumMorning = 0;
      let sumAfternoon = 0;
      let sumNight = 0;
      let sumSplit = 0;
      let sumTransfer = 0;

      weekKeys.forEach(wKey => {
        employees.forEach(emp => {
          const s = schedule[wKey]?.[emp.id]?.[day];
          const actual = getShiftCode(s);
          if (actual && actual !== 'off') {
            sumShifts++;
            if (getCoveringStore(s)) sumTransfer++;

            if (SHIFTS[actual]) {
              sumHours += SHIFTS[actual].hours;
              if (actual === '6-14') sumMorning++;
              else if (actual === '14-22') sumAfternoon++;
              else if (actual === '22-6') sumNight++;
              else sumSplit++;
            } else {
              const match = actual.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
              if (match) {
                let start = parseInt(match[1], 10);
                let end = parseInt(match[2], 10);
                if (end < start) end += 24;
                sumHours += (end - start);
                if (start >= 5 && end <= 15) sumMorning++;
                else if (start >= 13 && end <= 23) sumAfternoon++;
                else if (start >= 21 || end <= 7) sumNight++;
                else sumSplit++;
              }
            }
          }
        });
      });

      const avgHours = Math.round(sumHours / totalWeeks);
      const avgShifts = Math.round(sumShifts / totalWeeks);
      const avgMorning = Math.round(sumMorning / totalWeeks);
      const avgAfternoon = Math.round(sumAfternoon / totalWeeks);
      const avgNight = Math.round(sumNight / totalWeeks);
      const avgSplit = Math.round(sumSplit / totalWeeks);
      const avgTransfer = Math.round(sumTransfer / totalWeeks);

      return {
        label: day,
        subLabel: DAY_FULL_NAMES[day] || day,
        isSunday: day === 'CN',
        totalHours: avgHours,
        shiftCount: avgShifts,
        morningCount: avgMorning,
        afternoonCount: avgAfternoon,
        nightCount: avgNight,
        splitCount: avgSplit,
        transferCount: avgTransfer,
        isAverage: true,
        sampleWeeks: totalWeeks
      };
    });
  }, [schedule, employees]);

  // 2. Dữ liệu CHI TIẾT KỲ ĐANG CHỌN (Detailed Day-by-Day for current month cycle or week)
  const detailedDailyWorkload = useMemo(() => {
    const dates = viewMode === 'month' ? cycleDates : weekDaysInfo;
    
    return dates.map(d => {
      const dayLabel = viewMode === 'month' ? d.shortDisplay : d.dayLabel;
      const subLabel = viewMode === 'month' ? d.dayKey : d.shortDisplay;
      const weekKey = viewMode === 'month' ? d.weekKey : currentWeek;
      const dayKey = viewMode === 'month' ? d.dayKey : d.key;

      let totalHours = 0;
      let shiftCount = 0;
      let morningCount = 0;
      let afternoonCount = 0;
      let nightCount = 0;
      let splitCount = 0;
      let transferCount = 0;

      employees.forEach(emp => {
        const s = schedule[weekKey]?.[emp.id]?.[dayKey];
        const actual = getShiftCode(s);
        if (actual && actual !== 'off') {
          shiftCount++;
          if (getCoveringStore(s)) transferCount++;

          if (SHIFTS[actual]) {
            totalHours += SHIFTS[actual].hours;
            if (actual === '6-14') morningCount++;
            else if (actual === '14-22') afternoonCount++;
            else if (actual === '22-6') nightCount++;
            else splitCount++;
          } else {
            const match = actual.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
            if (match) {
              let start = parseInt(match[1], 10);
              let end = parseInt(match[2], 10);
              if (end < start) end += 24;
              totalHours += (end - start);
              if (start >= 5 && end <= 15) morningCount++;
              else if (start >= 13 && end <= 23) afternoonCount++;
              else if (start >= 21 || end <= 7) nightCount++;
              else splitCount++;
            }
          }
        }
      });

      return {
        label: dayLabel,
        subLabel,
        isSunday: subLabel === 'CN' || dayLabel === 'CN',
        totalHours,
        shiftCount,
        morningCount,
        afternoonCount,
        nightCount,
        splitCount,
        transferCount,
        isAverage: false
      };
    });
  }, [viewMode, cycleDates, weekDaysInfo, employees, schedule, currentWeek]);

  // 3. Dữ liệu SO SÁNH CÁC THÁNG (Monthly Average & Totals across 26-25 Salary Cycles)
  const monthlyComparisonData = useMemo(() => {
    const [selY, selM] = selectedMonthCycle.split('-').map(Number);
    const months = [];

    // Duyệt qua 6 tháng (-3 tháng trước đến +2 tháng sau)
    for (let offset = -3; offset <= 2; offset++) {
      const d = new Date(selY, (selM - 1) + offset, 1);
      const curY = d.getFullYear();
      const curM = d.getMonth() + 1;
      
      let prevM = curM - 1;
      let prevY = curY;
      if (prevM < 1) { prevM = 12; prevY--; }

      // Tính tổng giờ của tháng đó
      let monthHours = 0;
      let ptOvertimeCount = 0;
      const daysInPrev = new Date(prevY, prevM, 0).getDate();

      // Scan 31 days
      const daysList = [];
      for (let day = 26; day <= daysInPrev; day++) {
        const dObj = new Date(prevY, prevM - 1, day);
        const dow = dObj.getDay();
        const dKey = WEEK_DAYS[dow === 0 ? 6 : dow - 1];
        const monDiff = dObj.getDate() - dow + (dow === 0 ? -6 : 1);
        const mDate = new Date(dObj);
        mDate.setDate(monDiff);
        const wKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}-${String(mDate.getDate()).padStart(2, '0')}`;
        daysList.push({ dKey, wKey });
      }
      for (let day = 1; day <= 25; day++) {
        const dObj = new Date(curY, curM - 1, day);
        const dow = dObj.getDay();
        const dKey = WEEK_DAYS[dow === 0 ? 6 : dow - 1];
        const monDiff = dObj.getDate() - dow + (dow === 0 ? -6 : 1);
        const mDate = new Date(dObj);
        mDate.setDate(monDiff);
        const wKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}-${String(mDate.getDate()).padStart(2, '0')}`;
        daysList.push({ dKey, wKey });
      }

      // Calculate totals
      allPTEmployees.forEach(emp => {
        let empHrs = 0;
        daysList.forEach(({ dKey, wKey }) => {
          const s = schedule[wKey]?.[emp.id]?.[dKey];
          const actual = getShiftCode(s);
          if (actual && actual !== 'off') {
            if (SHIFTS[actual]) empHrs += SHIFTS[actual].hours;
            else {
              const match = actual.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
              if (match) {
                let start = parseInt(match[1], 10);
                let end = parseInt(match[2], 10);
                if (end < start) end += 24;
                empHrs += (end - start);
              }
            }
          }
        });
        if (empHrs > 91) ptOvertimeCount++;
      });

      // System hours in this month
      employees.forEach(emp => {
        daysList.forEach(({ dKey, wKey }) => {
          const s = schedule[wKey]?.[emp.id]?.[dKey];
          const actual = getShiftCode(s);
          if (actual && actual !== 'off') {
            if (SHIFTS[actual]) monthHours += SHIFTS[actual].hours;
            else {
              const match = actual.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
              if (match) {
                let start = parseInt(match[1], 10);
                let end = parseInt(match[2], 10);
                if (end < start) end += 24;
                monthHours += (end - start);
              }
            }
          }
        });
      });

      months.push({
        key: `${curY}-${curM}`,
        label: `T${curM}/${curY}`,
        fullLabel: `Tháng ${curM.toString().padStart(2, '0')}/${curY}`,
        cycleLabel: `26/${prevM} → 25/${curM}`,
        totalHours: monthHours,
        ptOvertimeCount: ptOvertimeCount,
        isCurrent: curY === selY && curM === selM
      });
    }

    return months;
  }, [selectedMonthCycle, allPTEmployees, employees, schedule, totalSystemHours, ptOvertimeList]);

  // Selected Active Data based on chartScope
  const activeChartData = useMemo(() => {
    if (chartScope === 'avg_week') return averageWeeklyWorkload;
    return detailedDailyWorkload;
  }, [chartScope, averageWeeklyWorkload, detailedDailyWorkload]);

  // Max hours for chart scaling
  const maxHours = useMemo(() => {
    const max = Math.max(...activeChartData.map(d => d.totalHours), 10);
    return Math.ceil(max / 20) * 20;
  }, [activeChartData]);

  // 4. Phân tầng định mức Part-time (PT Compliance Tiers)
  const ptTiers = useMemo(() => {
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
    const optimalPct = Math.round((optimal / total) * 100);
    const underPct = Math.round((under / total) * 100);
    const overtimePct = Math.round((overtime / total) * 100);
    const complianceRate = Math.round(((total - overtime) / total) * 100);

    return {
      optimal,
      optimalPct,
      under,
      underPct,
      overtime,
      overtimePct,
      total: allPTEmployees.length,
      complianceRate
    };
  }, [allPTEmployees, viewMode]);

  // 5. Cơ cấu tổng hợp ca làm việc
  const shiftSummary = useMemo(() => {
    let morning = 0;
    let afternoon = 0;
    let night = 0;
    let split = 0;
    let transfer = 0;
    let total = 0;

    detailedDailyWorkload.forEach(d => {
      morning += d.morningCount;
      afternoon += d.afternoonCount;
      night += d.nightCount;
      split += d.splitCount;
      transfer += d.transferCount;
      total += d.shiftCount;
    });

    const safeTotal = total || 1;
    return {
      total,
      morning,
      morningPct: Math.round((morning / safeTotal) * 100),
      afternoon,
      afternoonPct: Math.round((afternoon / safeTotal) * 100),
      night,
      nightPct: Math.round((night / safeTotal) * 100),
      split,
      splitPct: Math.round((split / safeTotal) * 100),
      transfer,
      transferPct: Math.round((transfer / safeTotal) * 100),
    };
  }, [detailedDailyWorkload]);

  // SVG dimensions for Area Chart
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 35;
  const paddingY = 25;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  // Compute SVG Path points for Area Chart
  const points = useMemo(() => {
    if (activeChartData.length === 0) return [];
    const step = chartWidth / (activeChartData.length - 1 || 1);
    
    return activeChartData.map((d, idx) => {
      const x = paddingX + idx * step;
      const y = paddingY + chartHeight - (d.totalHours / (maxHours || 1)) * chartHeight;
      return { x, y, data: d };
    });
  }, [activeChartData, chartWidth, chartHeight, maxHours]);

  // Hàm tính đường cong Bézier mượt mà (Cubic Bézier Spline)
  const getSmoothSplinePath = (pts) => {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    if (pts.length === 2) {
      return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
    }

    let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 >= pts.length ? i + 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 5.5;
      const cp1y = p1.y + (p2.y - p0.y) / 5.5;
      const cp2x = p2.x - (p3.x - p1.x) / 5.5;
      const cp2y = p2.y - (p3.y - p1.y) / 5.5;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const svgPathD = useMemo(() => {
    return getSmoothSplinePath(points);
  }, [points]);

  const svgAreaD = useMemo(() => {
    if (points.length === 0) return '';
    const curve = getSmoothSplinePath(points);
    const firstX = points[0].x.toFixed(1);
    const lastX = points[points.length - 1].x.toFixed(1);
    const bottomY = (paddingY + chartHeight).toFixed(1);
    return `${curve} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [points, chartHeight]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* Charts Navigation Tabs & Scope Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <BarChart3 size={18} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800">Biểu Đồ Phân Tích & Dự Báo Giờ Công</h3>
            <p className="text-[11px] text-slate-500 font-medium">Trực quan hóa khối lượng ca làm việc & mức độ tuân thủ hạn mức 91h</p>
          </div>
        </div>

        {/* Primary View Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('workload')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'workload' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp size={13} />
            <span>Xu Hướng & Trung Bình</span>
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'stores' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 size={13} />
            <span>Cơ Cấu Cửa Hàng</span>
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'shifts' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart size={13} />
            <span>Phân Bổ Ca & PT</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Xu Hướng & Trung Bình (Workload Analysis with 3 Sub-Modes) */}
      {activeTab === 'workload' && (
        <div className="space-y-4">
          
          {/* Sub-toolbar to toggle: Average vs Detailed vs Monthly */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Layers size={14} className="text-blue-600" />
                <span>Chế độ phân tích:</span>
              </span>
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  onClick={() => { setChartScope('avg_week'); setHoveredPoint(null); }}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    chartScope === 'avg_week' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-blue-700'
                  }`}
                >
                  <span>📊 Trung Bình Các Tuần (T2 - CN)</span>
                </button>
                <button
                  onClick={() => { setChartScope('detailed'); setHoveredPoint(null); }}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    chartScope === 'detailed' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-blue-700'
                  }`}
                >
                  <span>📅 Chi Tiết Kỳ Đang Chọn ({viewMode === 'month' ? '31 Ngày' : '7 Ngày'})</span>
                </button>
                <button
                  onClick={() => { setChartScope('monthly'); setHoveredPoint(null); }}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    chartScope === 'monthly' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-blue-700'
                  }`}
                >
                  <span>📈 So Sánh Các Tháng (26 - 25)</span>
                </button>
              </div>
            </div>

            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline-block">
              {chartScope === 'avg_week' && '💡 Tổng hợp trung bình tất cả tuần trong hệ thống'}
              {chartScope === 'detailed' && `💡 Dữ liệu thực tế của ${viewMode === 'month' ? `Tháng ${selectedMonthCycle}` : `Tuần ${currentWeek}`}`}
              {chartScope === 'monthly' && '💡 Tổng hợp theo từng chu kỳ lương 26 tháng trước → 25 tháng này'}
            </span>
          </div>

          {/* Sub-View 1 & 2: Area / Curve Chart (Average Weekly or Detailed Daily) */}
          {chartScope !== 'monthly' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Main Area / Line Chart */}
              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                          <TrendingUp size={16} />
                        </div>
                        <span>
                          {chartScope === 'avg_week' 
                            ? 'Đồ Thị Tải Ca Trung Bình Các Thứ Trong Tuần (T2 → CN)' 
                            : `Đồ Thị Chi Tiết Giờ Công ${viewMode === 'month' ? `Chu Kỳ Tháng ${selectedMonthCycle}` : `Tuần ${currentWeek}`}`}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 ml-7">
                        {chartScope === 'avg_week' 
                          ? 'Dữ liệu trung bình tổng hợp từ toàn bộ lịch sử các tuần đã xếp trong hệ thống' 
                          : 'Đường cong biểu diễn tổng giờ công thực tế từng ngày'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60 font-bold">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span> Giờ công (h)
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        Đỉnh: <strong className="text-slate-700 font-mono">{Math.max(...activeChartData.map(d => d.totalHours), 0)}h</strong>
                      </span>
                    </div>
                  </div>

                  {/* SVG Interactive Chart with Continuous Mouse Tracking */}
                  <div className="relative w-full bg-gradient-to-b from-slate-50/50 to-white rounded-2xl p-2 border border-slate-100">
                    <svg 
                      viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                      className="w-full h-56 select-none overflow-visible cursor-crosshair"
                      onMouseMove={(e) => {
                        const svg = e.currentTarget;
                        const rect = svg.getBoundingClientRect();
                        const clientX = e.clientX - rect.left;
                        const scaleX = svgWidth / rect.width;
                        const svgX = clientX * scaleX;
                        
                        if (svgX >= paddingX - 10 && svgX <= svgWidth - paddingX + 10 && points.length > 0) {
                          const step = chartWidth / (points.length - 1 || 1);
                          let closestIdx = Math.round((svgX - paddingX) / step);
                          closestIdx = Math.max(0, Math.min(points.length - 1, closestIdx));
                          setHoveredPoint(closestIdx);
                        }
                      }}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                          <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="hoverColGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#2563eb" floodOpacity="0.3" />
                        </filter>
                      </defs>

                      {/* Y-Axis Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = paddingY + chartHeight * (1 - ratio);
                        const val = Math.round(maxHours * ratio);
                        return (
                          <g key={i}>
                            <line 
                              x1={paddingX} 
                              y1={y} 
                              x2={svgWidth - paddingX} 
                              y2={y} 
                              stroke="#e2e8f0" 
                              strokeWidth="0.8" 
                              strokeDasharray={ratio === 0 ? "none" : "4 4"} 
                            />
                            <text 
                              x={paddingX - 8} 
                              y={y + 3.5} 
                              textAnchor="end" 
                              fontSize="9.5" 
                              fontWeight="600" 
                              fill="#94a3b8"
                            >
                              {val}h
                            </text>
                          </g>
                        );
                      })}

                      {/* Hover Column Highlight Pillar */}
                      {hoveredPoint !== null && points[hoveredPoint] && (
                        <rect
                          x={points[hoveredPoint].x - (chartWidth / (points.length - 1 || 1)) / 2}
                          y={paddingY}
                          width={chartWidth / (points.length - 1 || 1)}
                          height={chartHeight}
                          fill="url(#hoverColGradient)"
                          rx="6"
                        />
                      )}

                      {/* Area Gradient Fill */}
                      <path d={svgAreaD} fill="url(#areaGradient)" />

                      {/* Smooth Bézier Curve Line with Soft Glow */}
                      <path 
                        d={svgPathD} 
                        fill="none" 
                        stroke="#2563eb" 
                        strokeWidth="3.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        filter="url(#glow)"
                      />

                      {/* Vertical Crosshair Line on Hover */}
                      {hoveredPoint !== null && points[hoveredPoint] && (
                        <g>
                          <line 
                            x1={points[hoveredPoint].x} 
                            y1={paddingY} 
                            x2={points[hoveredPoint].x} 
                            y2={paddingY + chartHeight} 
                            stroke="#2563eb" 
                            strokeWidth="1.5" 
                            strokeDasharray="3 3" 
                          />
                        </g>
                      )}

                      {/* Interactive Points on the Curve */}
                      {points.map((p, idx) => {
                        const isHovered = hoveredPoint === idx;
                        const isSunday = p.data.isSunday;

                        return (
                          <g key={idx} className="cursor-pointer" onClick={() => setHoveredPoint(idx)}>
                            {isHovered && (
                              <circle 
                                cx={p.x} 
                                cy={p.y} 
                                r="11" 
                                fill="#3b82f6" 
                                opacity="0.35"
                                className="animate-ping"
                              />
                            )}

                            {/* Circle on curve */}
                            <circle 
                              cx={p.x} 
                              cy={p.y} 
                              r={isHovered ? 6.5 : (isSunday ? 5 : 4)} 
                              fill={isSunday ? "#ea580c" : (isHovered ? "#1d4ed8" : "#2563eb")} 
                              stroke="#ffffff" 
                              strokeWidth={isHovered ? "3" : "2"} 
                            />

                            {/* X-Axis Label */}
                            {(chartScope === 'avg_week' || viewMode === 'week' || idx % 3 === 0 || idx === points.length - 1) && (
                              <g>
                                {isHovered && (
                                  <rect
                                    x={p.x - 14}
                                    y={paddingY + chartHeight + 6}
                                    width="28"
                                    height="18"
                                    rx="6"
                                    fill="#2563eb"
                                  />
                                )}
                                <text 
                                  x={p.x} 
                                  y={paddingY + chartHeight + (isHovered ? 19 : 17)} 
                                  textAnchor="middle" 
                                  fontSize={chartScope === 'avg_week' ? "11" : "10"} 
                                  fontWeight={isSunday || isHovered ? "800" : "600"} 
                                  fill={isHovered ? "#ffffff" : (isSunday ? "#ea580c" : "#64748b")}
                                >
                                  {p.data.label}
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {/* Rich Floating Tooltip */}
                    {hoveredPoint !== null && points[hoveredPoint] && (
                      <div 
                        className="absolute bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl text-xs pointer-events-none z-30 transition-all border border-white/10 animate-in fade-in duration-100 min-w-[240px]"
                        style={{
                          left: `${Math.min(Math.max((points[hoveredPoint].x / svgWidth) * 100, 18), 82)}%`,
                          top: points[hoveredPoint].y > 90 ? '10px' : '95px',
                          transform: 'translateX(-50%)'
                        }}
                      >
                        <div className="font-extrabold text-blue-300 border-b border-slate-700/80 pb-1.5 mb-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                            <span className="text-white text-xs">
                              {chartScope === 'avg_week' 
                                ? `${points[hoveredPoint].data.subLabel} (${points[hoveredPoint].data.label})` 
                                : `${points[hoveredPoint].data.label} (${points[hoveredPoint].data.subLabel})`}
                            </span>
                          </div>
                          <span className="text-white font-mono bg-blue-600 px-2 py-0.5 rounded-md text-[11px] font-bold shadow-xs">
                            {points[hoveredPoint].data.totalHours}h {chartScope === 'avg_week' ? 'TB' : ''}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[11px] text-slate-300">
                          <div className="flex justify-between items-center bg-slate-800/80 px-2.5 py-1 rounded-lg">
                            <span className="text-slate-400">
                              {chartScope === 'avg_week' ? 'Trung bình ca trực:' : 'Tổng số ca trực:'}
                            </span>
                            <strong className="text-white font-mono">{points[hoveredPoint].data.shiftCount} ca</strong>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                            <div className="flex items-center justify-between bg-slate-800/60 px-2 py-1 rounded-lg">
                              <span className="text-emerald-400 font-semibold">Sáng (6-14):</span>
                              <strong className="text-white font-mono">{points[hoveredPoint].data.morningCount}</strong>
                            </div>
                            <div className="flex items-center justify-between bg-slate-800/60 px-2 py-1 rounded-lg">
                              <span className="text-sky-400 font-semibold">Chiều (14-22):</span>
                              <strong className="text-white font-mono">{points[hoveredPoint].data.afternoonCount}</strong>
                            </div>
                            <div className="flex items-center justify-between bg-slate-800/60 px-2 py-1 rounded-lg">
                              <span className="text-amber-400 font-semibold">Gãy (10-18):</span>
                              <strong className="text-white font-mono">{points[hoveredPoint].data.splitCount}</strong>
                            </div>
                            <div className="flex items-center justify-between bg-slate-800/60 px-2 py-1 rounded-lg">
                              <span className="text-rose-400 font-semibold">Đêm (22-6):</span>
                              <strong className="text-white font-mono">{points[hoveredPoint].data.nightCount}</strong>
                            </div>
                          </div>

                          {points[hoveredPoint].data.transferCount > 0 && (
                            <div className="flex justify-between items-center bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2.5 py-1 rounded-lg mt-1 font-bold">
                              <span>Chi viện liên cửa hàng:</span>
                              <span>{points[hoveredPoint].data.transferCount} ca</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Day-by-Day Interactive Mini Bar Cards Strip (for 7 days) */}
                {activeChartData.length <= 7 && (
                  <div className="grid grid-cols-7 gap-2 mt-3 pt-3 border-t border-slate-100">
                    {activeChartData.map((d, i) => {
                      const isHovered = hoveredPoint === i;
                      const maxVal = Math.max(...activeChartData.map(item => item.totalHours), 1);
                      const barPct = Math.round((d.totalHours / maxVal) * 100);

                      return (
                        <div
                          key={i}
                          onMouseEnter={() => setHoveredPoint(i)}
                          onMouseLeave={() => setHoveredPoint(null)}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            isHovered 
                              ? 'bg-blue-50 border-blue-400 shadow-xs ring-2 ring-blue-400/20 -translate-y-0.5' 
                              : 'bg-slate-50/70 border-slate-200/80 hover:bg-white'
                          }`}
                        >
                          <span className={`text-[11px] font-black block ${d.isSunday ? 'text-orange-600' : (isHovered ? 'text-blue-700' : 'text-slate-700')}`}>
                            {d.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium block truncate">
                            {d.subLabel}
                          </span>
                          
                          {/* Mini Progress Bar */}
                          <div className="w-full bg-slate-200 h-1.5 rounded-full my-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                d.isSunday ? 'bg-orange-500' : (isHovered ? 'bg-blue-600' : 'bg-blue-500')
                              }`}
                              style={{ width: `${barPct}%` }}
                            ></div>
                          </div>

                          <span className="text-xs font-black font-mono text-slate-900 block">
                            {d.totalHours}h
                          </span>
                          <span className="text-[9px] text-slate-500 font-semibold block">
                            {d.shiftCount} ca
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Insights Sidebar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Sparkles size={15} />
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-800">
                      {chartScope === 'avg_week' ? 'Chỉ Số Trung Bình Toàn Chuỗi' : 'Chỉ Số Tải Kỳ Này'}
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {/* Metric 1 */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {chartScope === 'avg_week' ? 'Giờ Làm TB / Ngày' : 'Giờ Làm TB Trong Kỳ'}
                      </span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xl font-black font-mono text-slate-800">
                          {Math.round(activeChartData.reduce((sum, d) => sum + d.totalHours, 0) / (activeChartData.length || 1))}h
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          ~ {Math.round(activeChartData.reduce((sum, d) => sum + d.shiftCount, 0) / (activeChartData.length || 1))} ca/ngày
                        </span>
                      </div>
                    </div>

                    {/* Metric 2 */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {chartScope === 'avg_week' ? 'Thứ Cao Điểm Nhất' : 'Ngày Cao Điểm Nhất'}
                      </span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-base font-extrabold text-blue-700">
                          {activeChartData.reduce((max, d) => d.totalHours > max.totalHours ? d : max, activeChartData[0] || {}).subLabel || activeChartData[0]?.label}
                        </span>
                        <span className="text-xs font-black font-mono text-slate-800">
                          {Math.max(...activeChartData.map(d => d.totalHours))}h
                        </span>
                      </div>
                    </div>

                    {/* Metric 3 */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tải Ca Cuối Tuần (CN)</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-base font-extrabold text-orange-600">
                          {Math.round(((activeChartData.find(d => d.isSunday)?.totalHours || 0) / (activeChartData.reduce((s, d) => s + d.totalHours, 0) || 1)) * 100)}%
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">tổng khối lượng</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Quy chuẩn định mức:</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">≤ 91h/tháng</span>
                </div>
              </div>

            </div>
          ) : (
            /* Sub-View 3: Monthly Comparison Cards & Columns (Chu Kỳ 26-25) */
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                    <Calendar size={16} className="text-blue-600" />
                    <span>Xu Hướng & So Sánh Khối Lượng Giờ Làm Giữa Các Chu Kỳ Tháng (26 - 25)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">Theo dõi biến động tổng giờ công và số lượng nhân sự Part-time vượt quá 91h qua từng tháng</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {monthlyComparisonData.map(m => (
                  <div 
                    key={m.key} 
                    className={`p-4 rounded-xl border transition-all ${
                      m.isCurrent 
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20' 
                        : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-800 text-xs">{m.label}</span>
                      {m.isCurrent && (
                        <span className="px-1.5 py-0.2 text-[9px] bg-blue-600 text-white rounded font-bold">Đang xem</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{m.cycleLabel}</span>

                    <div className="mt-3">
                      <span className="text-lg font-black font-mono text-blue-700 block">{m.totalHours.toLocaleString()}h</span>
                      <span className="text-[10px] text-slate-500 font-medium">tổng giờ công</span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-semibold">PT vượt:</span>
                      <span className={`font-black ${m.ptOvertimeCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {m.ptOvertimeCount > 0 ? `⚠️ ${m.ptOvertimeCount} NV` : '✓ 0 NV'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Tab 2: Cơ Cấu Phân Bổ Theo Cửa Hàng (Store Breakdown Stacked Bars) */}
      {activeTab === 'stores' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                <Building2 size={16} className="text-blue-600" />
                <span>Tỷ Trọng Giờ Công & Cơ Cấu FT / PT Theo Từng Chi Nhánh</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">So sánh tổng giờ làm việc và tỷ lệ tuân thủ định mức giữa các cửa hàng</p>
            </div>
            <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">
              Tổng cộng: <strong>{totalSystemHours.toLocaleString()}h</strong>
            </span>
          </div>

          <div className="space-y-4">
            {storeStats.map(s => {
              const storePct = totalSystemHours > 0 ? Math.round((s.totalHours / totalSystemHours) * 100) : 0;
              const ptRatio = s.totalEmps > 0 ? Math.round((s.ptEmps / s.totalEmps) * 100) : 0;
              const ftRatio = 100 - ptRatio;

              return (
                <div key={s.dept} className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-blue-700 text-sm">🏬 {s.dept}</span>
                      <span className="text-xs text-slate-500 font-semibold">({s.totalEmps} nhân sự: {s.totalEmps - s.ptEmps} FT, {s.ptEmps} PT)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black font-mono text-slate-800">{s.totalHours.toLocaleString()}h ({storePct}%)</span>
                      {s.ptOver91 > 0 ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-extrabold">
                          ⚠️ {s.ptOver91} PT vượt {viewMode === 'month' ? '91h' : '23h'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                          ✓ Đạt chuẩn
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Multi-segment Progress Bar */}
                  <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex shadow-inner">
                    <div 
                      className="h-full bg-purple-600 transition-all" 
                      style={{ width: `${ftRatio * (storePct / 100)}%` }}
                      title={`Full-time: ${ftRatio}%`}
                    ></div>
                    <div 
                      className={`h-full transition-all ${s.ptOver91 > 0 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                      style={{ width: `${ptRatio * (storePct / 100)}%` }}
                      title={`Part-time: ${ptRatio}%`}
                    ></div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span> Giờ Full-time
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> Giờ Part-time
                      </span>
                    </div>
                    <span>Chiếm <strong>{storePct}%</strong> tổng giờ toàn chuỗi</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Phân Bổ Ca & Mức Độ Tuân Thủ Định Mức */}
      {activeTab === 'shifts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* PT Hours Compliance Donut & Tiers */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Mức Độ Tuân Thủ Định Mức Part-Time ({viewMode === 'month' ? 'Hạn Mức 91h' : '23h/Tuần'})</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Đánh giá tỷ lệ nhân sự đạt chuẩn vs vượt định mức quy định</p>
              </div>
              <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                ptTiers.complianceRate >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {ptTiers.complianceRate}% Tuân thủ
              </span>
            </div>

            {/* 3 Tier Progress Bars */}
            <div className="space-y-3 mt-4">
              
              {/* Tier 1: Đạt chuẩn tối ưu */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <span>Đạt chuẩn tối ưu ({viewMode === 'month' ? '60h - 91h' : '16h - 23h'})</span>
                  </span>
                  <span className="font-black text-emerald-800">{ptTiers.optimal} NV ({ptTiers.optimalPct}%)</span>
                </div>
                <div className="w-full bg-emerald-200/60 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${ptTiers.optimalPct}%` }}></div>
                </div>
              </div>

              {/* Tier 2: Dưới định mức */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>Dưới định mức ({viewMode === 'month' ? '< 60h' : '< 16h'})</span>
                  </span>
                  <span className="font-black text-amber-800">{ptTiers.under} NV ({ptTiers.underPct}%)</span>
                </div>
                <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${ptTiers.underPct}%` }}></div>
                </div>
              </div>

              {/* Tier 3: Vượt hạn mức */}
              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/80">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-bold text-rose-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                    <span>Vượt định mức ({viewMode === 'month' ? '> 91h' : '> 23h'})</span>
                  </span>
                  <span className="font-black text-rose-800">{ptTiers.overtime} NV ({ptTiers.overtimePct}%)</span>
                </div>
                <div className="w-full bg-rose-200/60 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-600 h-full rounded-full transition-all" style={{ width: `${ptTiers.overtimePct}%` }}></div>
                </div>
              </div>

            </div>
          </div>

          {/* Shift Type Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                  <Clock size={16} className="text-indigo-600" />
                  <span>Cơ Cấu Phân Bổ Các Khung Ca Làm Việc</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Tổng hợp {shiftSummary.total} ca làm việc đã được xếp lịch</p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {/* Ca Sáng */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>Ca Sáng (06:00 - 14:00)</span>
                  </span>
                  <span className="font-black text-slate-800">{shiftSummary.morning} ca ({shiftSummary.morningPct}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${shiftSummary.morningPct}%` }}></div>
                </div>
              </div>

              {/* Ca Chiều */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span>Ca Chiều (14:00 - 22:00)</span>
                  </span>
                  <span className="font-black text-slate-800">{shiftSummary.afternoon} ca ({shiftSummary.afternoonPct}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${shiftSummary.afternoonPct}%` }}></div>
                </div>
              </div>

              {/* Ca Gãy */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    <span>Ca Gãy / Tăng Cường (10:00 - 18:00)</span>
                  </span>
                  <span className="font-black text-slate-800">{shiftSummary.split} ca ({shiftSummary.splitPct}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full rounded-full transition-all" style={{ width: `${shiftSummary.splitPct}%` }}></div>
                </div>
              </div>

              {/* Chi Viện */}
              {shiftSummary.transfer > 0 && (
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                      <span>Ca Chi Viện Liên Cửa Hàng</span>
                    </span>
                    <span className="font-black text-slate-800">{shiftSummary.transfer} ca ({shiftSummary.transferPct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-yellow-500 h-full rounded-full transition-all" style={{ width: `${shiftSummary.transferPct}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
