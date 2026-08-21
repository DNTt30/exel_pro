import React, { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Search, ScrollText } from 'lucide-react';

export default function AdminLogs() {
  const adminLogs = useStore(state => state.adminLogs) || [];
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const actions = useMemo(() => {
    const set = new Set(adminLogs.map(l => l.action).filter(Boolean));
    return ['ALL', ...[...set].sort()];
  }, [adminLogs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return adminLogs.filter(l => {
      if (actionFilter !== 'ALL' && l.action !== actionFilter) return false;
      if (!q) return true;
      return [l.actorName, l.actorId, l.action, l.target, l.detail]
        .some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [adminLogs, search, actionFilter]);

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ScrollText size={20} className="text-indigo-600" />
            Nhật ký quản lý
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Theo dõi thao tác admin / SM ({filtered.length} dòng)</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 font-semibold"
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
          >
            {actions.map(a => (
              <option key={a} value={a}>{a === 'ALL' ? 'Tất cả thao tác' : a}</option>
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
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 sticky top-0">
            <tr className="text-slate-600 font-bold">
              <th className="p-2.5 w-40">Thời gian</th>
              <th className="p-2.5">Người thao tác</th>
              <th className="p-2.5">Thao tác</th>
              <th className="p-2.5">Đối tượng</th>
              <th className="p-2.5">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">Chưa có nhật ký. Chạy sql_admin_logs.sql rồi thao tác (thêm NV, sửa CH…).</td>
              </tr>
            ) : filtered.map(log => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—'}
                </td>
                <td className="p-2.5">
                  <div className="font-bold text-slate-800">{log.actorName || log.actorId}</div>
                  <div className="font-mono text-[10px] text-slate-400">{log.actorId}</div>
                </td>
                <td className="p-2.5 font-semibold text-indigo-700">{log.action}</td>
                <td className="p-2.5 font-mono text-slate-700">{log.target}</td>
                <td className="p-2.5 text-slate-600">{log.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
