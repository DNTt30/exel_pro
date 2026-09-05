import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { useGroupedEmployees } from '../../hooks/useGroupedEmployees';
import TimesheetTable from '../../components/timesheet/TimesheetTable';
import { Download, Printer, Pencil, Check, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import Toolbar from '../../components/Toolbar';
import { toast } from '../../components/ui/toastStore';
import { exportTimesheetToExcel } from '../../utils/excelExport';
import { downloadPayrollXlsx } from '../../utils/exportPayroll';
import { getPayrollCycleDates, getPayrollCycleFromWeek } from '../../utils/dateHelper';
import { getShiftCode, getShiftHours } from '../../utils/shiftHelper';
import { canPickStore } from '../../lib/authSession';
import { useShallow } from 'zustand/react/shallow';

export default function Timesheet() {
  const { user, currentWeek, schedule, ensureWeeksLoaded, setCurrentWeek } = useStore(useShallow((s) => ({ user: s.user, currentWeek: s.currentWeek, schedule: s.schedule, ensureWeeksLoaded: s.ensureWeeksLoaded, setCurrentWeek: s.setCurrentWeek })));
  const attendance = useStore((s) => s.attendance);
  const loadAttendanceRange = useStore((s) => s.loadAttendanceRange);
  const saveAttendanceCell = useStore((s) => s.saveAttendanceCell);

  // Chế độ sửa CÔNG THỰC TẾ (nhập số giờ từ ezHR)
  const [editMode, setEditMode] = useState(false);

  const pickStore = canPickStore(user);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState(pickStore ? 'ALL' : user?.dept);
  const [filterRole, setFilterRole] = useState('ALL');
  // Nhan/xuat theo CH dang chon (Toolbar da gioi han pham vi sm_id)
  const effDept = pickStore ? filterDept : (filterDept || user?.dept);

  const payrollCycle = useMemo(() => getPayrollCycleFromWeek(currentWeek), [currentWeek]);
  const cycleDates = useMemo(
    () => getPayrollCycleDates(payrollCycle.year, payrollCycle.month),
    [payrollCycle]
  );
  const activeDays = useMemo(() => cycleDates.map(d => d.key), [cycleDates]);

  useEffect(() => {
    ensureWeeksLoaded(cycleDates.map(d => d.weekKey));
  }, [cycleDates, ensureWeeksLoaded]);

  // Tải công thực tế của cả chu kỳ (26 tháng trước -> 25)
  useEffect(() => {
    if (cycleDates.length >= 2) {
      loadAttendanceRange(cycleDates[0].fullDateStr, cycleDates[cycleDates.length - 1].fullDateStr);
    }
  }, [cycleDates, loadAttendanceRange]);

  const groupedEmps = useGroupedEmployees(search, filterDept, filterRole);

  // useCallback giữ tham chiếu ổn định để TimesheetRow (memo) bỏ qua render thừa
  const getDayValue = useCallback((empId, day) => {
    const cell = cycleDates.find(d => d.key === day);
    if (!cell) return '';
    const raw = schedule[cell.weekKey]?.[empId]?.[cell.dayKey];
    const code = getShiftCode(raw);
    if (!code || code === 'off') return 'OFF';
    const hours = getShiftHours(code);
    return hours > 0 ? String(hours) : code;
  }, [cycleDates, schedule]);

  // Đọc công thực tế: ưu tiên MÃ (AL/PL/UL/OFF), không thì số giờ; '' khi chưa có override
  const getActualValue = useCallback((empId, day) => {
    const cell = cycleDates.find(d => d.key === day);
    if (!cell) return '';
    const rec = attendance[cell.fullDateStr ? empId + '|' + cell.fullDateStr : ''];
    if (!rec) return '';
    if (rec.note && rec.note.trim() !== '') return rec.note.trim().toUpperCase();
    if (rec.actualHours !== null && rec.actualHours !== undefined && !isNaN(rec.actualHours)) {
      return String(rec.actualHours);
    }
    return '';
  }, [cycleDates, attendance]);

  const handleActualChange = useCallback(async (empId, day, raw) => {
    const cell = cycleDates.find(d => d.key === day);
    if (!cell || !cell.fullDateStr) return;
    try {
      const rawStr = String(raw ?? '').trim();
      const trimmed = rawStr.toUpperCase();
      const normalized = rawStr.replace(',', '.').toUpperCase();
      if (trimmed === '') {
        // Xóa override -> quay lại theo lịch xếp
        await saveAttendanceCell(empId, cell.fullDateStr, null, user?.id, '');
      } else if (trimmed === 'OFF') {
        // Chấm nghỉ ca: actualHours = 0, note = 'OFF'
        await saveAttendanceCell(empId, cell.fullDateStr, 0, user?.id, 'OFF');
      } else if (trimmed === '0' || trimmed === '0H' || normalized === '0' || normalized === '0H') {
        // Chấm 0 giờ công: actualHours = 0, note = ''
        await saveAttendanceCell(empId, cell.fullDateStr, 0, user?.id, '');
      } else if (/^[0-9]+(\.[0-9]+)?(H)?$/i.test(normalized)) {
        // Hỗ trợ số giờ lẻ thực tế từ ezHR9 (ví dụ: 7,84, 7.84, 8, 4.5, 7.84h...)
        const cleanNum = normalized.replace(/H$/i, '');
        const num = parseFloat(cleanNum);
        const rounded = Math.round(num * 100) / 100;
        await saveAttendanceCell(empId, cell.fullDateStr, rounded, user?.id, '');
      } else {
        // Mã chữ: AL (phép năm), PL (hưởng lương), UL (không lương), SL (ốm), CL (nghỉ bù)...
        await saveAttendanceCell(empId, cell.fullDateStr, null, user?.id, trimmed);
      }
    } catch (e) {
      toast.error('Không lưu được công: ' + e.message);
    }
  }, [cycleDates, saveAttendanceCell, user?.id]);

  const handlePrevMonth = () => {
    const parts = currentWeek.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 2, parseInt(parts[2], 10));
    setCurrentWeek(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const parts = currentWeek.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10));
    setCurrentWeek(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const overrideCount = Object.keys(attendance).filter(k => attendance[k] && attendance[k].actualHours > 0).length;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative print:bg-white print:block">
      <div className="print:hidden">
        <Toolbar 
          search={search} setSearch={setSearch}
          filterDept={filterDept} setFilterDept={setFilterDept}
          filterRole={filterRole} setFilterRole={setFilterRole}
          showWeekPicker={false}
          disableDeptFilter={false}
          rightActions={
            <>
              {/* Điều hướng Tháng */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs mr-2">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Tháng trước"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg min-w-[110px] text-center shadow-xs mx-1">
                  <span className="text-xs font-black text-slate-800">
                    Tháng {payrollCycle.month}/{payrollCycle.year}
                  </span>
                </div>
                <button 
                  onClick={handleNextMonth}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Tháng sau"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <button 
                className="btn btn-outline text-xs py-1.5 px-3 hover:text-emerald-700 hover:border-emerald-300 font-semibold flex items-center gap-1.5 cursor-pointer" 
                onClick={() => exportTimesheetToExcel({
                  currentWeek,
                  deptName: effDept === 'ALL' ? 'Toan_Bo_Cua_Hang' : effDept,
                  groupedEmps,
                  getDayValue,
                  activeDays,
                  filterOnlyMe: false,
                  currentUserId: user?.id,
                  cycleDates
                })}
                title="Xuất file Excel có đầy đủ bảng biểu và màu sắc"
              >
                <Download size={14} className="text-emerald-600" /> Xuất Excel
              </button>
              <button
                onClick={() => setEditMode(v => !v)}
                className={`text-xs py-1.5 px-3 rounded-lg font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  editMode
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-sm'
                    : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                }`}
                title="Nhập số giờ thực tế từ ezHR — ô nền vàng = ghi đè lịch xếp"
              >
                {editMode ? <Check size={14} /> : <Pencil size={14} />}
                {editMode ? `Đang sửa công (${overrideCount} ô)` : 'Sửa công thực tế'}
              </button>
              <button
                onClick={() => downloadPayrollXlsx({
                  cycleDates,
                  groupedEmps,
                  getDayValue,
                  getActualValue
                }, `OFC_CongLuong_Thang_${payrollCycle.month}_${payrollCycle.year}.xlsx`)}
                className="text-xs py-1.5 px-3 rounded-lg font-bold border bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Xuất bảng công lương đúng mẫu C&B (31 ngày 26→25 + cột tổng hợp)"
              >
                <FileSpreadsheet size={14} /> Xuất Công Lương C&B
              </button>
              <button className="btn btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer" onClick={() => window.print()}>
                <Printer size={14} /> In Bảng Công
              </button>
            </>
          }
        />
      </div>

      <div className="hidden print:block text-center mb-4 pb-2 border-b border-slate-300">
        <h1 className="text-xl font-black uppercase text-slate-900 tracking-wide">BẢNG TỔNG HỢP CÔNG & LƯƠNG THÁNG (26 - 25)</h1>
        <div className="flex justify-between items-center text-xs text-slate-600 mt-1 px-2">
          <span>{effDept !== 'ALL' ? `Cửa hàng: ${effDept}` : 'Toàn bộ chuỗi cửa hàng'}</span>
          <span>Ngày in: {new Date().toLocaleDateString('vi-VN')}</span>
          <span>Hệ thống GS25 OFC</span>
        </div>
      </div>

      {editMode && (
        <div className="print:hidden mx-3 mb-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <span className="font-bold text-amber-800">💡 Chế độ sửa công thực tế:</span>
            <span>Nhập số giờ thực tế từ ezHR9 (hỗ trợ cả số lẻ như <strong>7,84</strong> hoặc <strong>7.84</strong>, <strong>8</strong>, <strong>0</strong>) hoặc chữ <strong>OFF</strong> (nghỉ ca), <strong>AL</strong> (phép năm), <strong>PL</strong> (nghỉ lương). Nhấn <strong>Enter</strong> hoặc bấm ra ngoài để lưu. Xóa trắng ô để quay lại theo lịch xếp.</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-400"></span> Ô vàng: Công thực tế</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-400"></span> Ô xám: Chấm 0h / OFF</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-white border border-slate-300"></span> Ô trắng: Theo lịch</span>
          </div>
        </div>
      )}

      <TimesheetTable
        groupedEmps={groupedEmps}
        cycleDates={cycleDates}
        activeDays={activeDays}
        getDayValue={getDayValue}
        editMode={editMode}
        getActualValue={getActualValue}
        onActualChange={handleActualChange}
      />
    </div>
  );
}
