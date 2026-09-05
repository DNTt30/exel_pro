import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { SHIFTS } from '../../data/initialData';
import { Download, Printer, Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Clock, Sparkles, Zap, RotateCcw, LayoutGrid, Table, MapPin, Sun, Moon, Coffee, ArrowRightLeft } from 'lucide-react';

import ShiftInput from '../../components/ShiftInput';
import { useGroupedEmployees } from '../../hooks/useGroupedEmployees';
import { exportScheduleToExcel } from '../../utils/excelExport';
import { WEEK_DAYS, DAY_FULL_NAMES, listNearbyWeeks } from '../../data/constants';
import { normalizeShift, getShiftHours } from '../../utils/shiftHelper';
import { getStoreLabel, isSupportAssignment, getSwapsForWeek, getSwapBadgeForDay } from '../../utils/scheduleAnnotations';
import ShiftSwapModal from '../../components/modals/ShiftSwapModal';
import ShiftSwapListModal from '../../components/modals/ShiftSwapListModal';
import ShiftSuggestionModal from '../../components/modals/ShiftSuggestionModal';
import { useShallow } from 'zustand/react/shallow';
import { visibleDeptIds } from '../../utils/dataScope';
import { toast } from '../../components/ui/toastStore';
import { weekRecordKey } from '../../utils/scheduleWeek';

// Ô lịch / mảng trống dùng chung — giữ tham chiếu ổn định cho useMemo & React.memo
const EMPTY_SCHED = {};

export default function EmployeeSchedule() {
  const { user, schedule, updateShift, updateEmployeeWeeklyShifts, currentWeek, setCurrentWeek, shiftSwaps, stores, scheduleWeeks, employees } = useStore(useShallow((s) => ({ user: s.user, schedule: s.schedule, updateShift: s.updateShift, updateEmployeeWeeklyShifts: s.updateEmployeeWeeklyShifts, currentWeek: s.currentWeek, setCurrentWeek: s.setCurrentWeek, shiftSwaps: s.shiftSwaps, stores: s.stores, scheduleWeeks: s.scheduleWeeks, employees: s.employees })));
  const weekSchedule = schedule[currentWeek] || EMPTY_SCHED;

  const [search] = useState('');
  const [filterOnlyMe] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving'
  const [displayView, setDisplayView] = useState('card'); // 'card' (Lịch thẻ cá nhân) hoặc 'table' (Bảng tính toàn CH)
  const visibleDepts = useMemo(() => visibleDeptIds(user, stores, employees), [user, stores, employees]);
  const [viewDept, setViewDept] = useState(''); // '' = mặc định ALL nếu có nhiều CH cùng SM, hoặc CH của mình
  const activeDept = viewDept || (visibleDepts.length > 1 ? 'ALL' : (user?.dept || ''));
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showSwapListModal, setShowSwapListModal] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);

  const pendingMySwapsCount = useMemo(() => {
    return (shiftSwaps || []).filter(s => s.toEmpId === user?.id && s.status === 'pending_partner').length;
  }, [shiftSwaps, user?.id]);

  const myDept = user?.dept || '';
  const currentWeekStatus = (scheduleWeeks || {})[weekRecordKey(activeDept === 'ALL' ? myDept : activeDept, currentWeek)]?.status || 'draft';
  const isDraft = currentWeekStatus !== 'approved';

  // 1. Ngày hiển thị cố định theo Tuần (T2 -> CN)
  const activeDays = WEEK_DAYS;

  // 3. Nhóm nhân viên theo CH đang xem (nếu 'ALL' hiển thị toàn bộ các CH cùng SM)
  const groupedEmps = useGroupedEmployees(search, activeDept, 'ALL', weekSchedule);

  // 4. Lịch của nhân viên đăng nhập
  const mySched = weekSchedule[user?.id] || EMPTY_SCHED;

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
      toast.error('Tuần này đã qua thời hạn đăng ký / chỉnh sửa. Bạn chỉ có thể đăng ký ca cho các tuần sau.');
      return;
    }
    setSaveStatus('saving');
    await updateShift(currentWeek, user.id, day, value);
    setTimeout(() => setSaveStatus('saved'), 400);
  }, [currentWeek, updateShift, user?.id, isFutureWeek]);

  // 8. Đăng ký nhanh cả tuần mẫu (Gom thành 1 request duy nhất)
  const handleQuickRegister = async (shiftCode) => {
    if (!isFutureWeek) {
      toast.error('Tuần này đã qua thời hạn đăng ký / chỉnh sửa. Bạn chỉ có thể đăng ký ca cho các tuần sau.');
      return;
    }
    setSaveStatus('saving');
    const shiftsMap = {};
    for (let i = 0; i < WEEK_DAYS.length; i++) {
      const day = WEEK_DAYS[i];
      shiftsMap[day] = (day === 'CN' && shiftCode !== 'off') ? 'off' : shiftCode;
    }
    await updateEmployeeWeeklyShifts(currentWeek, user.id, shiftsMap);
    setTimeout(() => setSaveStatus('saved'), 400);
  };

  // 8b. Áp dụng lịch gợi ý thông minh (1 request duy nhất)
  const handleApplySuggestion = async (suggestedShifts) => {
    if (!isFutureWeek) {
      toast.error('Tuần này đã qua thời hạn đăng ký / chỉnh sửa. Bạn chỉ có thể đăng ký ca cho các tuần sau.');
      return;
    }
    setSaveStatus('saving');
    await updateEmployeeWeeklyShifts(currentWeek, user.id, suggestedShifts);
    setTimeout(() => setSaveStatus('saved'), 400);
    toast.success('Đã áp dụng lịch gợi ý thành công!');
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

  const storeLabel = (id) => getStoreLabel(stores, id);

  const mySwapsThisWeek = useMemo(
    () => getSwapsForWeek(shiftSwaps, user?.id, currentWeek),
    [shiftSwaps, currentWeek, user?.id]
  );

  const swapBadgeForDay = (dayKey) => getSwapBadgeForDay(mySwapsThisWeek, user?.id, dayKey);

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
      const isSupport = isSupportAssignment(rawVal, myDept);
      const swapInfo = getSwapBadgeForDay(mySwapsThisWeek, user?.id, dayKey);

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
        isSupport,
        swapInfo,
        isOff,
        shiftInfo,
        hours,
        rawVal
      };
    });
  }, [currentWeek, mySched, myDept, mySwapsThisWeek, user?.id]);

  const todayCard = useMemo(
    () => weekDaysCardData.find(c => c.isToday) || null,
    [weekDaysCardData]
  );

  const supportDaysThisWeek = useMemo(
    () => weekDaysCardData.filter(c => c.isSupport),
    [weekDaysCardData]
  );

  const swapDaysThisWeek = useMemo(
    () => weekDaysCardData.filter(c => c.swapInfo),
    [weekDaysCardData]
  );

  const swapBadgeClass = (swapInfo) =>
    swapInfo?.pending
      ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
      : 'bg-emerald-50 text-emerald-800 border-emerald-200';

  const handleExportExcel = () => {
    exportScheduleToExcel({
      currentWeek,
      deptName: myDept,
      groupedEmps,
      weekSchedule,
      userName: user?.name
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
      <ShiftSuggestionModal
        isOpen={showSuggestionModal}
        onClose={() => setShowSuggestionModal(false)}
        emp={user}
        currentWeek={currentWeek}
        onApply={handleApplySuggestion}
      />
      
      {/* Top Toolbar */}
      <div className="print:hidden">
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          
          {/* Left: View Switcher & Shift Swap Action */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full pb-0.5 sm:pb-0 flex-nowrap sm:flex-wrap">
            {/* Tab View Switcher */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 shadow-inner flex-shrink-0">
              <button
                type="button"
                onClick={() => setDisplayView('card')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  displayView === 'card' 
                    ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid size={14} />
                <span>Lịch của tôi</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayView('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  displayView === 'table' 
                    ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table size={14} />
                <span>Toàn cửa hàng</span>
              </button>
            </div>

            {/* Button: Đổi ca */}
            <button
              type="button"
              onClick={() => setShowSwapModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex-shrink-0 whitespace-nowrap"
              title="Gửi yêu cầu đổi ca cho đồng nghiệp"
            >
              <RotateCcw size={13} className="text-indigo-600" />
              <span>Đổi ca</span>
            </button>

            {/* Button: Đơn đổi ca */}
            <button
              type="button"
              onClick={() => setShowSwapListModal(true)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex-shrink-0 whitespace-nowrap"
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
                  const list = listNearbyWeeks();
                  if (!list.some(item => item.key === currentWeek)) {
                    const parts = currentWeek.split('-').map(Number);
                    const d = new Date(parts[0], parts[1] - 1, parts[2]);
                    list.push({ key: currentWeek, offset: null, startDate: d, endDate: new Date(d.getTime() + 6 * 86400000), tag: 'Tuần đã chọn' });
                    list.sort((a, b) => a.startDate - b.startDate);
                  }
                  return list.map(item => {
                    const wStart = item.startDate;
                    const wEnd = item.endDate || new Date(wStart.getTime() + 6 * 86400000);
                    const startStr = `${String(wStart.getDate()).padStart(2, '0')}/${String(wStart.getMonth() + 1).padStart(2, '0')}`;
                    const endStr = `${String(wEnd.getDate()).padStart(2, '0')}/${String(wEnd.getMonth() + 1).padStart(2, '0')}`;
                    return <option key={item.key} value={item.key}>{item.tag} ({startStr} → {endStr})</option>;
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
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 px-3 sm:px-4 py-2 border-b border-emerald-200 text-[11px] text-slate-700 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-600 text-white rounded-md font-extrabold text-[11px] shadow-2xs flex-shrink-0">
                  <Sparkles size={12} /> ĐANG MỞ ĐĂNG KÝ CA LÀM
                </span>
                <span className="text-slate-700 font-semibold hidden md:inline">
                  Chọn ca làm việc cho tuần sau hoặc bấm chọn nhanh mẫu:
                </span>
              </div>

              {/* Quick Template Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-0.5 flex-nowrap sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowSuggestionModal(true)}
                  className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold text-[10px] transition-all shadow-xs flex items-center gap-1 cursor-pointer flex-shrink-0 whitespace-nowrap"
                  title="Mở trợ lý gợi ý ca làm việc tự động theo nguyện vọng"
                >
                  <Sparkles size={11} className="text-amber-300" />
                  <span>✨ Gợi ý ca cho tôi</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRegister('6-14')}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[10px] transition-all shadow-2xs cursor-pointer flex-shrink-0 whitespace-nowrap"
                  title="Đăng ký ca 6-14 từ T2 đến T7, CN nghỉ"
                >
                  + Ca 6-14
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRegister('14-22')}
                  className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg font-bold text-[10px] transition-all shadow-2xs cursor-pointer flex-shrink-0 whitespace-nowrap"
                  title="Đăng ký ca 14-22 từ T2 đến T7, CN nghỉ"
                >
                  + Ca 14-22
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRegister('10-18')}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold text-[10px] transition-all shadow-2xs cursor-pointer flex-shrink-0 whitespace-nowrap"
                  title="Đăng ký ca 10-18 từ T2 đến T7, CN nghỉ"
                >
                  + Ca 10-18
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRegister('off')}
                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold text-[10px] flex items-center gap-0.5 transition-colors cursor-pointer flex-shrink-0 whitespace-nowrap"
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

      <div className="bg-blue-50/50 p-3 sm:px-5 sm:py-3 border-b border-blue-100 flex flex-col gap-1 text-[11px] text-blue-900">
        <div className="font-bold flex items-center gap-1.5"><Sparkles size={14} className="text-blue-600" /> QUY TẮC & TRẠNG THÁI XẾP LỊCH:</div>
        <ul className="list-disc list-inside space-y-1 ml-1 opacity-90 text-[10.5px]">
          <li><strong>Nền trắng (không màu):</strong> Ca đăng ký / Lịch nháp. Đang chờ Quản lý duyệt.</li>
          <li><strong>Có màu nền theo ca:</strong> Lịch đã được Quản lý CHỐT & BAN HÀNH chính thức.</li>
          <li><strong>Ưu tiên AI tự động xếp:</strong> Giữ nguyên lịch đăng ký ➔ Ưu tiên Full-time đạt chuẩn 48h ➔ Part-time lấp ca thiếu. Không ép Part-time dư giờ nếu cửa hàng không cần.</li>
        </ul>
      </div>

      {/* VIEW 1: LỊCH BIỂU THẺ CÁ NHÂN (CARD VIEW - TỐI ƯU MOBILE & TRỰC QUAN) */}
      {displayView === 'card' && (
        <div className="flex-1 overflow-auto p-3 sm:p-5 space-y-4">
          {/* Enhanced Personal Mini-Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Cột 1: Thông tin cá nhân & Hôm nay */}
            <div className="lg:col-span-1 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-sm">
                  {user?.name ? user.name.charAt(0) : 'U'}
                </div>
                <div>
                  <div className="font-black text-base text-slate-800 flex items-center gap-2">
                    <span>{user?.name}</span>
                    <span className="text-xs font-mono text-slate-400">({user?.id})</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    <span className="font-semibold text-blue-700">{myDept}</span> • {user?.role || user?.type || 'Nhân viên'}
                  </div>
                </div>
              </div>
              
              {/* Ca hôm nay */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-3">
                <div className="bg-blue-600 text-white p-1.5 rounded-lg"><Sun size={16} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-blue-800 uppercase mb-0.5">Ca làm hôm nay</div>
                  <div className="text-sm font-bold text-slate-700">
                    {!todayCard || todayCard.isOff
                      ? <span className="text-slate-500">Chưa xếp ca / OFF</span>
                      : <span className="text-blue-700">{todayCard.shift}</span>}
                  </div>
                  {todayCard?.isSupport && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-1.5 py-0.5">
                      <MapPin size={11} />
                      Hỗ trợ {storeLabel(todayCard.covering_store)}
                    </div>
                  )}
                  {todayCard?.swapInfo && (
                    <div className={`mt-1 inline-flex items-center gap-1 text-[11px] font-bold border rounded-lg px-1.5 py-0.5 ${swapBadgeClass(todayCard.swapInfo)}`}>
                      <ArrowRightLeft size={11} />
                      {todayCard.swapInfo.label}
                    </div>
                  )}
                  {!todayCard && (
                    <div className="text-[11px] text-slate-400 mt-1">Đang xem tuần khác — không có “hôm nay”.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Cột 2: Tiến độ giờ làm & Thống kê */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-center">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5"><Clock size={16} className="text-slate-500"/> Tiến độ tuần này</h3>
                <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 rounded-md text-slate-600 border border-slate-200">
                  {isFutureWeek ? 'Đang mở đăng ký ✍️' : 'Đã chốt lịch 🔒'}
                </span>
              </div>
              
              {/* Thanh tiến độ */}
              <div className="mb-4">
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-600">Đã đăng ký: <span className="text-blue-700 text-sm">{myTotalHours}h</span> <span className="text-slate-400 font-normal">({myTotalShifts} ca)</span></span>
                  <span className="text-slate-400">Định mức: {isPT ? '16h-23h' : '48h'}</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200/50">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isWeekOver23 ? 'bg-red-500' : (isWeekUnder16 || isFTUnder48) ? 'bg-amber-400' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (myTotalHours / (isPT ? 23 : 48)) * 100)}%` }}
                  ></div>
                </div>
                <div className="text-[11px] font-medium text-slate-500 mt-2 flex justify-between">
                  <span>Trạng thái: 
                    <span className={`ml-1 font-bold ${isWeekOver23 ? 'text-red-600' : (isWeekUnder16 || isFTUnder48) ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {isWeekOver23 ? 'Vượt định mức tối đa!' : (isWeekUnder16 || isFTUnder48 ? 'Chưa đủ giờ chuẩn' : 'Tuyệt vời, đạt định mức')}
                    </span>
                  </span>
                </div>
              </div>

              {/* Quick Actions / Alerts */}
              <div className="flex items-center gap-2 mt-auto">
                {pendingMySwapsCount > 0 ? (
                  <button onClick={() => setShowSwapListModal(true)} className="flex-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer hover:bg-amber-100 transition-colors shadow-sm">
                    <AlertTriangle size={14}/> Bạn có {pendingMySwapsCount} đơn đổi ca chờ xác nhận!
                  </button>
                ) : (
                  <div className="flex-1 bg-slate-50 border border-slate-100 text-slate-500 text-xs font-medium py-2 px-3 rounded-xl flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500"/> Không có đơn từ nào tồn đọng
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tóm tắt tuần: đổi ca + hỗ trợ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <CalendarIcon size={15} className="text-slate-500" />
                Tóm tắt tuần: đổi ca & hỗ trợ
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">Hỗ trợ CH</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">Đã đổi ca</span>
                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">Chờ duyệt</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {weekDaysCardData.map((card) => (
                <div
                  key={`strip-${card.dayKey}`}
                  className={`rounded-xl border px-1 py-1.5 text-center min-w-0 ${
                    card.isToday
                      ? 'border-blue-400 bg-blue-50'
                      : card.swapInfo?.pending
                        ? 'border-indigo-200 bg-indigo-50/60'
                        : card.swapInfo
                          ? 'border-emerald-200 bg-emerald-50/60'
                          : card.isSupport
                            ? 'border-amber-200 bg-amber-50/70'
                            : 'border-slate-100 bg-slate-50'
                  }`}
                  title={[
                    card.dayFullName,
                    card.isOff ? 'OFF' : card.shift,
                    card.isSupport ? `Hỗ trợ ${storeLabel(card.covering_store)}` : '',
                    card.swapInfo?.label || ''
                  ].filter(Boolean).join(' · ')}
                >
                  <div className="text-[10px] font-black text-slate-700">{card.dayKey}</div>
                  <div className="text-[8.5px] font-mono text-slate-400 font-semibold">{card.dateFormatted.slice(0, 5)}</div>
                  <div className="text-[10px] font-bold text-slate-800 truncate mt-0.5">
                    {card.isOff ? 'OFF' : (card.shift || '—')}
                  </div>
                  {card.isSupport && (
                    <div className="text-[9px] font-black text-amber-700 truncate">→ {card.covering_store}</div>
                  )}
                  {card.swapInfo && (
                    <div className={`text-[9px] font-black truncate ${card.swapInfo.pending ? 'text-indigo-700' : 'text-emerald-700'}`}>
                      ⇄ {card.swapInfo.kind === 'swap-out' ? 'đi' : card.swapInfo.kind === 'swap-in' ? 'nhận' : 'đổi'}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {supportDaysThisWeek.length === 0 && swapDaysThisWeek.length === 0 ? (
              <p className="text-[11px] text-slate-500">Tuần này chưa có ngày đổi ca hoặc đi hỗ trợ cửa hàng khác.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {supportDaysThisWeek.map((card) => (
                  <div key={`sup-${card.dayKey}`} className="text-[11px] font-semibold text-amber-800">
                    {card.dayFullName}: hỗ trợ {storeLabel(card.covering_store)}
                    {card.shift && !card.isOff ? ` · ca ${card.shift}` : ''}
                  </div>
                ))}
                {swapDaysThisWeek.map((card) => (
                  <div
                    key={`sw-${card.dayKey}`}
                    className={`text-[11px] font-semibold ${card.swapInfo.pending ? 'text-indigo-800' : 'text-emerald-800'}`}
                  >
                    {card.dayFullName}: {card.swapInfo.label}
                  </div>
                ))}
              </div>
            )}
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
                      : card.swapInfo?.pending
                        ? 'bg-white border-indigo-300 ring-1 ring-indigo-200'
                        : card.swapInfo
                          ? 'bg-white border-emerald-300 ring-1 ring-emerald-200'
                          : card.isSupport
                            ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-200'
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
                    <div className="flex flex-col items-end gap-0.5">
                      {card.isToday && (
                        <span className="px-2 py-0.5 bg-white text-blue-700 rounded-full font-black text-[9px] uppercase tracking-wider shadow-xs">
                          Hôm nay
                        </span>
                      )}
                      {card.isSupport && (
                        <span className={`px-1.5 py-0.5 rounded-full font-black text-[8px] uppercase tracking-wide ${
                          card.isToday ? 'bg-amber-200 text-amber-900' : 'bg-amber-100 text-amber-800'
                        }`}>
                          Hỗ trợ
                        </span>
                      )}
                      {card.swapInfo && (
                        <span className={`px-1.5 py-0.5 rounded-full font-black text-[8px] uppercase tracking-wide ${
                          card.swapInfo.pending
                            ? (card.isToday ? 'bg-indigo-200 text-indigo-900' : 'bg-indigo-100 text-indigo-800')
                            : (card.isToday ? 'bg-emerald-200 text-emerald-900' : 'bg-emerald-100 text-emerald-800')
                        }`}>
                          {card.swapInfo.pending ? 'Chờ đổi' : 'Đổi ca'}
                        </span>
                      )}
                    </div>
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
                          className={`p-2.5 rounded-xl font-black text-sm text-center shadow-2xs ${isDraft ? 'border border-slate-300 border-dashed' : ''}`}
                          style={!isDraft ? {
                            backgroundColor: card.shiftInfo?.bg || '#bfdbfe',
                            color: card.shiftInfo?.text || '#1e40af'
                          } : {
                            backgroundColor: '#ffffff',
                            color: '#475569'
                          }}
                        >
                          {card.shift}
                        </div>

                        {/* Store Location */}
                        <div className={`flex items-start gap-1 mt-2 text-[11px] font-semibold ${card.isSupport ? 'text-amber-800' : 'text-slate-600'}`}>
                          <MapPin size={12} className={`mt-0.5 shrink-0 ${card.isSupport ? 'text-amber-600' : 'text-slate-400'}`} />
                          <span>
                            {card.isSupport
                              ? `Hỗ trợ: ${storeLabel(card.covering_store)}`
                              : `Tại: ${storeLabel(myDept) || myDept}`}
                          </span>
                        </div>
                      </div>
                    )}

                    {(card.isSupport || card.swapInfo) && (
                      <div className="space-y-1">
                        {card.isSupport && card.isOff && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-1.5 py-1">
                            <MapPin size={11} />
                            Hỗ trợ {storeLabel(card.covering_store)}
                          </div>
                        )}
                        {card.swapInfo && (
                          <div className={`flex items-center gap-1 text-[10px] font-bold border rounded-lg px-1.5 py-1 ${swapBadgeClass(card.swapInfo)}`}>
                            <ArrowRightLeft size={11} className="shrink-0" />
                            <span className="leading-tight">{card.swapInfo.label}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Actions (Khi lịch đã chốt) */}
                    {!canEdit && !card.isOff && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 mt-auto">
                        <button
                          onClick={() => setShowSwapModal(true)}
                          className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-100 transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                        >
                          <RotateCcw size={10} /> Đổi ca
                        </button>
                        <button
                          onClick={() => toast.info("Vui lòng truy cập thẻ 'Yêu cầu C&B' để báo lỗi chấm công cho ca này!")}
                          className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold rounded-lg border border-red-100 transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                        >
                          <AlertTriangle size={10} /> Báo lỗi
                        </button>
                      </div>
                    )}

                    {/* Interactive Shift Changer (Khi lịch đang mở) */}
                    {canEdit && (
                      <div className="pt-2 border-t border-slate-100 mt-auto">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Đăng ký ca ngày này:</label>
                        <select
                          className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
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
                </div>);
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: BẢNG TÍNH EXCEL TOÀN CỬA HÀNG (TABLE VIEW) */}
      {displayView === 'table' && visibleDepts.length > 1 && (
        <div className="print:hidden px-3 pt-2 pb-1.5 flex flex-wrap items-center gap-1.5 bg-slate-100 border-b border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 mr-1">🏬 Cửa hàng:</span>
          <button
            onClick={() => setViewDept('ALL')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
              activeDept === 'ALL'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
            }`}
            title="Xem toàn bộ lịch các cửa hàng trong cùng cụm quản lý của SM"
          >
            🏢 Tất cả cửa hàng (Cụm SM)
          </button>
          {visibleDepts.map(id => (
            <button key={id}
              onClick={() => setViewDept(id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                activeDept === id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
              }`}
              title={`Xem lịch ${getStoreLabel(stores, id)}`}
            >
              {getStoreLabel(stores, id)}
            </button>
          ))}
        </div>
      )}

      {displayView === 'table' && (
        <div className="flex-1 overflow-auto bg-slate-100 p-2 relative print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:h-auto">
          {(supportDaysThisWeek.length > 0 || swapDaysThisWeek.length > 0) && (
            <div className="print:hidden mb-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] flex flex-wrap gap-x-4 gap-y-1">
              {supportDaysThisWeek.map((card) => (
                <span key={`t-sup-${card.dayKey}`} className="font-bold text-amber-800">
                  {card.dayKey}: hỗ trợ {card.covering_store}
                </span>
              ))}
              {swapDaysThisWeek.map((card) => (
                <span key={`t-sw-${card.dayKey}`} className={`font-bold ${card.swapInfo.pending ? 'text-indigo-800' : 'text-emerald-800'}`}>
                  {card.dayKey}: ⇄ {card.swapInfo.label}
                </span>
              ))}
            </div>
          )}
          <div className="bg-white shadow border border-slate-300 inline-block min-w-full print:shadow-none print:border-none print:w-full print:block">
            <table className="excel-table print:w-full">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-300">
                  <th className="hidden md:table-cell min-w-[48px] w-[48px] max-w-[48px] text-center font-bold text-slate-700 text-xs md:sticky left-0 z-20 bg-slate-200 border-r border-slate-300">STT</th>
                  <th className="hidden md:table-cell min-w-[96px] w-[96px] max-w-[96px] text-center font-bold text-slate-700 text-xs md:sticky z-20 bg-slate-200 border-r border-slate-300" style={{ left: '48px' }}>Mã NV</th>
                  <th className="min-w-[150px] md:min-w-[200px] w-[150px] md:w-[200px] max-w-[150px] md:max-w-[200px] text-left font-bold text-slate-700 text-xs sticky z-30 bg-slate-200 border-r border-slate-300 px-3 left-0 md:left-[144px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                    Họ và Tên
                  </th>
                  <th className="hidden md:table-cell min-w-[80px] w-[80px] max-w-[80px] text-center font-bold text-slate-700 text-xs border-r border-slate-300">Vị trí</th>
                  <th className="hidden lg:table-cell min-w-[80px] w-[80px] max-w-[80px] text-center font-bold text-slate-700 text-xs border-r border-slate-300">Cửa hàng</th>
                  
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
                        className={`min-w-[52px] w-[52px] sm:min-w-[60px] sm:w-[60px] sm:max-w-[60px] border-r border-slate-300 py-1 transition-colors ${
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
                              const swapInfo = isMe ? swapBadgeForDay(day) : null;

                              return (
                                <td key={day} className={`p-0 relative border-r border-slate-300 min-w-[64px] w-[64px] max-w-[64px] h-8 text-center align-middle ${
                                  canEdit ? 'bg-white hover:ring-2 hover:ring-emerald-400 cursor-pointer' : ''
                                }`} title={swapInfo ? swapInfo.label : undefined}>
                                  <ShiftInput
                                    value={val}
                                    rawValue={val}
                                    readOnly={!canEdit}
                                    rowIndex={idx}
                                    colIndex={dIdx}
                                    onChange={(newVal) => handleShiftChange(emp, day, newVal)}
                                  />
                                  {swapInfo && (
                                    <span
                                      className={`pointer-events-none absolute top-0 right-0 text-[8px] font-black leading-none px-0.5 rounded-bl ${
                                        swapInfo.pending ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
                                      }`}
                                    >
                                      ⇄
                                    </span>
                                  )}
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