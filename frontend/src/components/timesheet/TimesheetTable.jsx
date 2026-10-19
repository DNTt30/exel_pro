import React, { memo, useMemo } from 'react';
import TimesheetRow from '../TimesheetRow';

const TimesheetTable = memo(({ groupedEmps, cycleDates, activeDays, getDayValue, editMode = false, getActualValue, onActualChange }) => {
  const deptKeys = Object.keys(groupedEmps);
  const totalEmployees = deptKeys.reduce((sum, dept) => sum + (groupedEmps[dept]?.length || 0), 0);
  const dayLabels = useMemo(() => Object.fromEntries(cycleDates.map(d => [d.key, `${d.dayKey} ${d.shortDisplay || d.display}`])), [cycleDates]);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (!totalEmployees) return <div className="flex-1 bg-white p-8 text-center text-sm text-slate-500">
    Không tìm thấy nhân viên. Hãy kiểm tra từ khóa hoặc cửa hàng đang lọc.
  </div>;

  return <div className="flex min-h-0 flex-1 flex-col bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 text-xs text-slate-500 print:hidden">
      <span>{totalEmployees} nhân viên · Đơn vị: giờ</span>
      <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-blue-200" />Nền xanh: đã nhập thực tế · Ô còn lại: theo lịch</span>
      <span>Kéo ngang để xem các ngày →</span>
    </div>
    <div role="region" aria-label="Bảng chấm công theo ngày" tabIndex={0} className="min-h-0 flex-1 overflow-auto focus-visible:outline-2 focus-visible:outline-slate-500 print:overflow-visible">
      <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
        <caption className="sr-only">Bảng chấm công: nhân viên, tổng giờ trong kỳ và công từng ngày</caption>
        <thead className="sticky top-0 z-30 bg-slate-100">
          <tr>
            <th scope="col" className="sticky left-0 z-30 min-w-[144px] border-b border-r border-slate-300 bg-slate-100 px-3 py-3 text-left sm:min-w-[208px]">Nhân viên</th>
            <th scope="col" className="min-w-[72px] border-b border-r border-slate-300 px-2 py-3 text-center">Tổng giờ</th>
            {cycleDates.map(day => <th scope="col" key={day.key} aria-current={day.fullDateStr === today ? 'date' : undefined}
              className={`min-w-[72px] border-b border-r border-slate-200 px-1 py-2 text-center ${day.fullDateStr === today ? 'bg-blue-100 text-blue-900' : day.dayKey === 'CN' ? 'bg-slate-200 text-slate-700' : 'text-slate-600'}`}
              title={`${day.dayKey} ngày ${day.display || day.shortDisplay}`}>
              <span className="block text-[11px] font-normal">{day.dayKey}</span>
              <span className="block text-xs font-semibold tabular-nums">{day.shortDisplay || day.display}</span>
              {day.fullDateStr === today && <span className="block text-[10px] font-normal">Hôm nay</span>}
            </th>)}
          </tr>
        </thead>
        <tbody>
          {deptKeys.map(dept => <React.Fragment key={dept}>
            <tr><th scope="rowgroup" colSpan={2 + cycleDates.length} className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-600">
              <span className="sticky left-3">Cửa hàng {dept} · {groupedEmps[dept].length} nhân viên</span>
            </th></tr>
            {groupedEmps[dept].map(emp => <TimesheetRow key={emp.id} emp={emp} activeDays={activeDays} dayLabels={dayLabels}
              getDayValue={getDayValue} editMode={editMode} getActualValue={getActualValue} onActualChange={onActualChange} />)}
          </React.Fragment>)}
        </tbody>
      </table>
    </div>
  </div>;
});

export default TimesheetTable;
