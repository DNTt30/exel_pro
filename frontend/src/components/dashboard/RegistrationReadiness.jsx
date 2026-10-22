import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../../services/api';
import { homeWeek } from '../../utils/employeeHome';
import { employeeWeekProgress } from '../../utils/shiftHelper';
import { WEEK_DAYS } from '../../data/constants';

export default function RegistrationReadiness({ employees, identity }) {
  const [week, setWeek] = useState(() => homeWeek(new Date(), 1));
  const [state, setState] = useState({});
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState('all');
  const key = `${identity}:${week}`;
  useEffect(() => {
    let active = true; setState({});
    api.getEmployeeRegistrationWeek(week).then(rows => { if (active) setState({ key, rows }); })
      .catch(() => { if (active) setState({ key, error: 'Chưa tải được lịch tuần. Không thể kết luận ai chưa đăng ký.' }); });
    return () => { active = false; };
  }, [week, key, retry]);
  const people = useMemo(() => employees.map(employee => ({ ...employee, ...employeeWeekProgress(state.rows?.[employee.id] || {}) })), [employees, state.rows]);
  const blank = people.filter(row => row.blankDays === WEEK_DAYS.length).length;
  const pending = people.filter(row => row.registeredDays > 0).length;
  const shown = people.filter(row => filter === 'all' || (filter === 'blank' ? row.blankDays === WEEK_DAYS.length : row.registeredDays > 0));
  return <section className="rounded-xl border bg-white p-3 space-y-3" data-testid="registration-readiness">
    <h2 className="font-bold">Theo dõi đăng ký ca</h2>
    <label className="block text-sm">Tuần bắt đầu (thứ Hai)<input aria-label="Tuần theo dõi đăng ký" type="date" value={week} onChange={e => { if (e.target.value) setWeek(homeWeek(new Date(`${e.target.value}T12:00:00`))); }} className="ml-2 max-w-full rounded border p-2" /></label>
    {state.key !== key ? <p role="status">Đang tải lịch đăng ký…</p> : state.error ? <p role="alert" className="text-red-700">{state.error} <button type="button" className="min-h-11 underline" onClick={() => setRetry(v => v + 1)}>Tải lại lịch đăng ký</button></p> : <>
      <p className="text-sm">{blank} người chưa có đăng ký, ca đã xếp hoặc OFF · {pending} người còn đăng ký chờ xếp.</p>
      <p className="text-xs text-slate-600">Ca đã chọn chuyển sang đã xếp; dữ liệu hiện có không lưu đủ lịch sử để kết luận họ chưa từng đăng ký. OFF là khai báo nghỉ, không phải chưa nhập. Đây là giờ theo lịch, không phải công thực tế.</p>
      <label className="block text-sm">Lọc nhân viên<select aria-label="Lọc tiến độ đăng ký" className="ml-2 max-w-full rounded border p-2" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Tất cả</option><option value="blank">Chưa có dữ liệu cả tuần</option><option value="pending">Còn đăng ký chờ xếp</option></select></label>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Chi tiết đăng ký tuần {week}</caption><thead><tr>{['Nhân viên', 'Cửa hàng', 'Đăng ký chờ xếp', 'Đã xếp', 'Ngày OFF', 'Ngày trống'].map(label => <th scope="col" key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{shown.map(row => <tr key={row.id} className="border-t"><th scope="row" className="p-2">{row.name} · {row.id}</th><td className="p-2">{row.dept}</td><td className="p-2">{row.registeredHours}h / {row.registeredDays} ngày</td><td className="p-2">{row.assignedHours}h / {row.assignedDays} ngày</td><td className="p-2">{row.offDays}</td><td className="p-2">{row.blankDays}</td></tr>)}</tbody></table></div>
      {!shown.length && <p className="text-sm">Không có nhân viên phù hợp bộ lọc.</p>}
      <Link to="/admin/schedule" className="inline-flex min-h-11 items-center text-sm text-blue-700 underline">Mở Lịch ca để kiểm tra và xếp lịch</Link>
    </>}
  </section>;
}
