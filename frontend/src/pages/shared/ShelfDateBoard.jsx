import { useEffect, useMemo, useState } from 'react';
import { Trash2, Search, CalendarClock, Save } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { isOpsManager, canPickStore as canPickAnyStore } from '../../lib/authSession';
import { getStoreLabel } from '../../utils/scheduleAnnotations';
import {
  DEFAULT_NOTIFY_DAYS,
  collectExpiryAlerts,
  dueToneClass,
  emptyShelfItemRow,
  shelfCheckMeta,
  toShelfItemRow
} from '../../utils/shelfExpiry';
import {
  FIELD_CLS,
  Field,
  StoreSelect,
  ExpiryAlertBanner,
  ShelfItemTable
} from '../../components/shelves/ShelfDateUi';

export default function ShelfDateBoard() {
  const { user, employees, stores, shelves, shelfItems, saveShelf, deleteShelf, saveShelfItems } = useStore();
  const isManager = isOpsManager(user);
  const canPickStore = canPickAnyStore(user);

  const [filterStore, setFilterStore] = useState(user?.dept || '');
  const [selectedId, setSelectedId] = useState(null);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterEmp, setFilterEmp] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({
    assigneeId: '',
    name: '',
    dueDate: '',
    notifyDays: DEFAULT_NOTIFY_DAYS
  });

  const activeStore = canPickStore ? filterStore : (user?.dept || '');

  useEffect(() => {
    if (!canPickStore) {
      if (user?.dept && filterStore !== user.dept) setFilterStore(user.dept);
      return;
    }
    const valid = (stores || []).some(s => s.id === filterStore);
    if (!valid && stores[0]?.id) setFilterStore(stores[0].id);
  }, [canPickStore, user?.dept, stores, filterStore]);

  const changeStore = (id) => {
    setFilterStore(id);
    setSelectedId(null);
    setFilterEmp('');
    setForm(f => ({ ...f, assigneeId: '' }));
  };

  const storeEmps = useMemo(
    () => (employees || []).filter(e => !activeStore || e.dept === activeStore),
    [employees, activeStore]
  );

  const empName = (id) => (employees || []).find(e => e.id === id)?.name || (id ? id : 'Chưa giao');
  const storeLabel = getStoreLabel(stores, activeStore) || 'Chưa chọn cửa hàng';

  const storeShelves = useMemo(() => {
    let list = (shelves || []).filter(s => !activeStore || s.storeId === activeStore);
    if (!isManager) list = list.filter(s => s.assigneeId === user?.id);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(s => {
        const emp = empName(s.assigneeId).toLowerCase();
        const items = (shelfItems || []).filter(i => i.shelfId === s.id);
        const hitItem = items.some(i =>
          (i.productName || '').toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q)
        );
        return s.code.toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q) || emp.includes(q) || hitItem;
      });
    }
    if (filterEmp) list = list.filter(s => s.assigneeId === filterEmp);
    return list;
  }, [shelves, shelfItems, activeStore, isManager, user?.id, search, filterEmp, employees]);

  const filteredShelves = useMemo(() => {
    if (filterStatus === 'all') return storeShelves;
    return storeShelves.filter(s => {
      const m = shelfCheckMeta(s, shelfItems);
      if (filterStatus === 'soon') return m.warn > 0;
      if (filterStatus === 'late') return m.due.key === 'late';
      if (filterStatus === 'done') return m.due.key === 'done';
      if (filterStatus === 'pending') return m.items.length === 0;
      return true;
    });
  }, [storeShelves, shelfItems, filterStatus]);

  const alerts = useMemo(
    () => collectExpiryAlerts(storeShelves, shelfItems),
    [storeShelves, shelfItems]
  );

  const openShelf = (shelf) => {
    setSelectedId(shelf.id);
    const existing = (shelfItems || []).filter(i => i.shelfId === shelf.id);
    setRows(existing.length ? existing.map(toShelfItemRow) : [emptyShelfItemRow()]);
  };

  const selected = filteredShelves.find(s => s.id === selectedId) || storeShelves.find(s => s.id === selectedId) || null;

  const handleAssignTask = async () => {
    if (!activeStore) return alert('Chọn cửa hàng');
    if (!form.assigneeId) return alert('Chọn nhân viên');
    if (!form.name.trim()) return alert('Nhập tên quầy / kệ');
    if (!form.dueDate) return alert('Chọn hạn nộp trên lịch');
    const slug = form.name.trim().replace(/\s+/g, '-').slice(0, 16) || 'KE';
    const code = `${slug}-${String(Date.now()).slice(-4)}`;
    try {
      const saved = await saveShelf({
        storeId: activeStore,
        code: code.toUpperCase(),
        name: form.name.trim(),
        assigneeId: form.assigneeId,
        dueDate: form.dueDate,
        notifyDays: Number(form.notifyDays) || DEFAULT_NOTIFY_DAYS
      });
      setForm({ assigneeId: '', name: '', dueDate: '', notifyDays: DEFAULT_NOTIFY_DAYS });
      openShelf(saved);
    } catch (e) {
      alert(e.message || 'Không giao được. Chạy sql_shelves.sql (có cột due_date) trên Supabase.');
    }
  };

  const handleSaveRows = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await saveShelfItems(selected.id, rows);
      alert('Đã lưu bảng date kệ ' + (selected.name || selected.code));
    } catch (e) {
      alert(e.message || 'Không lưu được.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full h-full p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">{isManager ? 'Kệ & date — giao việc' : 'Kệ được giao'}</h1>
          <p className="text-sm text-slate-500">
            {isManager
              ? 'Chọn nhân viên → tên quầy/kệ → hạn nộp → giao nhiệm vụ.'
              : 'Kiểm tra date hàng trên kệ, ghi vào bảng rồi Lưu trước hạn nộp.'}
          </p>
        </div>
        {canPickStore ? (
          <label className="text-sm font-semibold text-slate-600 min-w-[220px]">
            Cửa hàng
            <StoreSelect stores={stores} value={activeStore} onChange={changeStore} />
          </label>
        ) : (
          <div className="text-sm font-semibold text-slate-600">Cửa hàng: {storeLabel}</div>
        )}
      </div>

      {isManager && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-sm font-black text-slate-800 mb-3">Giao nhiệm vụ tại {storeLabel}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <Field label="1. Nhân viên">
              <select className={FIELD_CLS} value={form.assigneeId} onChange={e => setForm({ ...form, assigneeId: e.target.value })}>
                <option value="">-- Chọn NV trong CH --</option>
                {storeEmps.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
              </select>
            </Field>
            <Field label="2. Quầy / kệ (nhập tên)">
              <input className={FIELD_CLS} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Kệ mát trái, quầy A1..." />
            </Field>
            <Field label="3. Hạn nộp">
              <input type="date" className={FIELD_CLS} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
            <button type="button" onClick={handleAssignTask} className="flex items-center justify-center gap-2 h-[42px] px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold">
              <CalendarClock size={16} /> Giao nhiệm vụ
            </button>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-slate-500 mt-3">
            Báo NV trước khi HSD còn
            <input type="number" min={1} max={14} className="w-14 border rounded-lg px-1.5 py-1" value={form.notifyDays} onChange={e => setForm({ ...form, notifyDays: e.target.value })} />
            ngày
          </label>
        </div>
      )}

      <ExpiryAlertBanner alerts={alerts} />

      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm"
            placeholder="Tìm kệ, NV, tên SP, mã SP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {isManager && (
          <select className="border rounded-xl px-3 py-2 text-sm" value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
            <option value="">Tất cả NV</option>
            {storeEmps.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        )}
        <select className="border rounded-xl px-3 py-2 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chưa kiểm tra</option>
          <option value="done">Đã nộp</option>
          <option value="late">Trễ hạn nộp</option>
          <option value="soon">Hàng gần hết hạn</option>
        </select>
        <span className="text-xs text-slate-500">{filteredShelves.length} kệ</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-3 py-2.5">Quầy / kệ</th>
              <th className="px-3 py-2.5">Nhân viên</th>
              <th className="px-3 py-2.5">Hạn nộp</th>
              <th className="px-3 py-2.5">Kiểm tra</th>
              <th className="px-3 py-2.5">Hàng HSD</th>
              <th className="px-3 py-2.5 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {filteredShelves.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Chưa có nhiệm vụ kệ.</td></tr>
            )}
            {filteredShelves.map(shelf => {
              const m = shelfCheckMeta(shelf, shelfItems);
              return (
                <tr key={shelf.id} className={`border-t border-slate-100 ${selectedId === shelf.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                  <td className="px-3 py-2 font-bold">{shelf.name || shelf.code}</td>
                  <td className="px-3 py-2">{empName(shelf.assigneeId)}</td>
                  <td className={`px-3 py-2 font-semibold ${dueToneClass(m.due.key)}`}>{shelf.dueDate || '—'}<div className="text-[11px] font-normal">{m.due.label}</div></td>
                  <td className="px-3 py-2">{m.items.length} món{m.lastSaved ? ` · ${String(m.lastSaved).slice(0, 10)}` : ''}</td>
                  <td className="px-3 py-2">{m.warn > 0 ? <span className="font-bold text-amber-700">{m.warn} cảnh báo</span> : 'OK'}</td>
                  <td className="px-3 py-2">
                    <button type="button" className="text-blue-700 font-bold mr-2" onClick={() => openShelf(shelf)}>Mở bảng</button>
                    {isManager && (
                      <button type="button" className="text-red-600" onClick={() => { if (confirm('Xóa kệ này?')) deleteShelf(shelf.id).then(() => setSelectedId(id => id === shelf.id ? null : id)); }}><Trash2 size={14} /></button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <div className="font-black text-slate-800">Bảng date · {selected.name || selected.code}</div>
              <div className="text-xs text-slate-500">NV {empName(selected.assigneeId)} · hạn nộp {selected.dueDate || '—'}</div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRows([...rows, emptyShelfItemRow()])} className="px-3 py-2 border rounded-xl text-sm font-bold">+ Dòng</button>
              <button type="button" disabled={saving} onClick={handleSaveRows} className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                <Save size={15} /> {saving ? 'Đang lưu' : 'Lưu bảng'}
              </button>
            </div>
          </div>
          <ShelfItemTable rows={rows} onChange={setRows} notifyDays={selected.notifyDays} />
        </div>
      )}
    </div>
  );
}
