import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { useGroupedEmployees } from '../../hooks/useGroupedEmployees';
import TimesheetTable from '../../components/timesheet/TimesheetTable';
import { Download, Printer, Pencil, Check } from 'lucide-react';
import Toolbar from '../../components/Toolbar';
import { toast } from '../../components/ui/toastStore';
import { exportTimesheetToExcel } from '../../utils/excelExport';
import { getPayrollCycleDates, getPayrollCycleFromWeek } from '../../utils/dateHelper';
import { getShiftCode, getShiftHours } from '../../utils/shiftHelper';
import { canPickStore } from '../../lib/authSession';
import { useShallow } from 'zustand/react/shallow';

export default function Timesheet() {
  const { user, currentWeek, schedule, ensureWeeksLoaded } = useStore(useShallow((s) => ({ user: s.user, currentWeek: s.currentWeek, schedule: s.schedule, ensureWeeksLoaded: s.ensureWeeksLoaded })));
  const attendance = useStore((s) => s.attendance);
  const loadAttendanceRange = useStore((s) => s.loadAttendanceRange);
  const saveAttendanceCell = useStore((s) => s.saveAttendanceCell);

  // Chế độ sửa CÔNG THỰC TẾ (nhập số giờ từ ezHR)
  const [editMode, setEditMode] = useState(false);

  const pickStore = canPickStore(user);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState(pickStore ? 'ALL' : user?.dept);
  const [filterRole, setFilterRole] = useState('ALL');

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

  // Đọc công thực tế: key 'empId|YYYY-MM-DD'; trả '' khi không có override
  const getActualValue = useCallback((empId, day) => {
    const cell = cycleDates.find(d => d.key === day);
    if (!cell) return '';
    const rec = attendance[cell.fullDateStr ? empId + '|' + cell.fullDateStr : ''];
    if (!rec || !rec.actualHours) return '';
    return String(rec.actualHours);
  }, [cycleDates, attendance]);

  const handleActualChange = useCallback(async (empId, day, raw) => {
    const cell = cycleDates.find(d => d.key === day);
    if (!cell || !cell.fullDateStr) return;
    try {
      const trimmed = String(raw).trim();
      await saveAttendanceCell(empId, cell.fullDateStr, trimmed === '' ? null : parseFloat(trimmed), user?.id);
    } catch (e) {
      toast.error('Không lưu được công: ' + e.message);
    }
  }, [cycleDates, saveAttendanceCell, user?.id]);

  const overrideCount = Object.keys(attendance).filter(k => attendance[k] && attendance[k].actualHours > 0).length;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative print:bg-white print:block">
      <div className="print:hidden">
        <Toolbar 
          search={search} setSearch={setSearch}
          filterDept={filterDept} setFilterDept={setFilterDept}
          filterRole={filterRole} setFilterRole={setFilterRole}
          showWeekPicker={false}
          disableDeptFilter={!pickStore}
          rightActions={
            <>
              <button 
                className="btn btn-outline text-xs py-1.5 px-3 hover:text-emerald-700 hover:border-emerald-300 font-semibold flex items-center gap-1.5 cursor-pointer" 
                onClick={() => exportTimesheetToExcel({
                  currentWeek,
                  deptName: (pickStore ? filterDept : user?.dept) === 'ALL' ? 'Toan_Bo_Cua_Hang' : (pickStore ? filterDept : user?.dept),
                  groupedEmps,
                  getDayValue,
                  activeDays,
                  filterOnlyMe: false,
                  currentUserId: user?.id
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
          <span>{(pickStore ? filterDept : user?.dept) !== 'ALL' ? `Cửa hàng: ${pickStore ? filterDept : user?.dept}` : 'Toàn bộ chuỗi cửa hàng'}</span>
          <span>Ngày in: {new Date().toLocaleDateString('vi-VN')}</span>
          <span>Hệ thống GS25 OFC</span>
        </div>
      </div>

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
