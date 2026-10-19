import { DECISION_RULES, WEEK_DAYS } from '../../data/constants';
import { demandLabel } from '../../utils/registeredScheduler';
import { normalizeShift } from '../../utils/shiftHelper';

const dayName = day => day === 'CN' ? 'Chủ nhật' : `Thứ ${day.slice(1)}`;
const disclosureClass = 'rounded-lg border border-slate-200 bg-white p-4';

// Shortage and surplus share one layout; labels remain explicit without relying on color.
function CoverageList({ slots, dates, surplus = false }) {
  return <div className="divide-y divide-slate-200">{WEEK_DAYS.map(day => {
    const rows = slots.filter(slot => slot.day === day);
    if (!rows.length) return null;
    return <section key={day} className="py-3 first:pt-0 last:pb-0">
      <h4 className="mb-2 text-sm font-semibold text-slate-800">{dayName(day)} · {dates[day]}</h4>
      <ul className="space-y-3">{rows.map((slot, i) => <li key={`${slot.start}-${i}`}>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
          <span className="text-slate-800">{slot.shift} <span className="text-slate-600">· Có {slot.actual}/{slot.required}</span></span>
          <strong className={surplus ? 'text-slate-700' : 'text-amber-800'}>{surplus ? `Dư ${slot.excess}` : `Thiếu ${slot.missing}`}</strong>
        </div>
        {(slot.revenue > 0 || slot.notes > 0) && <p className="mt-1 text-xs leading-relaxed text-slate-600">{demandLabel(slot)}</p>}
      </li>)}</ul>
      {!surplus && <details className="mt-3"><summary className="cursor-pointer text-xs font-medium text-slate-600">Vì sao còn thiếu?</summary>{rows.map((slot, i) => <p key={i} className="mt-2 text-xs leading-relaxed text-slate-600">{slot.shift}: {slot.reason}</p>)}</details>}
    </section>;
  })}</div>;
}

function SchedulePreview({ result, employees, source }) {
  return <details className={disclosureClass}>
    <summary className="cursor-pointer text-sm font-semibold text-slate-800">Xem lịch đề xuất</summary>
    <div className="mt-3 overflow-x-auto"><table className="w-full text-sm">
      <caption className="sr-only">Ca đã chốt và đăng ký chưa được chọn</caption>
      <thead><tr><th scope="col" className="p-2 text-left">Nhân viên</th>{WEEK_DAYS.map(day => <th scope="col" key={day} className="p-2">{day}</th>)}</tr></thead>
      <tbody>{employees.map(emp => <tr key={emp.id} className="border-t border-slate-200"><th scope="row" className="whitespace-nowrap p-2 text-left font-medium">{emp.name}</th>{WEEK_DAYS.map(day => {
        const cell = normalizeShift(result.schedule[emp.id]?.[day] ?? source[emp.id]?.[day]);
        return <td key={day} className={`whitespace-nowrap p-2 text-center ${cell.confirmed && cell.shift !== 'off' ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
          {cell.shift === 'off' ? 'OFF' : cell.shift || '—'}{cell.covering_store ? ` ${cell.covering_store}` : ''}{cell.registered && !cell.confirmed ? ' (ĐK)' : ''}
        </td>;
      })}</tr>)}</tbody>
    </table></div>
    <p className="mt-3 text-xs leading-relaxed text-slate-600">ĐK: đăng ký chưa chọn. —: chưa đăng ký. Chỉ lưu khi bấm Áp dụng.</p>
  </details>;
}

export default function SchedulerResults({ result, dates, employees, source }) {
  const missingDays = new Set(result.shortages.map(gap => gap.day)).size;
  return <div className="space-y-4" aria-live="polite">
    <div className="border-t border-slate-200 pt-4">
      <h3 className="text-base font-semibold text-slate-900">Chọn thêm {result.newAssignments} ca từ đăng ký</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">Nghỉ giữa ca ≥ {DECISION_RULES.MIN_REST_HOURS} giờ · Tối đa {DECISION_RULES.MAX_CONSECUTIVE_NIGHTS} đêm liên tiếp</p>
    </div>
    {missingDays ? <section aria-label="Các ca thiếu người" className={disclosureClass}>
      <h3 className="text-sm font-semibold text-amber-800">Còn thiếu người · {missingDays} ngày</h3>
      <p className="mb-4 mt-1 text-sm text-slate-600">Trao đổi với nhân viên để bổ sung đăng ký cho các giờ dưới đây.</p>
      <CoverageList slots={result.shortages} dates={dates} />
    </section> : <p className="rounded-lg border border-slate-200 p-4 text-sm text-emerald-800">Đã đủ người theo định biên các khung giờ.</p>}
    {!!result.surpluses.length && <details aria-label="Các ca dư người" className={disclosureClass}>
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">Dư người · {result.surpluses.length} khung giờ</summary>
      <p className="mb-4 mt-2 text-sm text-slate-600">Cân đối với các giờ thiếu; ca đã chốt được giữ nguyên.</p>
      <CoverageList slots={result.surpluses} dates={dates} surplus />
    </details>}
    {!!result.supportSuggestions.length && <details className={disclosureClass}>
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">Có thể trao đổi chi viện · {result.supportSuggestions.length} khung giờ</summary>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">Chỉ gợi ý người đã đăng ký trong phạm vi quản lý. Cần xác nhận với cửa hàng gốc và nhân viên; chưa tự điều chuyển.</p>
      {result.supportSuggestions.map((gap, i) => <div key={i} className="mt-3 text-sm text-slate-700"><b>{dayName(gap.day)} {dates[gap.day]} · {gap.shift}</b>{gap.candidates.map(c => <p key={c.employeeId} className="mt-1">{c.name} · {c.storeId} · đăng ký {c.shift}{c.nightReady ? ' · Cứng ca đêm' : ''}</p>)}</div>)}
    </details>}
    {!!result.criticalInsights.length && <details className={disclosureClass}>
      <summary className="cursor-pointer text-sm font-semibold text-rose-800">{result.criticalInsights.length} ngày cần kiểm tra người cứng ca đêm</summary>
      {result.criticalInsights.map(note => <p key={note} className="mt-2 text-sm leading-relaxed text-slate-700">{note}</p>)}
    </details>}
    {!!result.notices.length && <div role="status" className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">{result.notices.map(note => <p key={note}>{note}</p>)}</div>}
    <SchedulePreview result={result} employees={employees} source={source} />
  </div>;
}
