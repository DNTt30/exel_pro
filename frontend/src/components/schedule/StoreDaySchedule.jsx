import { useState } from 'react';
import { WEEK_DAYS } from '../../data/constants';
import { normalizeShift, parseShiftTimeRange } from '../../utils/shiftHelper';

export default function StoreDaySchedule({ groupedEmployees, schedule, week, userId }) {
  const [day, setDay] = useState(() => WEEK_DAYS[(new Date().getDay() + 6) % 7]);
  const date = new Date(`${week}T12:00:00`);
  date.setDate(date.getDate() + WEEK_DAYS.indexOf(day));
  return <section className="sm:hidden print:hidden min-h-0 flex-1 overflow-y-auto p-3 space-y-3" aria-label="Lịch toàn cửa hàng theo ngày" data-testid="store-day-schedule">
    <div className="sticky top-0 z-10 bg-slate-50 pb-2 grid grid-cols-7 gap-1" aria-label="Chọn ngày xem lịch">{WEEK_DAYS.map(d => <button key={d} type="button" aria-pressed={d === day} onClick={() => setDay(d)} className={`min-h-11 rounded-lg text-sm font-semibold ${day === d ? 'bg-blue-600 text-white' : 'bg-white border text-slate-700'}`}>{d}</button>)}</div>
    <p className="text-sm text-slate-600">{date.toLocaleDateString('vi-VN')} · Ca được sắp theo giờ bắt đầu. Ca đêm kết thúc vào hôm sau.</p>
    {!Object.keys(groupedEmployees).length && <p role="status">Chưa có nhân viên trong cửa hàng đang xem.</p>}
    {Object.entries(groupedEmployees).map(([store, employees]) => {
      const rows = employees.map(emp => ({ emp, cell: normalizeShift(schedule[emp.id]?.[day]) }))
        .filter(({ emp, cell }) => !emp.isBorrowedTo || cell.covering_store === store)
        .sort((a, b) => (parseShiftTimeRange(a.cell.shift)?.start ?? 99) - (parseShiftTimeRange(b.cell.shift)?.start ?? 99) || a.emp.name.localeCompare(b.emp.name, 'vi'));
      return <div key={store} className="rounded-xl border bg-white overflow-hidden"><h2 className="p-3 font-semibold">Cửa hàng {store}</h2>
        <table className="w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-2 text-left">Nhân viên</th><th className="p-2 text-left">Ca / trạng thái</th></tr></thead>
          <tbody>{rows.map(({ emp, cell }) => <tr key={emp.id} className={`border-t ${emp.id === userId ? 'bg-blue-50' : ''}`}>
            <th scope="row" className="p-3 text-left font-medium break-words">{emp.name}{emp.id === userId ? ' (Bạn)' : ''}{emp.isBorrowedTo ? ' (Hỗ trợ)' : ''}</th>
            <td className="p-3"><span className="whitespace-nowrap font-semibold">{cell.shift === 'off' ? 'Nghỉ (OFF)' : cell.shift || 'Chưa xếp'}</span>
              {cell.shift && cell.shift !== 'off' && !cell.confirmed && <span className="block text-xs text-slate-500">Đăng ký · chưa chốt</span>}
              {cell.covering_store && cell.covering_store !== store && <span className="block text-xs italic text-slate-500">Hỗ trợ {cell.covering_store}</span>}
            </td></tr>)}</tbody>
        </table></div>;
    })}
  </section>;
}
