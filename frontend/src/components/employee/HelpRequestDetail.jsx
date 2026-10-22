import { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { HELP_STATUSES } from '../../data/employeeStart';

export default function HelpRequestDetail({ row, manager, userId, onChange, onClose }) {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState(null);
  const [historyError, setHistoryError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; setEvents(null); setHistoryError('');
    api.getEmployeeHelpEvents(row.id).then(value => { if (active) setEvents(value); })
      .catch(() => { if (active) setHistoryError('Chưa tải được nhật ký.'); });
    return () => { active = false; };
  }, [row.id, row.revision, retry]);
  const act = async action => {
    setBusy(true); setError('');
    try { onChange(await api.actEmployeeHelp(row, action, reply)); setReply(''); }
    catch (err) { setError(err.message?.includes('HELP_CONFLICT') ? 'Yêu cầu vừa được cập nhật. Đóng chi tiết và tải lại danh sách trước khi thao tác.' : 'Chưa lưu được thay đổi. Hãy thử lại.'); }
    finally { setBusy(false); }
  };
  const own = row.emp_id === userId;
  return <section className="rounded-xl border border-blue-200 bg-white p-4 space-y-3" aria-label="Chi tiết yêu cầu">
    <div className="flex justify-between gap-2"><h2 className="font-bold">{HELP_STATUSES[row.status]}</h2><button type="button" onClick={onClose} className="min-h-11 underline">Đóng chi tiết</button></div>
    <p className="whitespace-pre-wrap break-words">{row.question}</p>
    {row.context_excerpt && <details><summary className="cursor-pointer">Nội dung nhân viên chọn chia sẻ</summary><p className="whitespace-pre-wrap break-words text-sm">{row.context_excerpt}</p></details>}
    <p className="text-xs text-slate-600">Người phụ trách: {row.assigned_to || 'Chưa nhận xử lý'}</p>
    {row.reply && <div className="rounded-lg bg-blue-50 p-3"><h3 className="font-semibold">Trả lời của quản lý</h3><p className="whitespace-pre-wrap break-words">{row.reply}</p></div>}
    {manager && !own && row.status !== 'resolved' && <div className="space-y-2">
      {row.status === 'new' && <button type="button" disabled={busy} onClick={() => act('start')} className="min-h-11 rounded border px-3">Nhận xử lý</button>}
      <label className="block" htmlFor="help-manager-reply">Nội dung giải đáp</label><textarea id="help-manager-reply" rows={3} maxLength={3000} className="w-full rounded border p-2" value={reply} onChange={e => setReply(e.target.value)} />
      <button type="button" disabled={busy || reply.trim().length < 5} onClick={() => act('answer')} className="min-h-11 rounded bg-blue-700 px-3 text-white disabled:opacity-50">Gửi trả lời</button>
    </div>}
    {own && <div className="flex flex-wrap gap-2">
      {row.status === 'answered' && <button type="button" disabled={busy} onClick={() => act('resolve')} className="min-h-11 rounded bg-emerald-700 px-3 text-white">Tôi đã hiểu — đóng yêu cầu</button>}
      {['answered', 'resolved'].includes(row.status) && <button type="button" disabled={busy} onClick={() => act('reopen')} className="min-h-11 rounded border px-3">Tôi vẫn chưa rõ — mở lại</button>}
    </div>}
    {busy && <p role="status">Đang lưu…</p>}{error && <p role="alert" className="text-red-700">{error}</p>}
    <details><summary className="cursor-pointer">Nhật ký xử lý</summary>
      {historyError ? <p role="alert">{historyError} <button type="button" onClick={() => setRetry(v => v + 1)} className="min-h-11 underline">Tải lại nhật ký</button></p> : !events ? <p role="status">Đang tải nhật ký…</p> : <ol className="space-y-2 text-sm">{events.map(event => <li key={event.id} className="border-t pt-2 break-words">{new Date(event.created_at).toLocaleString('vi-VN')} · {event.actor_id} · {{ created: 'Đã gửi', start: 'Nhận xử lý', answer: 'Trả lời', resolve: 'Nhân viên xác nhận đã hiểu', reopen: 'Mở lại' }[event.action] || event.action}{event.body && <p className="whitespace-pre-wrap">{event.body}</p>}</li>)}</ol>}
    </details>
  </section>;
}
