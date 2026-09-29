import { useEffect, useMemo, useState } from 'react';
import { Moon, Sun, ChevronDown } from 'lucide-react';
import { getSchedulesByWeeks } from '../services/api';
import { SKILL_ANALYTICS_RULES, getCurrentMondayWeek } from '../data/constants';
import { analyticsWeeks, buildShiftAnalytics } from '../utils/shiftAnalytics';
import { managedStoreIds } from '../utils/employeeSkills';

export default function ShiftAnalyticsBoard({ employees, stores, user, storeId, currentWeek }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const todayWeek = getCurrentMondayWeek(new Date());
  const endWeek = currentWeek < todayWeek ? currentWeek : todayWeek;
  const weeks = useMemo(() => analyticsWeeks(endWeek), [endWeek]);
  const allowed = managedStoreIds(user, stores);
  const scoped = employees.filter(emp => emp.isActive !== false && allowed.includes(emp.dept) && (storeId === 'ALL' || emp.dept === storeId));
  const idsKey = JSON.stringify(scoped.map(emp => emp.id).sort());
  const requestKey = `${user?.id}:${endWeek}:${idsKey}:${retry}`;
  useEffect(() => {
    let current = true;
    setHistory(null); setError('');
    if (!open) return;
    getSchedulesByWeeks(weeks, { empIds: JSON.parse(idsKey) }).then(data => {
      if (current) setHistory({ key: requestKey, data });
    }).catch(() => { if (current) setError('Chưa tải được lịch sử. Vui lòng thử lại.'); });
    return () => { current = false; };
  }, [open, weeks, idsKey, requestKey]);
  const ready = history?.key === requestKey;
  const rows = ready ? buildShiftAnalytics(scoped, history.data, weeks, endWeek) : [];
  const training = rows.filter(row => row.needsTraining);
  return <section className="print:hidden rounded-xl border border-purple-200 bg-white overflow-hidden">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 p-3 text-left text-sm font-bold text-purple-900">
      <span className="flex items-center gap-2"><Moon size={17} /> Kỹ năng & phân bổ ca</span><ChevronDown size={17} className={open ? 'rotate-180' : ''} />
    </button>
    {open && <div className="border-t border-purple-100 p-3 space-y-4 text-xs">
      <p className="text-slate-500">{SKILL_ANALYTICS_RULES.HISTORY_WEEKS} tuần đã kết thúc trước {endWeek}; tính ca đã chốt, gồm ca chi viện. Đây là lịch phân công, không phải dữ liệu chấm công.</p>
      {error ? <p role="alert" className="text-red-700">{error} <button type="button" className="underline" onClick={() => setRetry(retry + 1)}>Thử lại</button></p>
        : !ready ? <p role="status">Đang tải lịch sử ca…</p>
        : <>
          <div className="flex flex-wrap gap-4"><span className="inline-flex items-center gap-1 text-purple-700"><Moon size={13} /> Tím: Ca đêm</span><span className="inline-flex items-center gap-1 text-orange-700"><Sun size={13} /> Cam: Ca ngày</span></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-80 overflow-y-auto">
            {rows.map(({ employee, night, day, total, nightPercent }) => <div key={employee.id} className="min-w-0 rounded-lg border border-slate-100 p-2">
              <p className="font-semibold text-slate-800 break-words">{employee.name} <span className="font-normal text-slate-500">· {employee.dept}</span></p>
              {total ? <><div role="img" aria-label={`${employee.name}: ${nightPercent}% ca đêm, ${100 - nightPercent}% ca ngày`} className="mt-2 flex h-2 overflow-hidden rounded-full bg-orange-400">
                <div className="bg-purple-500" style={{ width: `${nightPercent}%` }} />
              </div><p className="mt-1 text-slate-500">Đêm {nightPercent}% ({night}) · Ngày {100 - nightPercent}% ({day})</p></> : <p className="mt-2 text-slate-400">Chưa có ca đã chốt trong khoảng này</p>}
            </div>)}
          </div>
          {!rows.length && <p>Chưa có nhân viên trong phạm vi này.</p>}
          <div className="rounded-lg bg-purple-50 p-3">
            <h3 className="font-bold text-purple-900">Nhân sự cần Train ca đêm ({training.length})</h3>
            <p className="mt-1 text-slate-600">STFT/STPT chưa có Night Ready, hồ sơ từ {SKILL_ANALYTICS_RULES.TENURE_DAYS} ngày, có lịch sử ca ngày nhưng 0% ca đêm trong khoảng trên. Ngày tạo hồ sơ chỉ là mốc tham khảo thâm niên.</p>
            {training.length ? <ul className="mt-2 space-y-1 text-purple-900">{training.map(({ employee }) => <li key={employee.id}>{employee.name} · {employee.id} · {employee.dept}</li>)}</ul> : <p className="mt-2 text-slate-500">Chưa phát hiện nhân sự phù hợp tiêu chí.</p>}
            <p className="mt-2 text-slate-500">Người chưa có lịch sử hoặc thiếu ngày tạo hồ sơ chưa đủ dữ liệu để đánh giá.</p>
          </div>
        </>}
    </div>}
  </section>;
}
