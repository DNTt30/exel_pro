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
  Save
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ShiftInput from '../../components/ShiftInput';
import { useGroupedEmployees } from '../../hooks/useGroupedEmployees';
import { exportScheduleToExcel } from '../../utils/excelExport';

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function EmployeeSchedule() {
  const { user, schedule, updateShift, currentWeek, setCurrentWeek, employees } = useStore();
  const weekSchedule = schedule[currentWeek] || {};

  const [search, setSearch] = useState('');
  const [filterOnlyMe, setFilterOnlyMe] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving'

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
    return `${currentMonday.getFullYear()}-${currentMonday.getMonth() + 1}-${currentMonday.getDate()}`;
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

  // 9. Tính tổng giờ cá nhân
  const myTotalHours = useMemo(() => {
    let total = 0;
    activeDays.forEach(d => {
      const s = mySched[d];
      if (s && s !== 'off') {
        let actual = s.includes('_') ? s.split('_')[0] : s;
        if (actual !== 'off') {
          if (SHIFTS[actual]) total += SHIFTS[actual].hours;
          else {
            const match = actual.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
            if (match) {
              let start = parseInt(match[1], 10);
              let end = parseInt(match[2], 10);
              if (end < start) end += 24;
              total += (end - start);
            }
          }
        }
      }
    });
    return total;
  }, [mySched, activeDays]);

  const isPT = user?.type === 'PARTTIME' || user?.type === 'STPT' || (user?.role && user?.role.includes('PT'));
  const isWeekOver23 = isPT && myTotalHours > 23;
  const isWeekUnder16 = isPT && myTotalHours > 0 && myTotalHours < 16;

  // Xuất file Excel chuẩn bảng biểu, có kẻ ô, màu sắc và không bị lỗi đổi ngày tháng
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
      
      {/* Top Toolbar (Full-Width Matching Admin) */}
      <div className="print:hidden">
        <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          
          {/* Left: Search & Store & Toggle */}
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

            {/* Store Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
              <Building2 size={14} className="text-blue-600" />
              <span>Cửa hàng: <strong>{myDept}</strong></span>
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
              {filterOnlyMe ? '✓ Đang xem chỉ mình tôi' : '👁️ Chỉ xem lịch của tôi'}
            </button>
          </div>

          {/* Right: Week Controls & Quick Next Week Jump */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Week Selector */}
            <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 p-0.5">
              <button 
                onClick={() => {
                  const parts = currentWeek.split('-');
                  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
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
                    // Chỉ hiển thị gọn gàng 5 tuần: 1 tuần trước, Tuần này, và 3 tuần kế tiếp để đăng ký
                    for (let i = -1; i <= 3; i++) {
                      const d = new Date(currentMonday);
                      d.setDate(currentMonday.getDate() + (i * 7));
                      const wKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      list.push({
                        key: wKey,
                        offset: i,
                        startDate: d
                      });
                    }

                    // Nếu đang xem một tuần lịch sử khác, vẫn hiển thị tuần đó
                    if (!list.some(item => item.key === currentWeek)) {
                      const parts = currentWeek.split('-');
                      if (parts.length === 3) {
                        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                        d.setHours(0, 0, 0, 0);
                        const wKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        list.push({
                          key: wKey,
                          offset: null,
                          startDate: d
                        });
                      }
                    }

                    list.sort((a, b) => a.startDate - b.startDate);

                    return list.map(item => {
                      const wStart = item.startDate;
                      const wEnd = new Date(wStart);
                      wEnd.setDate(wStart.getDate() + 6);

                      const startStr = `${wStart.getDate().toString().padStart(2, '0')}/${(wStart.getMonth() + 1).toString().padStart(2, '0')}`;
                      const endStr = `${wEnd.getDate().toString().padStart(2, '0')}/${(wEnd.getMonth() + 1).toString().padStart(2, '0')}`;
                      const yearStr = wStart.getFullYear();

                      let label = `Tuần: ${startStr} → ${endStr}/${yearStr}`;
                      if (item.offset === 0) {
                        label = `📍 Tuần Này (${startStr} → ${endStr}/${yearStr})`;
                      } else if (item.offset === 1) {
                        label = `⚡ Tuần Sau (${startStr} → ${endStr}/${yearStr})`;
                      } else if (item.offset === -1) {
                        label = `Tuần Trước (${startStr} → ${endStr}/${yearStr})`;
                      } else if (item.offset > 1) {
                        label = `Tuần (+${item.offset}): ${startStr} → ${endStr}/${yearStr}`;
                      }

                      return (
                        <option key={item.key} value={item.key}>
                          {label}
                        </option>
                      );
                    });
                  })()}
                </select>

                <button 
                  onClick={() => {
                    const parts = currentWeek.split('-');
                    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
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

              {/* Quick Next Week Jump Button */}
              <button
                onClick={() => setCurrentWeek(nextWeekDateStr)}
                className="btn bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs py-1 px-2.5 rounded-lg shadow-2xs font-bold transition-all flex items-center gap-1"
                title="Chuyển sang tuần sau để đăng ký ca làm việc"
              >
                <Zap size={13} className="text-amber-500" />
                <span>Đăng ký Tuần Sau ↗</span>
              </button>

              <button className="btn btn-outline text-xs py-1 px-2.5 rounded-lg font-semibold hover:text-emerald-700 hover:border-emerald-300" onClick={handleExportExcel} title="Xuất file Excel có đầy đủ kẻ bảng và màu sắc">
                <Download size={13} className="text-emerald-600" /> <span className="hidden md:inline">Xuất Excel</span>
              </button>
            <button className="btn btn-outline text-xs py-1 px-2.5 rounded-lg font-semibold hover:text-blue-700" onClick={handlePrint} title="In hoặc lưu PDF">
              <Printer size={13} /> <span className="hidden md:inline">In PDF</span>
            </button>
          </div>
        </div>

        {/* Quick Shift Registration Toolbar Bar (Chỉ hiển thị khi chuyển sang TUẦN SAU để đăng ký ca) */}
        {isFutureWeek && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 px-4 py-2 border-b border-emerald-200 text-[11px] text-slate-700 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-600 text-white rounded-md font-extrabold text-[11px] shadow-2xs">
                <Sparkles size={12} /> ĐANG MỞ ĐĂNG KÝ CA LÀM
              </span>
              <span className="text-slate-700 font-semibold">
                Click vào các ô của bạn <strong>(Tôi)</strong> để chọn ca hoặc bấm đăng ký nhanh:
              </span>

              {/* Quick Template Buttons */}
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  onClick={() => handleQuickRegister('6-14')}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[10px] transition-all shadow-2xs cursor-pointer"
                  title="Đăng ký ca 6-14 từ T2 đến T7, CN nghỉ"
                >
                  + Ca 6-14
                </button>
                <button
                  onClick={() => handleQuickRegister('14-22')}
                  className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg font-bold text-[10px] transition-all shadow-2xs cursor-pointer"
                  title="Đăng ký ca 14-22 từ T2 đến T7, CN nghỉ"
                >
                  + Ca 14-22
                </button>
                <button
                  onClick={() => handleQuickRegister('10-18')}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold text-[10px] transition-all shadow-2xs cursor-pointer"
                  title="Đăng ký ca 10-18 từ T2 đến T7, CN nghỉ"
                >
                  + Ca 10-18
                </button>
                <button
                  onClick={() => handleQuickRegister('off')}
                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold text-[10px] flex items-center gap-0.5 transition-colors cursor-pointer"
                  title="Xóa tất cả ca tuần này"
                >
                  <RotateCcw size={10} /> Đặt lại
                </button>
              </div>
            </div>

            {/* Auto-Save & Limit Status Indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-md border border-emerald-200">
                <span className={`w-2 h-2 rounded-full ${saveStatus === 'saving' ? 'bg-amber-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`}></span>
                <span className="text-[10px] font-bold text-slate-700">
                  {saveStatus === 'saving' ? 'Đang lưu...' : 'Cloud Auto-Saved'}
                </span>
              </div>

              {/* Limit Warning */}
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
                  Đã đăng ký: {myTotalHours}h
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-4 pb-2 border-b border-slate-300">
        <h1 className="text-xl font-black uppercase text-slate-900 tracking-wide">
          BẢNG PHÂN CÔNG LỊCH LÀM VIỆC - TUẦN {currentWeek}
        </h1>
        <div className="flex justify-between items-center text-xs text-slate-600 mt-1 px-2">
          <span>Cửa hàng: {myDept} | Nhân viên: {user?.name} ({user?.id})</span>
          <span>Ngày in: {new Date().toLocaleDateString('vi-VN')}</span>
          <span>Đơn vị: Chuỗi Cửa Hàng OFC</span>
        </div>
      </div>

      {/* Full-Width Excel Spreadsheet Area */}
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

                  const parts = currentWeek.split('-');
                  if (parts.length === 3) {
                    const weekStartDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    const dateObj = new Date(weekStartDate);
                    dateObj.setDate(weekStartDate.getDate() + idx);
                    const dNum = dateObj.getDate().toString().padStart(2, '0');
                    const mNum = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                    dateStr = `${dNum}/${mNum}`;
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
                    {/* Header Cửa Hàng */}
                    <tr className="bg-slate-100 font-bold border-b border-slate-300">
                      <td colSpan={activeDays.length + 7} className="px-4 py-1.5 text-blue-800 text-xs sticky left-0 z-10 bg-slate-100">
                        🏬 CỬA HÀNG: {dept} ({filteredList.length} nhân sự)
                      </td>
                    </tr>

                    {/* Danh sách nhân viên */}
                    {filteredList.map((emp, idx) => {
                      const empSched = weekSchedule[emp.id] || {};
                      const isMe = emp.id === user?.id;

                      let totalH = 0;
                      let totalShifts = 0;
                      activeDays.forEach(d => {
                        const s = empSched[d];
                        if (s && s !== 'off') {
                          let actual = s.includes('_') ? s.split('_')[0] : s;
                          if (actual !== 'off') {
                            totalShifts++;
                            if (SHIFTS[actual]) totalH += SHIFTS[actual].hours;
                            else {
                              const match = actual.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
                              if (match) {
                                let start = parseInt(match[1], 10);
                                let end = parseInt(match[2], 10);
                                if (end < start) end += 24;
                                totalH += (end - start);
                              }
                            }
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
                                isFutureWeek ? (
                                  <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[10px] font-bold">
                                    Tôi (Đang mở đăng ký)
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 bg-slate-500 text-white rounded text-[10px] font-bold">
                                    Tôi (Đã chốt 🔒)
                                  </span>
                                )
                              )}
                            </div>
                          </td>
                          <td className="text-center text-xs text-slate-600 border-r border-slate-300">
                            {emp.role || emp.type}
                          </td>
                          <td className="text-center text-xs font-semibold text-blue-700 border-r border-slate-300">
                            {emp.dept}
                          </td>

                          {/* 7 Ngày / 31 Ngày Ô Ca Làm Việc - Nhân viên CHỈ ĐƯỢC SỬA ở tuần tương lai */}
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

    </div>
  );
}