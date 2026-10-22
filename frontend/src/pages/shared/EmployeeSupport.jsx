import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { isOpsManager } from '../../lib/authSession';
import { formatISODate } from '../../data/constants';
import * as api from '../../services/api';
import EmployeeStartGuide from '../../components/employee/EmployeeStartGuide';
import HelpRequestForm from '../../components/employee/HelpRequestForm';
import HelpRequestDetail from '../../components/employee/HelpRequestDetail';
import RegistrationReadiness from '../../components/dashboard/RegistrationReadiness';
import { HELP_TOPICS, HELP_STATUSES, EMPLOYEE_START_STEPS } from '../../data/employeeStart';
import { belongsToStore, supportTopicSummary, understoodStepCount } from '../../utils/employeeSupport';

export default function EmployeeSupport() {
  const user = useStore(s => s.user);
  return <SupportWorkspace key={`${user?.id}:${user?.dept}:${user?.role}:${user?.workspaceRoleId}:${isOpsManager(user)}`} user={user} />;
}
function SupportWorkspace({ user }) {
  const manager = isOpsManager(user);
  const today = formatISODate(new Date());
  const [from, setFrom] = useState(today.slice(0, 7) + '-01');
  const [to, setTo] = useState(today);
  const [store, setStore] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setSelected(null);
    if (!from || !to || from > to) { setError('Chọn khoảng ngày hợp lệ.'); setLoading(false); return; }
    Promise.all([api.getEmployeeStartRoster(), api.getEmployeeHelpRequests({ from, to, store }), manager ? api.getEmployeeAnswerFeedback({ from, to, store }) : Promise.resolve([])])
      .then(([roster, requests, feedback]) => { if (active) setData({ roster, requests, feedback }); })
      .catch(() => { if (active) setError('Chưa tải được dữ liệu hỗ trợ. Hãy thử lại hoặc liên hệ quản trị viên.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to, store, retry, manager]);
  const roster = (data?.roster || []).filter(row => belongsToStore(row.dept, store));
  const requests = (data?.requests || []).filter(row => status === 'ALL' || row.status === status);
  const topics = useMemo(() => supportTopicSummary(data?.requests || []), [data?.requests]);
  const changeRequest = row => setData(value => ({ ...value, requests: value.requests.map(item => item.id === row.id ? row : item) }));
  const detail = data?.requests.find(row => row.id === selected);
  const mentor = async (employee, value) => {
    setBusy(employee); setActionError('');
    try {
      await api.assignEmployeeMentor(employee, value);
      setData(current => ({ ...current, roster: current.roster.map(row => row.id === employee ? { ...row, mentorId: value, mentorName: current.roster.find(m => m.id === value)?.name } : row) }));
    } catch { setActionError('Chưa lưu được người hướng dẫn. Chỉ chọn nhân viên đang hoạt động cùng cửa hàng.'); }
    finally { setBusy(''); }
  };
  return <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4 p-3 pb-20 sm:p-5" data-testid="employee-support">
    <h1 className="text-lg font-bold">{manager ? 'Theo dõi hướng dẫn & hỗ trợ' : 'Hướng dẫn & hỗ trợ'}</h1>
    <p className="text-sm text-slate-600">{manager ? 'Theo dõi việc cần giải đáp và tiến độ nhân viên tự xác nhận. Không suy luận năng lực từ số câu hỏi hoặc số lần dùng Tú mini.' : 'Bạn có thể dùng ứng dụng ngay và quay lại hướng dẫn bất cứ lúc nào.'}</p>
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-3">
      <label className="text-sm">Yêu cầu gửi từ ngày<input aria-label="Yêu cầu gửi từ ngày" type="date" className="block rounded border p-2" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label className="text-sm">Đến ngày<input aria-label="Đến ngày" type="date" className="block rounded border p-2" value={to} onChange={e => setTo(e.target.value)} /></label>
      {manager && <label className="text-sm">Cửa hàng<select aria-label="Cửa hàng theo dõi" className="block rounded border p-2" value={store} onChange={e => setStore(e.target.value)}><option value="ALL">Tất cả được phân quyền</option>{[...new Set((data?.roster || []).flatMap(row => row.dept.split(',').map(v => v.trim())))].sort().map(id => <option key={id}>{id}</option>)}</select></label>}
      <button type="button" disabled={loading} className="min-h-11 rounded border px-3" onClick={() => setRetry(v => v + 1)}>Tải lại</button>
    </div>
    {loading && <p role="status">Đang tải dữ liệu hỗ trợ…</p>}{error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-red-800">{error}</p>}
    {!loading && !error && data && <>
      {!manager && data.roster.find(row => row.id === user.id) && <EmployeeStartGuide record={data.roster.find(row => row.id === user.id)} onChange={record => setData(value => ({ ...value, roster: value.roster.map(row => row.id === record.id ? record : row) }))} />}
      {manager && <RegistrationReadiness employees={roster} identity={`${user.id}:${user.dept}`} />}
      {manager && <section className="rounded-xl border bg-white p-3 space-y-3">
        <h2 className="font-bold">Tiến độ hướng dẫn hiện tại · {roster.length} nhân viên</h2><p className="text-xs">Bảng này theo cửa hàng, không giới hạn theo ngày gửi yêu cầu. Người hướng dẫn do quản lý phân công.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Tiến độ từng nhân viên</caption><thead><tr>{['Nhân viên', 'Cửa hàng', 'Đã mở', 'Tự xác nhận đã hiểu', 'Người hướng dẫn'].map(label => <th className="p-2" scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{roster.map(row => <tr className="border-t" key={row.id}><th scope="row" className="p-2">{row.name}<span className="block text-xs font-normal">{row.id}</span></th><td className="p-2">{row.dept}</td><td className="p-2">{EMPLOYEE_START_STEPS.filter(step => row.steps?.[`${step.id}_viewed`]).length}/{EMPLOYEE_START_STEPS.length}</td><td className="p-2"><details><summary>{understoodStepCount(row.steps)}/{EMPLOYEE_START_STEPS.length} mục</summary><ul>{EMPLOYEE_START_STEPS.map(step => <li key={step.id}>{step.label}: {row.steps?.[`${step.id}_understood`] ? 'Tự xác nhận đã hiểu' : 'Chưa xác nhận'}</li>)}</ul></details></td><td className="p-2"><select aria-label={`Người hướng dẫn của ${row.name}`} disabled={!!busy} value={row.mentorId || ''} onChange={e => mentor(row.id, e.target.value)} className="max-w-48 rounded border p-2"><option value="">Chưa phân công</option>{(data.roster || []).filter(candidate => candidate.id !== row.id && candidate.dept.split(',').some(d => belongsToStore(row.dept, d.trim()))).map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></td></tr>)}</tbody></table></div>
        {busy && <p role="status">Đang lưu người hướng dẫn…</p>}{actionError && <p role="alert" className="text-red-700">{actionError}</p>}
      </section>}
      {manager && <section className="rounded-xl border bg-white p-3 space-y-3"><h2 className="font-bold">Chủ đề cần giải đáp trong khoảng ngày đã chọn</h2>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Chủ đề', 'Số yêu cầu', 'Số người', 'Chưa giải đáp xong'].map(label => <th scope="col" key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{topics.map(topic => <tr className="border-t" key={topic.id}><th scope="row" className="p-2">{topic.label}</th><td className="p-2">{topic.requests}</td><td className="p-2">{topic.people}</td><td className="p-2">{topic.pending}</td></tr>)}</tbody></table></div>
        <p className="text-sm">Phản hồi Tú mini cập nhật trong khoảng ngày: {data.feedback.filter(row => row.rating === 'understood').length} câu trả lời được đánh dấu đã hiểu; {data.feedback.filter(row => row.rating === 'unclear').length} câu trả lời chưa rõ, từ {new Set(data.feedback.filter(row => row.rating === 'unclear').map(row => row.emp_id)).size} người. Đây là phản hồi tự nguyện.</p>
        {data.feedback.some(row => row.rating === 'unclear') && <details><summary className="cursor-pointer text-sm">Nhân viên đã đánh dấu chưa rõ</summary><ul className="text-sm">{[...new Set(data.feedback.filter(row => row.rating === 'unclear').map(row => row.emp_id))].map(id => <li key={id}>{data.roster.find(row => row.id === id)?.name || id} · {id} · {data.feedback.filter(row => row.emp_id === id && row.rating === 'unclear').length} phản hồi</li>)}</ul></details>}
      </section>}
      <section className="rounded-xl border bg-white p-3 space-y-3"><h2 className="font-bold">Yêu cầu hỗ trợ · {requests.length} yêu cầu / {new Set(requests.map(row => row.emp_id)).size} người</h2>
        <label className="block text-sm">Trạng thái<select aria-label="Trạng thái yêu cầu" className="ml-2 max-w-full rounded border p-2" value={status} onChange={e => setStatus(e.target.value)}><option value="ALL">Tất cả</option>{Object.entries(HELP_STATUSES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm" data-testid="help-requests"><thead><tr>{['Nhân viên', 'Chủ đề / câu hỏi', 'Cửa hàng', 'Trạng thái', 'Người phụ trách', 'Cập nhật', 'Chi tiết'].map(label => <th className="p-2" scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{requests.map(row => <tr className="border-t" key={row.id}><th scope="row" className="p-2">{data.roster.find(person => person.id === row.emp_id)?.name || row.emp_id}</th><td className="p-2"><span>{HELP_TOPICS[row.topic]}</span><p className="max-w-xs break-words text-xs">{row.question}</p></td><td className="p-2">{row.store_id}</td><td className="p-2">{HELP_STATUSES[row.status]}</td><td className="p-2">{data.roster.find(person => person.id === row.assigned_to)?.name || row.assigned_to || 'Chưa nhận'}</td><td className="p-2">{new Date(row.updated_at).toLocaleString('vi-VN')}</td><td className="p-2"><button type="button" aria-label={`Xem yêu cầu: ${row.question}`} onClick={() => setSelected(row.id)} className="min-h-11 rounded border px-3">Xem</button></td></tr>)}</tbody></table></div>
        {!requests.length && <p>Không có yêu cầu phù hợp với bộ lọc.</p>}
      </section>
      {detail && <HelpRequestDetail key={detail.id} row={detail} manager={manager} userId={user.id} onChange={changeRequest} onClose={() => setSelected(null)} />}
      {!manager && <HelpRequestForm user={user} onSaved={() => setRetry(v => v + 1)} />}
    </>}
  </main>;
}
