import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { SHIFTS } from '../../data/initialData';
import { 
  Download, 
  Printer, 
  Search, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  Building2,
  FileText,
  X,
  Sparkles,
  Zap,
  RotateCcw,
  Save,
  LayoutGrid,
  Table,
  MapPin,
  Sun,
  Moon,
  Coffee
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ShiftInput from '../../components/ShiftInput';
import { useGroupedEmployees } from '../../hooks/useGroupedEmployees';
import { exportScheduleToExcel } from '../../utils/excelExport';
import { WEEK_DAYS, DAY_FULL_NAMES } from '../../data/constants';
import { normalizeShift, getShiftHours } from '../../utils/shiftHelper';
import ShiftSwapModal from '../../components/modals/ShiftSwapModal';
import ShiftSwapListModal from '../../components/modals/ShiftSwapListModal';

export default function EmployeeSchedule() {
  const { user, schedule, updateShift, currentWeek, setCurrentWeek, employees, shiftSwaps } = useStore();
  const weekSchedule = schedule[currentWeek] || {};

  const [search, setSearch] = useState('');
  const [filterOnlyMe, setFilterOnlyMe] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving'
  const [displayView, setDisplayView] = useState('card'); // 'card' (Lịch thẻ cá nhân) hoặc 'table' (Bảng tính toàn CH)
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showSwapListModal, setShowSwapListModal] = useState(false);

  const pendingMySwapsCount = useMemo(() => {
    return (shiftSwaps || []).filter(s => s.toEmpId === user?.id && s.status === 'pending_partner').length;
  }, [shiftSwaps, user?.id]);

  // 1. Ngày hiển thị cố định theo Tuần (T2 -> CN)
  const activeDays = WEEK_DAYS;

  // 3. Nhóm nhân viên theo cửa hàng của nhân viên đang đăng nhập
  const myDept = user?.dept || 'VN0497';
  const groupedEmps = useGroupedEmployees(search, myDept, 'ALL', weekSchedule);

  // 4. Lịch của nhân viên đăng nhập
  const mySched = weekSchedule[user?.id] || {};

  // 5. Kiểm tra xem tuần đang chọn có phải là TUẦN SAU / TƯƠNG LAI hay không
  const isFutureWeek = useMemo(() => {
    const parts = currentWeek.split('-');
    if (parts.length !== 3) return false;
    const selectedMonday = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    selectedMonday.setHours(0, 0, 0, 0);

    const today = new Date();
    const currentMonday = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    currentMonday.setDate(diff);
    currentMonday.setHours(0, 0, 0, 0);

    // Chỉ cho phép đăng ký ca ở tuần sau (selectedMonday > currentMonday)
    return selectedMonday.getTime() > currentMonday.getTime();
  }, [currentWeek]);

  // 6. Tính tuần sau
  const nextWeekDateStr = useMemo(() => {
    const today = new Date();
    const currentMonday = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    currentMonday.setDate(diff + 7);
    return `${currentMonday.getFullYear()}-${String(currentMonday.getMonth() + 1).padStart(2, '0')}-${String(currentMonday.getDate()).padStart(2, '0')}`;
  }, []);

  // 7. Xử lý chỉnh sửa / đăng ký ca làm việc (Chỉ tuần tương lai mới được sửa)
  const handleShiftChange = useCallback(async (emp, day, value) => {
    if (emp.id !== user?.id) return;
    if (!isFutureWeek) {
      alert('Tuần này đã qua thời hạn đăng ký / chỉnh sửa. Bạn chỉ có thể đăng ký ca cho các tuần sau.');
      return;
    }
    setSaveStatus('saving');
    await updateShift(currentWeek, user.id, day, value);
    setTimeout(() => setSaveStatus('saved'), 400);
  }, [currentWeek, updateShift, user?.id, isFutureWeek]);

  // 8. Đăng ký nhanh cả tuần mẫu (Chỉ tuần tương lai mới được sửa)
  const handleQuickRegister = async (shiftCode) => {
    if (!isFutureWeek) {
      alert('Tuần này đã qua thời hạn đăng ký / chỉnh sửa. Bạn chỉ có thể đăng ký ca cho các tuần sau.');
      return;
    }
    setSaveStatus('saving');
    for (let i = 0; i < WEEK_DAYS.length; i++) {
      const day = WEEK_DAYS[i];
      // Mặc định CN nghỉ nếu chọn ca làm việc
      const code = (day === 'CN' && shiftCode !== 'off') ? 'off' : shiftCode;
      await updateShift(currentWeek, user.id, day, code);
    }
    setTimeout(() => setSaveStatus('saved'), 400);
  };

  // 9. Tính tổng giờ & số ca cá nhân
  const { myTotalHours, myTotalShifts } = useMemo(() => {
    let totalH = 0;
    let totalShifts = 0;
    activeDays.forEach(d => {
      const rawVal = mySched[d];
      if (rawVal) {
        const { shift } = normalizeShift(rawVal);
        if (shift && shift !== 'off') {
          totalShifts++;
          totalH += getShiftHours(shift);
        }
      }
    });
    return { myTotalHours: totalH, myTotalShifts: totalShifts };
  }, [mySched, activeDays]);

  const isPT = user?.type === 'PARTTIME' || user?.type === 'STPT' || (user?.role && user?.role.includes('PT'));
  const isWeekOver23 = isPT && myTotalHours > 23;
  const isWeekUnder16 = isPT && myTotalHours > 0 && myTotalHours < 16;
  const isFT = !isPT;
  const isFTUnder48 = isFT && myTotalHours < 48;

  // 10. Danh sách 7 ngày chi tiết cho Card View
  const weekDaysCardData = useMemo(() => {
    const parts = currentWeek.split('-').map(Number);
    const weekStartDate = new Date(parts[0], parts[1] - 1, parts[2]);
    const today = new Date();

    return WEEK_DAYS.map((dayKey, idx) => {
      const dateObj = new Date(weekStartDate);
      dateObj.setDate(weekStartDate.getDate() + idx);
      
      const isToday = today.toDateString() === dateObj.toDateString();
      const rawVal = mySched[dayKey] || '';
      const { shift, covering_store } = normalizeShift(rawVal);
      const isOff = !shift || shift === 'off';
      const shiftInfo = SHIFTS[shift] || null;
      const hours = isOff ? 0 : getShiftHours(shift);

      const dayFullName = DAY_FULL_NAMES[dayKey] || dayKey;
      const dateFormatted = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

      return {
        dayKey,
        dayFullName,
        dateFormatted,
        dateObj,
        isToday,
        shift,
        covering_store,
        isOff,
        shiftInfo,
        hours,
        rawVal
      };
    });
  }, [currentWeek, mySched]);

  const handleExportExcel = () => {
    exportScheduleToExcel({
      currentWeek,
      deptName: myDept,
      groupedEmps,
      weekSchedule
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative print:bg-white print:block">
      {/* Modals */}
      <ShiftSwapModal
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        currentWeek={currentWeek}
      />
      <ShiftSwapListModal
        isOpen={showSwapListModal}
        onClose={() => setShowSwapListModal(false)}
        currentWeek={currentWeek}
      />
      
      {/* Top Toolbar */}
      <div className="print:hidden">
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          
          {/* Left: View Switcher & Shift Swap Action */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Tab View Switcher */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => setDisplayView('card')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  displayView === 'card' 
                    ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid size={14} />
                <span>Lịch của tôi (Thẻ)</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayView('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  displayView === 'table' 
                    ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table size={14} />
                <span>Lịch cả cửa hàng (Bảng)</span>
              </button>
            </div>

            {/* Button: Đổi ca */}
            <button
              type="button"
              onClick={() => setShowSwapModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Gửi yêu cầu đổi ca cho đồng nghiệp"
            >
              <RotateCcw size={13} className="text-indigo-600" />
              <span>Đổi ca</span>
            </button>

            {/* Button: Đơn đổi ca */}
            <button
              type="button"
              onClick={() => setShowSwapListModal(true)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Xem danh sách đơn đổi ca"
            >
              <span>📋 Đơn đổi ca</span>
              {pendingMySwapsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              )}
            </button>
          </div>

          {/* Right: Week Controls & Quick Register */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Week Selector */}
            <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 p-0.5">
              <button 
                onClick={() => {
                  const parts = currentWeek.split('-').map(Number);
                  const d = new Date(parts[0], parts[1] - 1, parts[2]);
                  d.setDate(d.getDate() - 7);
                  const wKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  setCurrentWeek(wKey);
                }}
                className="p-1 hover:bg-white rounded text-slate-600 cursor-pointer"
                title="Tuần trước"
              >
                <ChevronLeft size={14} />
              </button>

              <select 
                value={currentWeek}
                onChange={e => setCurrentWeek(e.target.value)}
                className="border-none bg-transparent text-blue-700 font-bold text-xs outline-none px-2 cursor-pointer"
              >
                {(() => {
                  const today = new Date();
                  const currentMonday = new Date(today);
                  const dayOfWeek = today.getDay();
                  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                  currentMonday.setDate(diff);
                  currentMonday.setHours(0, 0, 0, 0);

                  const list = [];
                  for (let i = -1; i <= 3; i++) {
                    const d = new Date(currentMonday);
                    d.setDate(currentMonday.getDate() + (i * 7));
                    const wKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    list.push({ key: wKey, offset: i, startDate: d });
                  }

                  if (!list.some(item => item.key === currentWeek)) {
                    const parts = currentWeek.split('-').map(Number);
                    const d = new Date(parts[0], parts[1] - 1, parts[2]);
                    d.setHours(0, 0, 0, 0);
                    const wKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    list.push({ key: wKey, offset: null, startDate: d });
                  }

                  list.sort((a, b) => a.startDate - b.startDate);

                  return list.map(item => {
                    const wStart = item.startDate;
                    const wEnd = new Date(wStart);
                    wEnd.setDate(wStart.getDate() + 6);
                    const startStr = `${String(wStart.getDate()).padStart(2, '0')}/${String(wStart.getMonth() + 1).padStart(2, '0')}`;
                    const endStr = `${String(wEnd.getDate()).padStart(2, '0')}/${String(wEnd.getMonth() + 1).padStart(2, '0')}`;
                    
                    let label = `Tuần: ${startStr} → ${endStr}/${wStart.getFullYear()}`;
                    if (item.offset === 0) label = `📍 Tuần này (${startStr} → ${endStr})`;
                    else if (item.offset === 1) label = `⚡ Tuần sau (${startStr} → ${endStr})`;
                    else if (item.offset === -1) label = `Tuần trước (${startStr} → ${endStr})`;

                    return <option key={item.key} value={item.key}>{label}</option>;
                  });
                })()}
              </select>

              <button 
                onClick={() => {
                  const parts = currentWeek.split('-').map(Number);
                  const d = new Date(parts[0], parts[1] - 1, parts[2]);
                  d.setDate(d.getDate() + 7);
                  const wKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  setCurrentWeek(wKey);
                }}
                className="p-1 hover:bg-white rounded text-slate-600 cursor-pointer"
                title="Tuần sau"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Quick Next Week Jump */}
            {!isFutureWeek && (
              <button 
                onClick={() => setCurrentWeek(nextWeekDateStr)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold text-xs transition-all shadow-2xs cursor-pointer"
                title="Chuyển sang tuần sau để đăng ký ca làm việc"
              >
                <Zap size={13} className="text-amber-600" />
                <span>Đăng ký Tuần Sau ↗</span>
              </button>
            )}

            <button className="btn btn-outline text-xs py-1.5 px-2.5 rounded-lg font-semibold hover:text-emerald-700 hover:border-emerald-300" onClick={handleExportExcel} title="Xuất file Excel">
              <Download size={13} className="text-emerald-600" /> <span className="hidden md:inline">Xuất Excel</span>
            </button>
            <button className="btn btn-outline text-xs py-1.5 px-2.5 rounded-lg font-semibold hover:text-blue-700" onClick={handlePrint} title="In hoặc lưu PDF">
              <Printer size={13} /> <span className="hidden md:inline">In PDF</span>
            </button>
          </div>
        </div>

        {/* Quick Shift Registration Bar (When future week) */}
        {isFutureWeek && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 px-4 py-2 border-b border-emerald-200 text-[11px] text-slate-700 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-600 text-white rounded-md font-extrabold text-[11px] shadow-2xs">
                <Sparkles size={12} /> ĐANG MỞ ĐĂNG KÝ CA LÀM
              </span>
              <span className="text-slate-700 font-semibold">
                Chọn ca làm việc cho tuần sau hoặc bấm chọn nhanh mẫu:
              </span>

              {/* Quick Template Buttons */}
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  type="button"
                  onClick={() => handleQuickRegister('6-14')}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[10px] transition-all shadow-2xs cursor-pointer"
                  title="Đăng ký ca 6-14 từ T2 đến T7, CN nghỉ"
                >
                  + Ca 6-14
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRegister('14-22')}
                  className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg font-bold text-[10px] transition-all shadow-2xs cursor-pointer"
                  title="Đăng ký ca 14-22 từ T2 đến T7, CN nghỉ"
                >
                  + Ca 14-22
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRegister('10-18')}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold text-[10px] transition-all shadow-2xs cursor-pointer"
                  title="Đăng ký ca 10-18 từ T2 đến T7, CN nghỉ"
                >
                  + Ca 10-18
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRegister('off')}
                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold text-[10px] flex items-center gap-0.5 transition-colors cursor-pointer"
                  title="Xóa tất cả ca tuần này"
                >
                  <RotateCcw size={10} /> Đặt lại
                </button>
              </div>
            </div>

            {/* Auto-Save & Limit Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-md border border-emerald-200">
                <span className={`w-2 h-2 rounded-full ${saveStatus === 'saving' ? 'bg-amber-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`}></span>
                <span className="text-[10px] font-bold text-slate-700">
                  {saveStatus === 'saving' ? 'Đang lưu...' : 'Cloud Auto-Saved'}
                </span>
              </div>

              {/* Status Badge */}
              {isPT ? (
                <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${
                  isWeekOver23
                    ? 'bg-red-100 text-red-700 border border-red-300 animate-pulse'
                    : isWeekUnder16
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {isWeekOver23
                    ? `⚠️ Vượt định mức PT (${myTotalHours}h / 23h)`
                    : isWeekUnder16
                      ? `⚠️ Thiếu giờ tối thiểu (${myTotalHours}h / 16h)`
                      : `✓ Định mức PT an toàn (${myTotalHours}h)`}
                </span>
              ) : (
                <span className="font-bold text-blue-700 text-[10px] bg-white px-2 py-1 rounded-md border border-blue-200">
                  Đã đăng ký: {myTotalHours}h / 6 ca
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* VIEW 1: LỊCH BIỂU THẺ CÁ NHÂN (CARD VIEW - TỐI ƯU MOBILE & TRỰC QUAN) */}
      {displayView === 'card' && (
        <div className="flex-1 overflow-auto p-3 sm:p-5 space-y-4">
          {/* Header Summary Banner */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              <div>
                <div className="font-black text-base text-slate-800 flex items-center gap-2">
                  <span>{user?.name}</span>
                  <span className="text-xs font-mono text-slate-400">({user?.id})</span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="font-semibold text-blue-700">{myDept}</span>
                  <span>•</span>
                  <span>{user?.role || user?.type || 'Nhân viên'}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700">{isFutureWeek ? 'Đang mở đăng ký ca ✍️' : 'Lịch đã chốt 🔒'}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Tổng giờ tuần</div>
                <div className="text-lg font-black text-blue-700 font-mono">{myTotalHours}h</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Tổng số ca</div>
                <div className="text-lg font-black text-emerald-700 font-mono">{myTotalShifts} ca</div>
              </div>
              <div className={`px-3.5 py-2 rounded-xl text-center border ${
                isWeekOver23 
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : (isWeekUnder16 || isFTUnder48)
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">Trạng thái</div>
                <div className="text-xs font-black mt-1">
                  {isWeekOver23 
                    ? '⚠️ Vượt 23h/tuần' 
                    : (isWeekUnder16 
                      ? '⚠️ Thiếu giờ (<16h)' 
                      : (isFTUnder48 ? '⚠️ Thiếu giờ (<48h)' : '✓ Đạt định mức'))}
                </div>
              </div>
            </div>
          </div>

          {/* 7 Daily Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {weekDaysCardData.map((card) => {
              const canEdit = isFutureWeek;

              return (
                <div 
                  key={card.dayKey}
                  className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-2xs ${
                    card.isToday 
                      ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20' 
                      : (card.isOff ? 'bg-white/80 border-slate-200' : 'bg-white border-slate-200 hover:border-blue-300')
                  }`}
                >
                  {/* Card Header */}
                  <div className={`p-3 border-b flex items-center justify-between ${
                    card.isToday ? 'bg-blue-600 text-white' : (card.dayKey === 'CN' ? 'bg-orange-50 text-orange-950 border-orange-200' : 'bg-slate-100/80 text-slate-800 border-slate-200')
                  }`}>
                    <div>
                      <div className="font-black text-sm">{card.dayFullName}</div>
                      <div className={`text-[11px] font-mono font-semibold ${card.isToday ? 'text-blue-100' : 'text-slate-500'}`}>
                        {card.dateFormatted}
                      </div>
                    </div>
                    {card.isToday && (
                      <span className="px-2 py-0.5 bg-white text-blue-700 rounded-full font-black text-[9px] uppercase tracking-wider shadow-xs">
                        Hôm nay
                      </span>
                    )}
                  </div>

                  {/* Card Body: Shift Details */}
                  <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-center">
                    {card.isOff ? (
                      <div className="text-center py-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-1.5">
                          <Coffee size={18} />
                        </div>
                        <div className="font-extrabold text-slate-400 text-xs">NGHỈ (OFF)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Không có ca làm</div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                            {card.shift.startsWith('22') ? <Moon size={11} className="text-indigo-600" /> : <Sun size={11} className="text-amber-500" />}
                            <span>Ca làm việc</span>
                          </span>
                          <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 border border-blue-200 px-1.5 rounded">
                            {card.hours}h
                          </span>
                        </div>

                        {/* Shift Badge */}
                        <div 
                          className="p-2.5 rounded-xl font-black text-sm text-center shadow-2xs"
                          style={{
                            backgroundColor: card.shiftInfo?.bg || '#bfdbfe',
                            color: card.shiftInfo?.text || '#1e40af'
                          }}
                        >
                          {card.shift}
                        </div>

                        {/* Store Location */}
                        <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-slate-600">
                          <MapPin size={12} className={card.covering_store ? 'text-amber-600' : 'text-slate-400'} />
                          <span>{card.covering_store ? `Chi viện: ${card.covering_store}` : `Tại: ${myDept}`}</span>
                        </div>
                      </div>
                    )}

                    {/* Interactive Shift Changer on Card (if registration open) */}
                    {canEdit && (
                      <div className="pt-2 border-t border-slate-100 mt-auto">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Đổi ca ngày này:</label>
                        <select
                          className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          value={card.shift || 'off'}
                          onChange={e => handleShiftChange(user, card.dayKey, e.target.value)}
                        >
                          <option value="off">OFF</option>
                          {Object.keys(SHIFTS).filter(s => s !== 'off').map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: BẢNG TÍNH EXCEL TOÀN CỬA HÀNG (TABLE VIEW) */}
      {displayView === 'table' && (
        <div className="flex-1 overflow-auto bg-slate-100 p-2 relative print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:h-auto">
          <div className="bg-white shadow border border-slate-300 inline-block min-w-full print:shadow-none print:border-none print:w-full print:block">
            <table className="excel-table print:w-full">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-300">
                  <th className="min-w-[48px] w-[48px] max-w-[48px] text-center font-bold text-slate-700 text-xs md:sticky left-0 z-20 bg-slate-200 border-r border-slate-300">STT</th>
                  <th className="hidden md:table-cell min-w-[96px] w-[96px] max-w-[96px] text-center font-bold text-slate-700 text-xs md:sticky z-20 bg-slate-200 border-r border-slate-300" style={{ left: '48px' }}>Mã NV</th>
                  <th className="min-w-[150px] md:min-w-[200px] w-[150px] md:w-[200px] max-w-[150px] md:max-w-[200px] text-left font-bold text-slate-700 text-xs sticky z-30 bg-slate-200 border-r border-slate-300 px-3 left-0 md:left-[144px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                    Họ và Tên
                  </th>
                  <th className="min-w-[80px] w-[80px] max-w-[80px] text-center font-bold text-slate-700 text-xs border-r border-slate-300">Vị trí</th>
                  <th className="min-w-[80px] w-[80px] max-w-[80px] text-center font-bold text-slate-700 text-xs border-r border-slate-300">Cửa hàng</th>
                  
                  {/* 7 Cột Ngày Trong Tuần */}
                  {activeDays.map((day, idx) => {
                    let dateStr = '';
                    let isToday = false;
                    const today = new Date();

                    const parts = currentWeek.split('-').map(Number);
                    if (parts.length === 3) {
                      const weekStartDate = new Date(parts[0], parts[1] - 1, parts[2]);
                      const dateObj = new Date(weekStartDate);
                      dateObj.setDate(weekStartDate.getDate() + idx);
                      dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                      isToday = today.toDateString() === dateObj.toDateString();
                    }

                    return (
                      <th 
                        key={day} 
                        className={`min-w-[60px] w-[60px] max-w-[60px] border-r border-slate-300 py-1 transition-colors ${
                          isToday 
                            ? 'bg-blue-200/90 text-blue-950 font-black ring-1 ring-blue-500' 
                            : (day === 'CN' ? 'bg-orange-50/80 text-orange-900' : 'bg-slate-200 text-slate-700')
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

                  <th className="min-w-[64px] w-[64px] text-center font-bold text-slate-800 text-xs border-r border-slate-300 bg-slate-200">Tổng giờ</th>
                  <th className="min-w-[56px] w-[56px] text-center font-bold text-slate-800 text-xs bg-slate-200">Số ca</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedEmps).map(([dept, emps]) => {
                  const filteredList = filterOnlyMe 
                    ? emps.filter(e => e.id === user?.id) 
                    : emps;

                  return (
                    <React.Fragment key={dept}>
                      <tr className="bg-slate-100 font-bold border-b border-slate-300">
                        <td colSpan={activeDays.length + 7} className="px-4 py-1.5 text-blue-800 text-xs sticky left-0 z-10 bg-slate-100">
                          🏬 CỬA HÀNG: {dept} ({filteredList.length} nhân sự)
                        </td>
                      </tr>

                      {filteredList.map((emp, idx) => {
                        const empSched = weekSchedule[emp.id] || {};
                        const isMe = emp.id === user?.id;

                        let totalH = 0;
                        let totalShifts = 0;
                        activeDays.forEach(d => {
                          const raw = empSched[d];
                          if (raw) {
                            const { shift } = normalizeShift(raw);
                            if (shift && shift !== 'off') {
                              totalShifts++;
                              totalH += getShiftHours(shift);
                            }
                          }
                        });

                        const isEmpPT = emp.type === 'PARTTIME' || emp.type === 'STPT' || (emp.role && emp.role.includes('PT'));
                        const isPTOvertimed = isEmpPT && totalH > 23;

                        return (
                          <tr 
                            key={emp.id} 
                            className={`hover:bg-slate-50 border-b border-slate-200 ${
                              isMe ? 'bg-blue-50/70 font-bold ring-2 ring-blue-500/40' : ''
                            }`}
                          >
                            <td className={`text-center font-mono text-xs md:sticky left-0 z-10 border-r border-slate-300 ${isMe ? 'bg-blue-100 text-blue-900 font-black' : 'bg-white text-slate-400'}`}>
                              {idx + 1}
                            </td>
                            <td className={`hidden md:table-cell text-center font-mono text-xs md:sticky z-10 border-r border-slate-300 ${isMe ? 'bg-blue-100 text-blue-900 font-black' : 'bg-white text-slate-600'}`} style={{ left: '48px' }}>
                              {emp.id}
                            </td>
                            <td className={`font-bold text-xs sticky z-20 border-r border-slate-300 px-3 left-0 md:left-[144px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] truncate ${
                              isMe ? 'bg-blue-100 text-blue-900 font-black' : 'bg-white text-slate-800'
                            }`}>
                              <div className="flex items-center gap-1.5">
                                <span>{emp.name}</span>
                                {isMe && (
                                  <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[10px] font-bold">
                                    Tôi
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-center text-xs text-slate-600 border-r border-slate-300">
                              {emp.role || emp.type}
                            </td>
                            <td className="text-center text-xs font-semibold text-blue-700 border-r border-slate-300">
                              {emp.dept}
                            </td>

                            {/* Ô Ca Làm Việc */}
                            {activeDays.map((day, dIdx) => {
                              const val = empSched[day] || '';
                              const canEdit = isMe && isFutureWeek;

                              return (
                                <td key={day} className={`p-0 border-r border-slate-300 min-w-[64px] w-[64px] max-w-[64px] h-8 text-center align-middle ${
                                  canEdit ? 'bg-white hover:ring-2 hover:ring-emerald-400 cursor-pointer' : ''
                                }`}>
                                  <ShiftInput
                                    value={val}
                                    rawValue={val}
                                    readOnly={!canEdit}
                                    rowIndex={idx}
                                    colIndex={dIdx}
                                    onChange={(newVal) => handleShiftChange(emp, day, newVal)}
                                  />
                                </td>
                              );
                            })}

                            {/* Tổng Giờ */}
                            <td className={`min-w-[64px] w-[64px] text-center font-black text-xs border-r border-slate-300 ${
                              isPTOvertimed 
                                ? 'bg-red-100 text-red-700' 
                                : (totalH > 0 ? 'text-blue-700 bg-slate-50' : 'text-slate-400 bg-slate-50')
                            }`}>
                              {isPTOvertimed && <span>⚠️ </span>}
                              <span>{totalH}h</span>
                            </td>

                            {/* Số Ca */}
                            <td className="min-w-[56px] w-[56px] text-center font-bold text-xs text-slate-700 bg-slate-50">
                              {totalShifts} ca
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}