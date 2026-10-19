import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { useGroupedEmployees } from '../../hooks/useGroupedEmployees';
import TimesheetTable from '../../components/timesheet/TimesheetTable';
import { Download, Printer, Pencil, Check, FileSpreadsheet, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import Toolbar from '../../components/Toolbar';
import Button from '../../components/ui/Button';
import { toast } from '../../components/ui/toastStore';
import { exportTimesheetToExcel } from '../../utils/excelExport';
import { downloadPayrollXlsx } from '../../utils/exportPayroll';
import { getPayrollCycleDates, getPayrollCycleFromWeek } from '../../utils/dateHelper';
import { useTimesheetValues } from '../../hooks/useTimesheetValues';
import { movePayrollCycle } from '../../utils/timesheetValues';
import { canPickStore } from '../../lib/authSession';
import { useShallow } from 'zustand/react/shallow';

const ImportAttendanceModal = React.lazy(() => import('../../components/modals/ImportAttendanceModal'));

export default function Timesheet() {
  const { user, currentWeek, employees } = useStore(useShallow((s) => ({ user: s.user, currentWeek: s.currentWeek, employees: s.employees })));
  const schedule = useStore((s) => s.schedule);
  const saveAttendanceCell = useStore((s) => s.saveAttendanceCell);

  // Chế độ sửa CÔNG THỰC TẾ (nhập số giờ từ ezHR)
  const [editMode, setEditMode] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const pickStore = canPickStore(user);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState(pickStore ? 'ALL' : user?.dept);
  const [filterRole, setFilterRole] = useState('ALL');
  // Nhan/xuat theo CH dang chon (Toolbar da gioi han pham vi sm_id)
  const effDept = pickStore ? filterDept : (filterDept || user?.dept);

  const [payrollCycle, setPayrollCycle] = useState(() => getPayrollCycleFromWeek(currentWeek));
  const cycleDates = useMemo(
    () => getPayrollCycleDates(payrollCycle.year, payrollCycle.month),
    [payrollCycle]
  );
  const activeDays = useMemo(() => cycleDates.map(d => d.key), [cycleDates]);

  const groupedEmps = useGroupedEmployees(search, filterDept, filterRole);
  const { getDayValue, getActualValue, getEffectiveValue } = useTimesheetValues(cycleDates);

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

  const handlePrevMonth = () => setPayrollCycle(cycle => movePayrollCycle(cycle, -1));
  const handleNextMonth = () => setPayrollCycle(cycle => movePayrollCycle(cycle, 1));

  const overrideCount = Object.values(groupedEmps).flat().reduce((count, emp) => (
    count + activeDays.filter(day => getActualValue(emp.id, day) !== '').length
  ), 0);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-white print:block">
      <div className="shrink-0 border-b border-slate-200 px-3 py-3 sm:px-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Bảng chấm công</h1>
            <p className="text-xs text-slate-500">Kỳ công {cycleDates[0]?.display} – {cycleDates.at(-1)?.display}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border border-slate-200">
              <button type="button" onClick={handlePrevMonth} title="Tháng trước" aria-label="Tháng trước" className="p-3 text-slate-600 hover:bg-slate-50"><ChevronLeft size={16} /></button>
              <span className="px-2 text-sm font-semibold text-slate-800">Tháng {payrollCycle.month}/{payrollCycle.year}</span>
              <button type="button" onClick={handleNextMonth} title="Tháng sau" aria-label="Tháng sau" className="p-3 text-slate-600 hover:bg-slate-50"><ChevronRight size={16} /></button>
            </div>
            <Button variant={editMode ? 'primary' : 'secondary'} onClick={() => setEditMode(value => !value)} aria-label="Sửa công thực tế" aria-pressed={editMode}>
              {editMode ? <Check size={16} /> : <Pencil size={16} />}{editMode ? 'Xong' : 'Sửa công thực tế'}
            </Button>
          </div>
        </div>
      </div>
      <div className="shrink-0 print:hidden">
        <Toolbar search={search} setSearch={setSearch} filterDept={filterDept} setFilterDept={setFilterDept}
          filterRole={filterRole} setFilterRole={setFilterRole} showWeekPicker={false} />
        <details className="border-b border-slate-200 px-3 py-2 text-xs text-slate-600 sm:px-4">
          <summary className="w-fit cursor-pointer rounded py-1 font-medium">Nhập / xuất Excel và in</summary>
          <div className="flex flex-wrap gap-2 pb-1 pt-2">
            <Button onClick={() => setShowImportModal(true)}><Upload size={16} />Nhập công ezHR9</Button>
            <Button onClick={() => exportTimesheetToExcel({currentWeek, deptName: effDept === 'ALL' ? 'Toan_Bo_Cua_Hang' : effDept,
              groupedEmps, getDayValue: getEffectiveValue, activeDays, filterOnlyMe: false, currentUserId: user?.id, cycleDates})}>
              <Download size={16} />Xuất bảng công
            </Button>
            <Button onClick={() => downloadPayrollXlsx({cycleDates, groupedEmps, getDayValue: getEffectiveValue, getActualValue},
              `OFC_CongLuong_Thang_${payrollCycle.month}_${payrollCycle.year}.xlsx`)}><FileSpreadsheet size={16} />Xuất mẫu C&B</Button>
            <Button onClick={() => window.print()}><Printer size={16} />In bảng công</Button>
          </div>
        </details>
      </div>
      <div className="mb-4 hidden border-b border-slate-300 pb-2 text-center print:block">
        <h1 className="text-xl font-semibold">BẢNG CHẤM CÔNG THÁNG {payrollCycle.month}/{payrollCycle.year}</h1>
        <p className="text-xs">Kỳ công {cycleDates[0]?.display} – {cycleDates.at(-1)?.display} · {effDept === 'ALL' ? 'Tất cả cửa hàng' : effDept}</p>
      </div>
      {editMode && <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 print:hidden">
        <p><strong>Đang sửa công ({overrideCount} ô)</strong> · Nhập giờ hoặc mã nghỉ. Enter / rời ô để lưu; Esc để hủy thay đổi đang nhập.</p>
        <details className="mt-1">
          <summary className="w-fit cursor-pointer py-1">Hướng dẫn nhập công</summary>
          <p className="max-w-3xl py-1 leading-relaxed">Ví dụ: 7,84 hoặc 8 giờ; 0 là không có giờ công; OFF là nghỉ ca; AL, PL, UL, SL, CL là mã nghỉ. Ô chưa nhập hiển thị mờ công theo lịch. Xóa trắng để dùng lại giờ theo lịch; xem ngày ở đầu cột.</p>
        </details>
      </div>}

      <TimesheetTable
        groupedEmps={groupedEmps}
        cycleDates={cycleDates}
        activeDays={activeDays}
        getDayValue={getDayValue}
        editMode={editMode}
        getActualValue={getActualValue}
        onActualChange={handleActualChange}
      />

      {showImportModal && (
        <React.Suspense fallback={null}>
          <ImportAttendanceModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            payrollCycle={payrollCycle}
            cycleDates={cycleDates}
            employees={employees}
            schedule={schedule}
          />
        </React.Suspense>
      )}
    </div>
  );
}
