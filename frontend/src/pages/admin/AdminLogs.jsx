import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Search, ScrollText, Shield, Bot, Activity } from 'lucide-react';
import { canPickStore } from '../../lib/authSession';
import { describeDiff } from '../../utils/appLogs';

function JsonBlock({ title, value, tone }) {
  return (
    <div className="min-w-0">
      <div className={`text-[10px] font-bold uppercase mb-1 ${tone === 'old' ? 'text-red-600' : 'text-emerald-700'}`}>{title}</div>
      <pre className="text-[10px] font-mono bg-slate-50 border border-slate-200 rounded-lg p-2 overflow-auto max-h-40 whitespace-pre-wrap">
        {value == null ? 'null' : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

const TABS = [
  { id: 'activity', label: 'Hoạt động', icon: Activity },
  { id: 'audit', label: 'Audit (sửa dữ liệu)', icon: ScrollText },
  { id: 'security', label: 'Bảo mật', icon: Shield },
  { id: 'ai', label: 'AI chat', icon: Bot }
];

// Mảng / mảng trống dùng chung — giữ tham chiếu ổn định cho useMemo & React.memo
const EMPTY_ARR = [];

export default function AdminLogs() {
  const user = useStore(s => s.user);
  const activityLogs = useStore(s => s.activityLogs) || EMPTY_ARR;
  const auditLogs = useStore(s => s.auditLogs) || EMPTY_ARR;
  const aiConversations = useStore(s => s.aiConversations) || EMPTY_ARR;
  const adminLogs = useStore(s => s.adminLogs) || EMPTY_ARR;
  const loadAdminLogs = useStore(s => s.loadAdminLogs);
  const stores = useStore(s => s.stores) || EMPTY_ARR;
  const pickStore = canPickStore(user);

  const [tab, setTab] = useState('audit');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [storeFilter, setStoreFilter] = useState(pickStore ? 'ALL' : (user?.dept || 'ALL'));
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    loadAdminLogs?.();
  }, [loadAdminLogs]);

  const q = search.trim().toLowerCase();
  const matchStore = useCallback((storeId) => storeFilter === 'ALL' || storeId === storeFilter, [storeFilter]);

  const activityRows = useMemo(() => {
    const src = activityLogs.length
      ? activityLogs
      : adminLogs.map(l => ({
        id: l.id,
        userId: l.actorId,
        action: l.action,
        entityId: l.target,
        description: l.detail,
        category: 'activity',
        storeId: '',
        createdAt: l.createdAt,
        metadata: { actorName: l.actorName }
      }));
    return src.filter(l => {
      if (tab === 'security' && l.category !== 'security') return false;
      if (tab === 'activity' && l.category === 'security') return false;
      if (!matchStore(l.storeId)) return false;
      if (actionFilter !== 'ALL' && l.action !== actionFilter) return false;
      if (!q) return true;
      return [l.userId, l.metadata?.actorName, l.action, l.entityId, l.description, l.ipAddress]
        .some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [activityLogs, adminLogs, tab, matchStore, actionFilter, q]);

  const auditRows = useMemo(() => {
    return auditLogs.filter(l => {
      if (!matchStore(l.storeId)) return false;
      if (actionFilter !== 'ALL' && l.action !== actionFilter) return false;
      if (!q) return true;
      return [l.actorId, l.action, l.resourceType, l.resourceId, l.metadata?.description, JSON.stringify(l.oldData), JSON.stringify(l.newData)]
        .some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [auditLogs, matchStore, actionFilter, q]);

  const aiRows = useMemo(() => {
    return aiConversations.filter(l => {
      if (!matchStore(l.storeId)) return false;
      if (!q) return true;
      return [l.userId, l.userMessage, l.assistantResponse, l.intent, l.model]
        .some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [aiConversations, matchStore, q]);

  const actionOptions = useMemo(() => {
    const set = new Set();
    if (tab === 'audit') auditLogs.forEach(l => l.action && set.add(l.action));
    else if (tab === 'ai') aiConversations.forEach(l => l.intent && set.add(l.intent));
    else activityLogs.concat(adminLogs.map(l => ({ action: l.action }))).forEach(l => l.action && set.add(l.action));
    return ['ALL', ...[...set].sort()];
  }, [tab, auditLogs, activityLogs, adminLogs, aiConversations]);

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-6 h-full flex flex-col">
      <div className="flex flex-col gap-3 mb-3">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ScrollText size={20} className="text-indigo-600" />
            Nhật ký
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit lưu <span className="font-mono">old_data / new_data</span> JSONB — truy vết được từng trường (vd. SL 10 → 5). Chạy <span className="font-mono">sql_app_logs.sql</span> trên Supabase.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setActionFilter('ALL'); setOpenId(null); }}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                tab === t.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pickStore && (
            <select className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 font-semibold" value={storeFilter} onChange={e => setStoreFilter(e.target.value)}>
              <option value="ALL">Tất cả cửa hàng</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
            </select>
          )}
          <select className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 font-semibold" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            {actionOptions.map(a => (
              <option key={a} value={a}>{a === 'ALL' ? 'Tất cả' : a}</option>
            ))}
          </select>
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg w-48"
              placeholder="Tìm người, mã, nội dung..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
        {tab === 'audit' && (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 sticky top-0">
              <tr className="text-slate-600 font-bold">
                <th className="p-2.5 w-40">Thời gian</th>
                <th className="p-2.5">Người sửa</th>
                <th className="p-2.5">CH</th>
                <th className="p-2.5">Thao tác</th>
                <th className="p-2.5">Tài nguyên</th>
                <th className="p-2.5">Thay đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditRows.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Chưa có audit. Chạy sql_app_logs.sql rồi sửa lịch / NV / kệ.</td></tr>
              )}
              {auditRows.map(log => {
                const desc = log.metadata?.description || describeDiff(log.oldData || {}, log.newData || {});
                const open = openId === log.id;
                return (
                  <tr key={log.id} className="hover:bg-slate-50 align-top">
                    <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">{log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—'}</td>
                    <td className="p-2.5 font-mono">{log.actorId}</td>
                    <td className="p-2.5 font-mono">{log.storeId || '—'}</td>
                    <td className="p-2.5 font-semibold text-indigo-700">{log.action}</td>
                    <td className="p-2.5"><span className="text-slate-500">{log.resourceType}</span> <span className="font-mono">{log.resourceId}</span></td>
                    <td className="p-2.5">
                      <button type="button" className="text-left" onClick={() => setOpenId(open ? null : log.id)}>
                        <div className="text-slate-700">{desc || '—'}</div>
                        <div className="text-[10px] text-blue-600">{open ? 'Ẩn JSON' : 'Xem old / new'}</div>
                      </button>
                      {open && (
                        <div className="grid sm:grid-cols-2 gap-2 mt-2">
                          <JsonBlock title="old_data" value={log.oldData} tone="old" />
                          <JsonBlock title="new_data" value={log.newData} tone="new" />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {(tab === 'activity' || tab === 'security') && (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 sticky top-0">
              <tr className="text-slate-600 font-bold">
                <th className="p-2.5 w-40">Thời gian</th>
                <th className="p-2.5">User</th>
                <th className="p-2.5">CH</th>
                <th className="p-2.5">Action</th>
                <th className="p-2.5">Đối tượng</th>
                <th className="p-2.5">Mô tả</th>
                <th className="p-2.5">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activityRows.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Chưa có hoạt động.</td></tr>
              )}
              {activityRows.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">{log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—'}</td>
                  <td className="p-2.5">
                    <div className="font-bold">{log.metadata?.actorName || log.userId}</div>
                    <div className="font-mono text-[10px] text-slate-400">{log.userId}</div>
                  </td>
                  <td className="p-2.5 font-mono">{log.storeId || '—'}</td>
                  <td className="p-2.5 font-semibold text-indigo-700">{log.action}</td>
                  <td className="p-2.5 font-mono">{[log.entityType, log.entityId].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="p-2.5 text-slate-700">{log.description}</td>
                  <td className="p-2.5 font-mono text-[10px] text-slate-500">{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'ai' && (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 sticky top-0">
              <tr className="text-slate-600 font-bold">
                <th className="p-2.5 w-40">Thời gian</th>
                <th className="p-2.5">User</th>
                <th className="p-2.5">Intent</th>
                <th className="p-2.5">Model</th>
                <th className="p-2.5">ms</th>
                <th className="p-2.5">Hội thoại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aiRows.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Chưa có hội thoại AI trên cloud.</td></tr>
              )}
              {aiRows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50 align-top">
                  <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">{row.createdAt ? new Date(row.createdAt).toLocaleString('vi-VN') : '—'}</td>
                  <td className="p-2.5 font-mono">{row.userId}</td>
                  <td className="p-2.5">{row.intent || '—'}</td>
                  <td className="p-2.5 font-mono">{row.model || '—'}</td>
                  <td className="p-2.5">{row.latencyMs ?? '—'}</td>
                  <td className="p-2.5">
                    <div className="text-slate-800"><span className="text-slate-400">User:</span> {row.userMessage}</div>
                    <div className="text-slate-600 mt-0.5"><span className="text-slate-400">AI:</span> {String(row.assistantResponse || '').slice(0, 240)}</div>
                    {row.error && <div className="text-red-600 text-[10px]">{row.error}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
