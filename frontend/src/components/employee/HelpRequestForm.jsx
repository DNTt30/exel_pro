import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { HELP_TOPICS } from '../../data/employeeStart';
import * as api from '../../services/api';

export default function HelpRequestForm({ user, initialQuestion = '', initialContext = '', onSaved, onCancel }) {
  const id = useId();
  const [key, setKey] = useState(() => crypto.randomUUID());
  const stores = String(user?.dept || '').split(',').map(s => s.trim()).filter(Boolean);
  const [store, setStore] = useState(stores[0] || '');
  const [topic, setTopic] = useState('other');
  const [question, setQuestion] = useState(initialQuestion.slice(0, 2000));
  const [context, setContext] = useState(initialContext.slice(0, 3000));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const submit = async event => {
    event.preventDefault();
    if (busy || saved) return;
    setBusy(true); setError('');
    try {
      await api.createEmployeeHelp({ key, store, topic, question: question.trim(), context });
      setSaved(true); onSaved?.();
    } catch (err) { setError(err.message?.includes('HELP_RETRY_CONTENT_MISMATCH') ? 'Lần gửi trước đã được lưu với nội dung khác. Hãy tải lại danh sách để kiểm tra trước khi tạo yêu cầu mới.' : 'Chưa gửi được yêu cầu. Nội dung vẫn được giữ; bạn có thể thử lại.'); }
    finally { setBusy(false); }
  };
  if (saved) return <div role="status" className="rounded-xl bg-emerald-50 p-3 text-sm">Đã gửi yêu cầu. Theo dõi câu trả lời tại Hướng dẫn & hỗ trợ.
    <button type="button" className="ml-2 min-h-11 underline" onClick={() => { setSaved(false); setQuestion(''); setContext(''); setKey(crypto.randomUUID()); }}>Tạo yêu cầu khác</button></div>;
  return <form onSubmit={submit} className="space-y-3 rounded-xl border bg-white p-3 text-sm" data-testid="help-request-form">
    <h3 className="font-bold">Xem lại nội dung gửi quản lý</h3>
    <p className="text-xs text-slate-600">Chỉ nội dung dưới đây được gửi, không gửi toàn bộ lịch sử chat. Không điền mật khẩu hoặc thông tin nhạy cảm.</p>
    <label className="block" htmlFor={`${id}-store`}>Cửa hàng</label>
    <select id={`${id}-store`} className="w-full rounded border p-2" required value={store} onChange={e => setStore(e.target.value)}>{!stores.length && <option value="">Chưa phân cửa hàng</option>}{stores.map(s => <option key={s}>{s}</option>)}</select>
    <label className="block" htmlFor={`${id}-topic`}>Chủ đề cần hỗ trợ</label>
    <select id={`${id}-topic`} className="w-full rounded border p-2" value={topic} onChange={e => setTopic(e.target.value)}>{Object.entries(HELP_TOPICS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    {topic === 'timesheet' && <p className="text-xs">Nếu thiếu hoặc sai công, gửi tại <Link className="underline text-blue-700" to="/employee/feedback">Bù công C&B</Link> để xử lý đúng quy trình. Biểu mẫu này dành cho câu hỏi về cách sử dụng.</p>}
    {topic === 'schedule' && <p className="text-xs">Yêu cầu đổi ca cần gửi tại <Link className="underline text-blue-700" to="/employee/schedule?openSwaps=true">Lịch ca → Đổi ca</Link>.</p>}
    <label className="block" htmlFor={`${id}-question`}>Bạn chưa rõ điều gì?</label>
    <textarea id={`${id}-question`} className="w-full rounded border p-2" required minLength={5} maxLength={2000} rows={3} value={question} onChange={e => setQuestion(e.target.value)} />
    <label className="block" htmlFor={`${id}-context`}>Trích đoạn liên quan / đường dẫn và phiên bản Sổ tay (không bắt buộc)</label>
    <textarea id={`${id}-context`} className="w-full rounded border p-2" maxLength={3000} rows={3} value={context} onChange={e => setContext(e.target.value)} />
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy || !store || question.trim().length < 5} className="min-h-11 rounded-lg bg-blue-700 px-3 text-white disabled:opacity-50">{busy ? 'Đang gửi…' : 'Xác nhận gửi quản lý'}</button>
      {onCancel && <button type="button" disabled={busy} onClick={onCancel} className="min-h-11 rounded-lg border px-3">Hủy</button>}</div>
  </form>;
}
