import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCopilotActivity } from '../../services/api';
import { summarizeCopilotActivity, copilotTopic } from '../../utils/copilotActivity';
import { stripVi } from '../../utils/textSearch';
import Button from '../ui/Button';
import { useStore } from '../../store/useStore';

export default function AICopilotAnalyticsWidget({ filterDept = 'ALL' }) {
  const user = useStore(s => s.user);
  return <Activity key={`${user?.id}:${user?.role}:${user?.dept}:${filterDept}`} storeId={filterDept} />;
}
function Activity({ storeId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [topic, setTopic] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    let live = true; setLoading(true); setError('');
    getCopilotActivity(storeId).then(data => { if (live) setRows(data); })
      .catch(() => { if (live) { setRows([]); setError('Chưa tải được lịch sử trợ lý. Hãy kiểm tra kết nối rồi tải lại.'); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [storeId, refresh]);
  const topics = useMemo(() => summarizeCopilotActivity(rows), [rows]);
  const filtered = rows.filter(row => (!topic || copilotTopic(row.userMessage) === topic) && stripVi(row.userMessage).includes(stripVi(search)));
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div>
      <h2 className="text-lg font-semibold">Tra cứu nhu cầu dùng TÚ mini</h2>
      <p className="mt-1 text-sm text-slate-600">Tối đa 200 lượt ghi nhận gần nhất trong phạm vi được phép. Nhóm chủ đề là phân loại tham khảo từ câu hỏi.</p>
    </div><Button disabled={loading} onClick={() => setRefresh(n => n + 1)}>Tải lại</Button></div>
    {loading ? <p role="status">Đang tải…</p> : error ? <p role="alert" className="text-red-700">{error}</p> : !rows.length ?
      <p className="py-4 text-sm text-slate-500">Chưa có lượt hỏi được ghi nhận. Chưa có số liệu để phân tích.</p> : <>
        <p className="text-sm text-slate-600">{rows.length} lượt hỏi · {rows.filter(row => row.error).length} lượt ghi nhận lỗi</p>
        <div className="flex flex-wrap gap-2" aria-label="Chủ đề có lượt hỏi thực tế">{topics.map(item => <Button key={item.topic} variant={topic === item.topic ? 'primary' : 'secondary'} aria-pressed={topic === item.topic} onClick={() => setTopic(topic === item.topic ? '' : item.topic)}>{item.topic} · {item.count}</Button>)}</div>
        <input aria-label="Tìm câu hỏi trợ lý" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm câu hỏi…" className="w-full rounded-lg border border-slate-300 p-3 text-base" />
        {(topic || search) && <Button onClick={() => { setTopic(''); setSearch(''); }}>Bỏ bộ lọc</Button>}
        <p className="text-xs text-slate-500">{filtered.length} lượt phù hợp · Hiển thị tối đa 20 lượt</p>
        <div className="divide-y divide-slate-200">{filtered.slice(0, 20).map(row => <article key={row.id} className="space-y-1 py-3">
          <p className="break-words text-sm text-slate-800">{row.userMessage}</p>
          <p className="text-xs text-slate-500">{row.storeId || 'Chưa ghi cửa hàng'} · {new Date(row.createdAt).toLocaleString('vi-VN')}{row.error ? ' · Có lỗi xử lý' : ''}</p>
        </article>)}</div>
      </>}
    <Link to="/admin/handbook" className="inline-block text-sm font-medium text-blue-700 underline">Bổ sung tài liệu còn thiếu trong Sổ tay</Link>
  </section>;
}
