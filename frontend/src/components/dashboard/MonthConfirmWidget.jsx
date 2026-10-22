import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import * as api from '../../services/api';
import { getPayrollCycle } from '../../utils/payrollCycle';
import { belongsToStore, monthConfirmationState } from '../../utils/employeeSupport';

export default function MonthConfirmWidget({ employees: scopedEmployees, cycleKey, storeId = 'ALL' }) {
  const identity = useStore(s => `${s.user?.id}:${s.user?.dept}:${s.user?.role}:${s.user?.workspaceRoleId}`);
  const cycle = cycleKey || getPayrollCycle(new Date()).key;
  const [state, setState] = useState({});
  const [retry, setRetry] = useState(0);
  const key = `${identity}:${cycle}:${storeId}`;
  useEffect(() => {
    let alive = true; setState({});
    Promise.all([api.getMonthConfirmations(cycle), scopedEmployees ? Promise.resolve(scopedEmployees) : api.getEmployeeStartRoster()])
      .then(([rows, employees]) => { if (alive) setState({ key, rows, employees }); })
      .catch(() => { if (alive) setState({ key, error: 'Chưa tải được trạng thái xác nhận công.' }); });
    return () => { alive = false; };
  }, [cycle, key, retry]);
  const people = monthConfirmationState(state.rows || [], (scopedEmployees || state.employees || []).filter(person => belongsToStore(person.dept, storeId)));
  const done = people.filter(row => row.confirmation === 'confirmed').length;
  const disputed = people.filter(row => row.confirmation === 'disputed').length;
  return <section className="rounded-xl border bg-white p-4 space-y-3" data-testid="month-confirm-widget">
    <h2 className="font-bold text-sm">Xác nhận công · chu kỳ {cycle}</h2>
    {state.key !== key ? <p role="status">Đang tải xác nhận công…</p> : state.error ? <p role="alert" className="text-red-700">{state.error} <button className="min-h-11 underline" onClick={() => setRetry(v => v + 1)}>Thử lại</button></p> : <>
      <p className="text-sm">{done}/{people.length} người đã xác nhận · {disputed} người có phản hồi, chưa xác nhận · {people.length - done - disputed} người chưa gửi xác nhận.</p>
      <details><summary className="cursor-pointer text-sm">Danh sách trạng thái từng nhân viên</summary><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th scope="col" className="p-2">Nhân viên</th><th scope="col" className="p-2">Cửa hàng</th><th scope="col" className="p-2">Trạng thái mới nhất</th></tr></thead><tbody>{people.map(person => <tr key={person.id} className="border-t"><th scope="row" className="p-2">{person.name} · {person.id}</th><td className="p-2">{person.dept}</td><td className="p-2">{{ confirmed: 'Đã xác nhận', disputed: 'Có phản hồi cần đối chiếu', missing: 'Chưa gửi xác nhận' }[person.confirmation]}</td></tr>)}</tbody></table></div></details>
      <Link to="/admin/feedback" className="inline-flex min-h-11 items-center text-sm text-blue-700 underline">Xử lý chênh lệch tại Bù công C&B</Link>
    </>}
    <Link to="/admin/support" className="block text-sm text-blue-700 underline">Theo dõi nhân viên mới và câu hỏi cần giải đáp</Link>
  </section>;
}
