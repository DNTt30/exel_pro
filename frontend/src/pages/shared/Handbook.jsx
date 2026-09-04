import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Search, Clock, Thermometer, Sparkles, CheckCircle2,
  AlertTriangle, ShieldCheck, Flame, Droplets, UtensilsCrossed,
  ChefHat, RefreshCw, ZoomIn, X, ExternalLink, Calendar,
  ChevronRight, Info, Check, AlertCircle, Eye, Camera
} from 'lucide-react';
import { GS25_HANDBOOK_DATA } from '../../data/gs25HandbookData';

export default function Handbook() {
  const [activeTab, setActiveTab] = useState('quality');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShift, setSelectedShift] = useState('ca1');
  const [selectedDay, setSelectedDay] = useState(() => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[new Date().getDay()] || 'T2';
  });

  // Local storage checklist state for shift checklist
  const [checkedTasks, setCheckedTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('gs25_handbook_tasks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Modal for previewing original scans
  const [previewImage, setPreviewImage] = useState(null);

  // Countdown to next discard timer
  const [countdownText, setCountdownText] = useState('');
  const [nextDiscardHour, setNextDiscardHour] = useState('');
  const [isNearDiscard, setIsNearDiscard] = useState(false);

  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentSeconds = now.getSeconds();
      const nowTotalSec = currentHours * 3600 + currentMinutes * 60 + currentSeconds;

      // Discard times in seconds: 11:00 (39600s), 19:00 (68400s), 22:00 (79200s)
      const targets = [
        { label: '11:00 (Trưa)', sec: 11 * 3600 },
        { label: '19:00 (Tối)', sec: 19 * 3600 },
        { label: '22:00 (Đêm)', sec: 22 * 3600 }
      ];

      let target = targets.find(t => t.sec > nowTotalSec);
      let diffSec = 0;

      if (target) {
        diffSec = target.sec - nowTotalSec;
      } else {
        // Next day 11:00
        target = targets[0];
        diffSec = (24 * 3600 - nowTotalSec) + target.sec;
      }

      const h = Math.floor(diffSec / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      const s = diffSec % 60;

      setNextDiscardHour(target.label);
      setCountdownText(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      setIsNearDiscard(diffSec <= 1800); // within 30 minutes
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleTask = (taskKey) => {
    setCheckedTasks(prev => {
      const updated = { ...prev, [taskKey]: !prev[taskKey] };
      try {
        localStorage.setItem('gs25_handbook_tasks', JSON.stringify(updated));
      } catch (e) {
        console.error("Could not save handbook task", e);
      }
      return updated;
    });
  };

  const resetCurrentShiftTasks = () => {
    const shiftTasks = GS25_HANDBOOK_DATA.cleaningRoster.shifts[selectedShift]?.days[selectedDay] || [];
    setCheckedTasks(prev => {
      const updated = { ...prev };
      shiftTasks.forEach((_, idx) => {
        const key = `${selectedShift}_${selectedDay}_${idx}`;
        delete updated[key];
      });
      try {
        localStorage.setItem('gs25_handbook_tasks', JSON.stringify(updated));
      } catch (e) {
        console.error("Could not reset tasks", e);
      }
      return updated;
    });
  };

  const resolveImgUrl = (path) => {
    const base = import.meta.env.BASE_URL || '/';
    return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  };

  // Tab definitions
  const tabs = [
    { id: 'quality', label: '🕒 Giờ hủy & Nhiệt độ', shortLabel: 'Hủy & Date', icon: Clock },
    { id: 'reports', label: '📸 Báo cáo Ca (Zalo / App Times)', shortLabel: 'Báo cáo Ca', icon: Camera },
    { id: 'cleaning', label: '📋 Checklist Vệ sinh Ca', shortLabel: 'Checklist Ca', icon: CheckCircle2 },
    { id: 'chemicals', label: '🧪 Hóa chất Vệ sinh', shortLabel: 'Hóa chất', icon: Droplets },
    { id: 'sop', label: '🍲 SOP & Công thức', shortLabel: 'SOP Lẩu', icon: UtensilsCrossed },
    { id: 'scans', label: '🖼️ Tài liệu Gốc (9 Ảnh)', shortLabel: 'Ảnh gốc', icon: Eye }
  ];

  // Shift & Day calculation for Tab 2
  const currentShiftData = GS25_HANDBOOK_DATA.cleaningRoster.shifts[selectedShift] || {};
  const currentDayTasks = currentShiftData.days?.[selectedDay] || [];
  const completedCurrentTasksCount = currentDayTasks.filter((_, idx) => checkedTasks[`${selectedShift}_${selectedDay}_${idx}`]).length;
  const shiftProgressPercent = currentDayTasks.length > 0 ? Math.round((completedCurrentTasksCount / currentDayTasks.length) * 100) : 0;

  // Shift Reports calculation for Tab reports
  const currentShiftReports = GS25_HANDBOOK_DATA.shiftReports?.shifts[selectedShift]?.timeline || [];
  const completedReportCount = currentShiftReports.filter((_, idx) => checkedTasks[`report_${selectedShift}_${idx}`]).length;
  const reportProgressPercent = currentShiftReports.length > 0 ? Math.round((completedReportCount / currentShiftReports.length) * 100) : 0;

  const resetCurrentShiftReports = () => {
    setCheckedTasks(prev => {
      const updated = { ...prev };
      currentShiftReports.forEach((_, idx) => {
        delete updated[`report_${selectedShift}_${idx}`];
      });
      try {
        localStorage.setItem('gs25_handbook_tasks', JSON.stringify(updated));
      } catch (e) {
        console.error("Could not reset report tasks", e);
      }
      return updated;
    });
  };

  // Filtered chemicals for Tab 3
  const [chemProvider, setChemProvider] = useState('saraya'); // 'saraya' or 'ecolab'

  // Global search filtering across all handbook content
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results = [];

    // Search quality & expiry
    GS25_HANDBOOK_DATA.qualityAndExpiry.ffSchedules.forEach(ff => {
      ff.items.forEach(item => {
        if (item.toLowerCase().includes(q) || ff.period.toLowerCase().includes(q) || ff.category.toLowerCase().includes(q)) {
          results.push({
            type: 'Giờ hủy FF',
            title: item,
            desc: `Khung giờ hủy: ${ff.period} (${ff.hours.join(', ')}) — ${ff.category}`,
            tab: 'quality'
          });
        }
      });
    });

    GS25_HANDBOOK_DATA.qualityAndExpiry.gmSchedules.forEach(gm => {
      if (gm.lifeRange.toLowerCase().includes(q) || gm.discardBefore.toLowerCase().includes(q)) {
        results.push({
          type: 'Giờ hủy GM',
          title: gm.lifeRange,
          desc: `Thời điểm hủy: ${gm.discardBefore}`,
          tab: 'quality'
        });
      }
    });

    GS25_HANDBOOK_DATA.qualityAndExpiry.temperatures.forEach(temp => {
      if (temp.name.toLowerCase().includes(q) || temp.standard.toLowerCase().includes(q) || temp.note.toLowerCase().includes(q)) {
        results.push({
          type: 'Nhiệt độ chuẩn',
          title: temp.name,
          desc: `Chuẩn: ${temp.standard} — ${temp.note}`,
          tab: 'quality'
        });
      }
    });

    // Search cleaning shifts
    Object.entries(GS25_HANDBOOK_DATA.cleaningRoster.shifts).forEach(([sKey, sVal]) => {
      Object.entries(sVal.days).forEach(([dKey, dTasks]) => {
        dTasks.forEach(task => {
          if (task.toLowerCase().includes(q) || sVal.name.toLowerCase().includes(q) || dKey.toLowerCase().includes(q)) {
            results.push({
              type: 'Vệ sinh Ca',
              title: `${sVal.name} — ${dKey}`,
              desc: task,
              tab: 'cleaning',
              shift: sKey,
              day: dKey
            });
          }
        });
      });
    });

    // Search chemicals
    GS25_HANDBOOK_DATA.chemicals.systems.forEach(sys => {
      sys.items.forEach(item => {
        if (
          item.category.toLowerCase().includes(q) ||
          item.bottle.toLowerCase().includes(q) ||
          item.dilution.toLowerCase().includes(q) ||
          item.target.toLowerCase().includes(q) ||
          (item.colorName && item.colorName.toLowerCase().includes(q))
        ) {
          results.push({
            type: `Hóa chất (${sys.provider})`,
            title: `${item.category}: ${item.bottle}`,
            desc: `Pha: ${item.dilution} | Dùng cho: ${item.target}`,
            tab: 'chemicals'
          });
        }
      });
    });

    // Search hotpot SOP
    GS25_HANDBOOK_DATA.hotpotSOP.recipes.forEach(rec => {
      if (
        rec.product.toLowerCase().includes(q) ||
        rec.equipment.toLowerCase().includes(q) ||
        rec.power.toLowerCase().includes(q) ||
        rec.ingredients.some(i => i.toLowerCase().includes(q)) ||
        rec.process.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'Công thức Lẩu',
          title: rec.product,
          desc: `Công suất: ${rec.power} — Thời gian: ${rec.time} — ${rec.process}`,
          tab: 'sop'
        });
      }
    });

    GS25_HANDBOOK_DATA.hotpotSOP.servingSOP.forEach(srv => {
      if (
        srv.type.toLowerCase().includes(q) ||
        srv.soupPortion.toLowerCase().includes(q) ||
        srv.process.toLowerCase().includes(q) ||
        srv.microwave.home.toLowerCase().includes(q) ||
        srv.microwave.commercial.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'Bán hàng Lẩu / Vi sóng',
          title: srv.type,
          desc: `Vi sóng: ${srv.microwave.commercial} | Súp: ${srv.soupPortion}`,
          tab: 'sop'
        });
      }
    });

    // Search hand hygiene
    GS25_HANDBOOK_DATA.handHygiene.steps.forEach(st => {
      if (st.action.toLowerCase().includes(q)) {
        results.push({
          type: 'Rửa tay 12 bước',
          title: `Bước ${st.step}`,
          desc: st.action,
          tab: 'sop'
        });
      }
    });

    // Search shift reports
    if (GS25_HANDBOOK_DATA.shiftReports) {
      Object.entries(GS25_HANDBOOK_DATA.shiftReports.shifts).forEach(([sKey, sVal]) => {
        sVal.timeline.forEach(item => {
          if (
            item.time.toLowerCase().includes(q) ||
            item.action.toLowerCase().includes(q) ||
            item.detail.toLowerCase().includes(q) ||
            sVal.name.toLowerCase().includes(q)
          ) {
            results.push({
              type: 'Báo cáo Ca',
              title: `${sVal.name} [${item.time}]`,
              desc: `${item.action} — ${item.detail}`,
              tab: 'reports',
              shift: sKey
            });
          }
        });
      });
    }

    // Search scans
    GS25_HANDBOOK_DATA.originalScans.forEach(sc => {
      if (sc.title.toLowerCase().includes(q) || sc.desc.toLowerCase().includes(q) || sc.category.toLowerCase().includes(q)) {
        results.push({
          type: 'Tài liệu ảnh gốc',
          title: sc.title,
          desc: sc.desc,
          tab: 'scans',
          scan: sc
        });
      }
    });

    return results;
  }, [searchQuery]);

  return (
    <div className="min-h-full bg-slate-50/70 pb-24 text-slate-800">
      {/* ── Top Hero Banner ── */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl ring-1 ring-white/20 shadow-inner">
                <BookOpen size={28} className="text-yellow-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-blue-950">
                    GS25 Standard SOP
                  </span>
                  <span className="text-xs text-blue-100 font-medium">Bản chuẩn hóa 2026</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                  Sổ tay Nghiệp vụ & Vận hành Cửa hàng
                </h1>
                <p className="text-xs sm:text-sm text-blue-100/90 mt-0.5 max-w-xl">
                  Cẩm nang quy chuẩn: Giờ hủy hàng, phân công vệ sinh 3 ca, hóa chất Saraya/Ecolab và SOP Chế biến - Bán hàng.
                </p>
              </div>
            </div>

            {/* Countdown to Next Discard Widget */}
            <div className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl border backdrop-blur-md transition-all ${
              isNearDiscard 
                ? 'bg-rose-500/90 border-rose-300 text-white animate-pulse shadow-lg shadow-rose-900/30' 
                : 'bg-white/10 border-white/20 text-white shadow-sm'
            }`}>
              <div className="p-2 bg-white/20 rounded-xl">
                <Clock size={22} className={isNearDiscard ? 'text-white' : 'text-amber-300'} />
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-wide uppercase opacity-90">
                  Đợt hủy FF kế tiếp: <span className="font-bold underline">{nextDiscardHour}</span>
                </div>
                <div className="font-mono text-xl sm:text-2xl font-black tracking-wider leading-tight">
                  {countdownText || '--:--:--'}
                </div>
                <div className="text-[10px] text-blue-100">
                  {isNearDiscard ? '⚠️ Bắt đầu kiểm tra quầy & xé vỏ bao bì!' : 'Đếm ngược tự động theo giờ hệ thống'}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="mt-5 max-w-2xl relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-200" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh: Smart San, bột súp lẩu, nút vi sóng số 3, bồn cầu, tủ đông, ca 1..."
              className="w-full pl-10 pr-10 py-2.5 bg-white/15 focus:bg-white text-white focus:text-slate-900 placeholder-blue-200 focus:placeholder-slate-400 rounded-xl text-sm border border-white/20 focus:border-white focus:ring-2 focus:ring-yellow-300/60 outline-none transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 text-white focus:text-slate-700 rounded-full"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher - Horizontal Scroll on Mobile */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto no-scrollbar border-t border-white/10 pt-2 pb-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap rounded-t-xl transition-all ${
                    isActive
                      ? 'bg-slate-50/95 text-blue-700 shadow-sm border-t-2 border-yellow-400'
                      : 'text-blue-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-blue-600' : 'text-blue-200'} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Container Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Search Results Display */}
        {searchQuery.trim().length > 0 && (
          <div className="mb-6 bg-white rounded-2xl border border-blue-200 shadow-md p-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Search size={18} className="text-blue-600" />
                <span className="font-bold text-sm text-slate-800">
                  Kết quả tìm kiếm cho: "<span className="text-blue-600">{searchQuery}</span>"
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                  {searchResults.length} mục khớp
                </span>
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-500 hover:text-slate-800 hover:underline"
              >
                Đóng tìm kiếm
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                Không tìm thấy quy trình hoặc hướng dẫn nào khớp với từ khóa trên.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {searchResults.map((res, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setActiveTab(res.tab);
                      if (res.shift) setSelectedShift(res.shift);
                      if (res.day) setSelectedDay(res.day);
                      if (res.scan) setPreviewImage(res.scan);
                      setSearchQuery('');
                    }}
                    className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/40 cursor-pointer transition-all flex items-start justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                          {res.type}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                          {res.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {res.desc}
                      </p>
                    </div>
                    <ChevronRight size={15} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: GIỜ HỦY & NHIỆT ĐỘ TIÊU CHUẨN                                      */}
        {/* ========================================================================= */}
        {activeTab === 'quality' && (
          <div className="space-y-6">
            {/* Top Slogan Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-amber-900">
                  {GS25_HANDBOOK_DATA.qualityAndExpiry.slogan}
                </h3>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Nguyên tắc cốt lõi của GS25: Tất cả thực phẩm FF (Off-site & Onsite) phải được thu hồi, xé rách bao bì và hủy đúng khung giờ quy định. Tuyệt đối không để sản phẩm cận date trong tầm với của khách hàng.
                </p>
              </div>
            </div>

            {/* FF Discard Schedules */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Clock size={18} className="text-blue-600" />
                  Khung giờ hủy Thức ăn nhanh (Fast Food)
                </h2>
                <span className="text-xs text-slate-500">Áp dụng cho toàn hệ thống</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {GS25_HANDBOOK_DATA.qualityAndExpiry.ffSchedules.map((schedule, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between hover:border-blue-300 transition-colors">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${schedule.badgeColor}`}>
                          {schedule.period}
                        </span>
                        <div className="flex gap-1">
                          {schedule.hours.map((h, hi) => (
                            <span key={hi} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono font-bold">
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm mb-3">
                        {schedule.category}
                      </h4>

                      <ul className="space-y-1.5 mb-4">
                        {schedule.items.map((item, idx) => (
                          <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="text-blue-500 font-bold shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Info size={13} className="text-blue-500 shrink-0" />
                      <span>{schedule.note}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GM Shelf-life Rules & Standard Temperatures Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* GM Shelf-life Rules */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-3">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  Quy định thời gian hủy hàng bách hóa (GM)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 rounded-l-lg">Khoảng Hạn Sử Dụng (HSD)</th>
                        <th className="px-3 py-2.5 rounded-r-lg text-right">Thời điểm hủy trước HSD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {GS25_HANDBOOK_DATA.qualityAndExpiry.gmSchedules.map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/40">
                          <td className="px-3 py-2 font-medium text-slate-700">{row.lifeRange}</td>
                          <td className="px-3 py-2 text-right">
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                              {row.discardBefore}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Standard Temperatures */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-3">
                  <Thermometer size={18} className="text-blue-600" />
                  Nhiệt độ chuẩn thiết bị bảo quản & chế biến
                </h3>
                <div className="space-y-3">
                  {GS25_HANDBOOK_DATA.qualityAndExpiry.temperatures.map((temp, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{temp.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{temp.note}</div>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-mono font-black text-xs shrink-0 shadow-xs">
                        {temp.standard}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Core Operational Rules Cards */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-amber-500" />
                5 Nguyên tắc vận hành sống còn tại cửa hàng
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {GS25_HANDBOOK_DATA.qualityAndExpiry.coreRules.map((rule, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 hover:shadow-xs transition-shadow">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs">{rule.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pl-7">{rule.desc}</p>
                  </div>
                ))}
              </div>
            </div>
        {/* ========================================================================= */}
        {/* TAB: CÁC MỤC BÁO CÁO MỖI CA TRONG NGÀY (APP TIMES & ZALO)                 */}
        {/* ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Top Operational Notice */}
            <div className="bg-white rounded-2xl border border-blue-200 shadow-2xs p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                    <Camera size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white">
                        Quy Chuẩn Báo Cáo NV
                      </span>
                      <span className="text-xs text-blue-700 font-bold">Group Zalo Cửa Hàng</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                      {GS25_HANDBOOK_DATA.shiftReports.title}
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      📸 <strong>Lưu ý bắt buộc:</strong> Tất cả hình ảnh gửi báo cáo phải chụp bằng <span className="font-bold text-blue-700">App TIMES</span> (để lưu watermark ngày, giờ và định vị cửa hàng chuẩn xác).
                    </p>
                  </div>
                </div>

                {/* Shift Selector */}
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-auto">
                  {[
                    { id: 'ca1', label: 'Ca 1 (Sáng: 6h-14h)' },
                    { id: 'ca2', label: 'Ca 2 (Chiều: 14h-22h)' },
                    { id: 'ca3', label: 'Ca 3 (Đêm: 22h-6h)' }
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedShift(s.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedShift === s.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6 FF Checklist Card */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200">
                <div className="flex items-center gap-2 text-xs font-black text-amber-950 mb-2">
                  <Sparkles size={15} className="text-amber-600" />
                  <span>Danh mục 6 góc chụp Hình FF (Trước khi chụp phải chỉnh tem giá, check trưng bày, POSM):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {GS25_HANDBOOK_DATA.shiftReports.ffPhotoItems.map((item, idx) => (
                    <div key={idx} className="bg-white/90 px-2.5 py-1.5 rounded-lg border border-amber-200/80 text-[11px] font-bold text-amber-900 flex items-center gap-1.5 shadow-2xs">
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Timeline Checklist Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">
                      Mốc Báo Cáo {GS25_HANDBOOK_DATA.shiftReports.shifts[selectedShift]?.name}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      {completedReportCount}/{currentShiftReports.length} mục đã nộp
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2 max-w-xs">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${reportProgressPercent}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={resetCurrentShiftReports}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors self-start sm:self-auto"
                >
                  <RefreshCw size={13} />
                  <span>Đặt lại báo cáo ca này</span>
                </button>
              </div>

              {/* Timeline Items */}
              <div className="space-y-3">
                {currentShiftReports.map((item, idx) => {
                  const taskKey = `report_${selectedShift}_${idx}`;
                  const isDone = !!checkedTasks[taskKey];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleTask(taskKey)}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all ${
                        isDone
                          ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                          : item.highlight
                            ? `${item.highlight} shadow-2xs`
                            : 'bg-slate-50/60 hover:bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 sm:mt-0 transition-colors shrink-0 ${
                          isDone ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300 bg-white'
                        }`}>
                          {isDone && <Check size={14} strokeWidth={3} />}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-mono font-bold tracking-wide">
                              {item.time}
                            </span>
                            {item.urgent && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500 text-white animate-pulse">
                                Bắt buộc
                              </span>
                            )}
                          </div>
                          <div className={`text-xs sm:text-sm font-bold ${isDone ? 'line-through opacity-75' : 'text-slate-900'}`}>
                            {item.action}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {item.detail}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono self-end sm:self-auto shrink-0">
                        Mốc #{idx + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LỊCH PHÂN CÔNG VỆ SINH CA & NGÀY                                   */}
        {/* ========================================================================= */}
        {activeTab === 'cleaning' && (
          <div className="space-y-6">
            {/* Shift & Day Picker Controls */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <Calendar size={18} className="text-blue-600" />
                    Lịch Vệ sinh theo Ca & Thứ trong tuần
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chọn ca và ngày để theo dõi các đầu việc bắt buộc thực hiện trong ca.
                  </p>
                </div>

                {/* Shift Selector */}
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {[
                    { id: 'ca1', label: 'Ca 1 (Sáng: 6h-14h)' },
                    { id: 'ca2', label: 'Ca 2 (Chiều: 14h-22h)' },
                    { id: 'ca3', label: 'Ca 3 (Đêm: 22h-6h)' }
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedShift(s.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedShift === s.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day of week buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => {
                  const isSelected = selectedDay === d;
                  const dayNames = { T2: 'Thứ 2', T3: 'Thứ 3', T4: 'Thứ 4', T5: 'Thứ 5', T6: 'Thứ 6', T7: 'Thứ 7', CN: 'Chủ Nhật' };
                  return (
                    <button
                      key={d}
                      onClick={() => setSelectedDay(d)}
                      className={`flex-1 min-w-[72px] py-2 px-2 text-center rounded-xl border text-xs transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-black shadow-xs ring-1 ring-blue-600'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-600 font-semibold'
                      }`}
                    >
                      <div className="text-[10px] uppercase opacity-75">{d}</div>
                      <div>{dayNames[d]}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checklist items with progress tracker */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">
                      {currentShiftData.name} — {selectedDay}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      {completedCurrentTasksCount}/{currentDayTasks.length} việc hoàn thành
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2 max-w-xs">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${shiftProgressPercent}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={resetCurrentShiftTasks}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors self-start sm:self-auto"
                >
                  <RefreshCw size={13} />
                  <span>Đặt lại checklist ca này</span>
                </button>
              </div>

              {/* Task list with checkboxes */}
              <div className="space-y-2.5">
                {currentDayTasks.map((task, idx) => {
                  const taskKey = `${selectedShift}_${selectedDay}_${idx}`;
                  const isDone = !!checkedTasks[taskKey];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleTask(taskKey)}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isDone
                          ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                          : 'bg-slate-50/60 hover:bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                          isDone ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300 bg-white'
                        }`}>
                          {isDone && <Check size={14} strokeWidth={3} />}
                        </div>
                        <span className={`text-xs sm:text-sm font-medium ${isDone ? 'line-through opacity-75' : ''}`}>
                          {task}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">
                        Đầu việc #{idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Daily Reminder Notes */}
              <div className="mt-5 p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs">
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <Info size={14} className="text-blue-600" />
                  Đầu việc duy trì hàng ngày (Bất kể thứ & ca):
                </div>
                <ul className="space-y-1 pl-5 list-disc text-blue-800/90 text-[11px]">
                  {GS25_HANDBOOK_DATA.cleaningRoster.dailyNotice.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Counter Deep Cleaning SOP (9 items) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-4">
                <UtensilsCrossed size={18} className="text-blue-600" />
                Quy trình Vệ sinh 9 Hạng mục Thiết bị & Quầy Sơ chế (Counter)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {GS25_HANDBOOK_DATA.counterCleaning.items.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-black text-slate-900 text-sm">{item.name}</h4>
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-bold">
                          {item.timing}
                        </span>
                      </div>
                      <div className="space-y-1 mb-3">
                        {item.steps.map((st, si) => (
                          <div key={si} className="text-[11px] text-slate-600 leading-snug">
                            {st}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: DANH MỤC HÓA CHẤT VỆ SINH                                          */}
        {/* ========================================================================= */}
        {activeTab === 'chemicals' && (
          <div className="space-y-6">
            {/* Provider Switcher */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Droplets size={18} className="text-blue-600" />
                  Danh mục Hóa chất Vệ sinh GS25
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tuân thủ nghiêm ngặt bảng màu nhãn và tỷ lệ pha để đảm bảo an toàn thực phẩm.
                </p>
              </div>

              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setChemProvider('saraya')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    chemProvider === 'saraya'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  SARAYA Greentek (Hệ 6 mã màu)
                </button>
                <button
                  onClick={() => setChemProvider('ecolab')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    chemProvider === 'ecolab'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  ECOLAB (KAY QSR)
                </button>
              </div>
            </div>

            {/* SARAYA Greentek Color-coded Cards */}
            {chemProvider === 'saraya' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {GS25_HANDBOOK_DATA.chemicals.systems[0].items.map((item, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between hover:border-blue-300 transition-colors">
                    <div>
                      {/* Top Header Card with Real Color Badge */}
                      <div className={`px-4 py-3 border-b flex items-center justify-between ${item.colorClass}`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs ${item.dotColor}`} />
                          <span className="font-black text-xs tracking-wider uppercase">{item.category}</span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-black/20 text-white">
                          {item.colorName}
                        </span>
                      </div>

                      <div className="p-4 space-y-3">
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase">Tên chai hóa chất</div>
                          <div className="text-xs font-black text-slate-800 mt-0.5">{item.bottle}</div>
                        </div>

                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase">Dụng cụ / Hộp nhấn</div>
                          <div className="text-xs text-slate-700 mt-0.5">{item.tool}</div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="text-[11px] font-bold text-blue-700 uppercase">Tỷ lệ pha loãng</div>
                          <div className="text-xs font-medium text-slate-800 whitespace-pre-line mt-1">
                            {item.dilution}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase">Khu vực / Mục tiêu tẩy rửa</div>
                          <div className="text-xs text-slate-700 mt-0.5">{item.target}</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50/60 border-t border-amber-200 text-[11px] text-amber-900 font-semibold flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                      <span>{item.warning}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ECOLAB Table View */}
            {chemProvider === 'ecolab' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-3 rounded-l-lg">Hạng mục</th>
                        <th className="px-3.5 py-3">Tên hóa chất (ECOLAB KAY)</th>
                        <th className="px-3.5 py-3">Cách pha loãng</th>
                        <th className="px-3.5 py-3 rounded-r-lg">Mục đích sử dụng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {GS25_HANDBOOK_DATA.chemicals.systems[1].items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/40">
                          <td className="px-3.5 py-3 font-bold text-slate-900">{item.category}</td>
                          <td className="px-3.5 py-3 font-semibold text-blue-700">{item.bottle}</td>
                          <td className="px-3.5 py-3 text-slate-700">{item.dilution}</td>
                          <td className="px-3.5 py-3 text-slate-600">{item.target}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SOP CHẾ BIẾN & CÔNG THỨC LẨU GS25                                   */}
        {/* ========================================================================= */}
        {activeTab === 'sop' && (
          <div className="space-y-6">
            {/* Top SOP Header */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[11px] font-mono font-bold">
                      {GS25_HANDBOOK_DATA.hotpotSOP.code}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Quy chuẩn Lẩu Miền Bắc</span>
                  </div>
                  <h2 className="text-base font-black text-slate-900 mt-1">
                    {GS25_HANDBOOK_DATA.hotpotSOP.title}
                  </h2>
                </div>
                <div className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  ⚡ Nhiệt độ tâm sau nấu: <strong className="text-slate-800">≥ 75°C</strong>
                </div>
              </div>
            </div>

            {/* Recipes Cards */}
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-3">
                <ChefHat size={18} className="text-blue-600" />
                Công thức Nấu Nước Súp & Chả Cá
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {GS25_HANDBOOK_DATA.hotpotSOP.recipes.map((rec, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-black text-slate-900 text-sm">{rec.product}</h4>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-mono font-bold border border-blue-200">
                          {rec.time}
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Thiết bị & Công suất</div>
                        <div className="text-xs font-semibold text-slate-800 mt-0.5">
                          {rec.equipment} · <span className="text-rose-600">{rec.power}</span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="text-[11px] font-bold text-slate-400 uppercase mb-1">Định lượng nguyên liệu</div>
                        <ul className="space-y-1">
                          {rec.ingredients.map((ing, ii) => (
                            <li key={ii} className="text-xs text-slate-700 flex items-start gap-1.5">
                              <span className="text-blue-500 font-bold">•</span>
                              <span>{ing}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-2.5 rounded-xl">
                      <strong>Cách làm:</strong> {rec.process}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Serving & Microwave Numbers */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-3">
                <Flame size={18} className="text-rose-600" />
                SOP Bán Hàng & Quy tắc bấm Lò vi sóng Công nghiệp
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {GS25_HANDBOOK_DATA.hotpotSOP.servingSOP.map((srv, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-slate-900 text-sm">{srv.type}</h4>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                          {srv.container}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 mb-2">
                        <strong>Định lượng súp:</strong> <span className="text-blue-700 font-bold">{srv.soupPortion}</span>
                      </div>

                      <div className="text-xs text-slate-600 mb-3 leading-relaxed">
                        {srv.process}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200/80">
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                        <span className="text-xs text-slate-600">{srv.microwave.home}</span>
                        <div className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-black">
                          {srv.microwave.commercial}
                        </div>
                      </div>
                      <div className="text-[11px] text-amber-800 flex items-center gap-1 font-medium">
                        <Info size={12} className="text-amber-600 shrink-0" />
                        <span>{srv.note}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hand Hygiene 12 Steps (Saraya 60s) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-600" />
                    {GS25_HANDBOOK_DATA.handHygiene.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dụng cụ: {GS25_HANDBOOK_DATA.handHygiene.equipment}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold self-start sm:self-auto">
                  Quy chuẩn 60 Giây Saraya
                </span>
              </div>

              {/* 4 Missed Areas */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl mb-4 text-xs text-rose-950">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-800">
                  <AlertCircle size={14} />
                  4 Vùng trên bàn tay thường xuyên bị bỏ sót nhất:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-medium">
                  {GS25_HANDBOOK_DATA.handHygiene.missedAreas.map((m, idx) => (
                    <div key={idx} className="bg-white/80 px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-900">
                      ⚠️ {m}
                    </div>
                  ))}
                </div>
              </div>

              {/* 12 Steps Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                {GS25_HANDBOOK_DATA.handHygiene.steps.map((st) => (
                  <div key={st.step} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {st.step}
                    </span>
                    <span className="text-xs text-slate-700 leading-snug">
                      {st.action}
                    </span>
                  </div>
                ))}
              </div>

              {/* 7 Mandatory Moments */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-blue-600" />
                  7 Thời điểm bắt buộc nhân viên phải rửa tay:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-600">
                  {GS25_HANDBOOK_DATA.handHygiene.mandatoryMoments.map((mom, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>{mom}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: TÀI LIỆU GỐC (8 ẢNH CHỤP THỰC TẾ)                                    */}
        {/* ========================================================================= */}
        {activeTab === 'scans' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <Eye size={18} className="text-blue-600" />
                    Bộ Ảnh Gốc 9 Quy trình & Bảng biểu Thực tế Cửa hàng GS25
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Nhấp vào bất kỳ ảnh nào để phóng to, đối chiếu chi tiết các bảng biểu đang dán tại cửa hàng.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-bold self-start sm:self-auto">
                  9 Bản scan chất lượng cao
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {GS25_HANDBOOK_DATA.originalScans.map((scan) => {
                const imgUrl = resolveImgUrl(scan.url);
                return (
                  <div
                    key={scan.id}
                    onClick={() => setPreviewImage(scan)}
                    className="group bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Thumbnail with Overlay */}
                      <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                        <img
                          src={imgUrl}
                          alt={scan.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="px-3 py-1.5 rounded-xl bg-white/90 text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-xs">
                            <ZoomIn size={14} /> Phóng to
                          </span>
                        </div>
                        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                          {scan.category}
                        </span>
                      </div>

                      <div className="p-4">
                        <h4 className="font-bold text-slate-900 text-xs group-hover:text-blue-600 transition-colors">
                          {scan.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-2">
                          {scan.desc}
                        </p>
                      </div>
                    </div>

                    <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-blue-600 font-bold">
                      <span>Xem chi tiết ảnh</span>
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ── Modal Phóng to Ảnh Scan Gốc ── */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {previewImage.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {previewImage.desc}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={resolveImgUrl(previewImage.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors text-xs flex items-center gap-1 font-semibold"
                >
                  <ExternalLink size={16} /> Mở tab mới
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-900/5 flex items-center justify-center min-h-[400px]">
              <img
                src={resolveImgUrl(previewImage.url)}
                alt={previewImage.title}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
