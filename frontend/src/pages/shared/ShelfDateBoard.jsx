import { useEffect, useMemo, useState } from 'react';
import { Trash2, Search, CalendarClock, Save, Eye, X, AlertTriangle, Pencil } from 'lucide-react';
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

// ─── Modal Xem Chi Tiết (Read-only) ───────────────────────────────────────────
function ShelfDetailModal({ shelf, items, empName, onClose }) {
  if (!shelf) return null;
  const today = new Date();

  const expiryBadge = (item) => {
    const d1 = item.expiryDate ? new Date(item.expiryDate) : null;
    const d2 = item.expiryDate2 ? new Date(item.expiryDate2) : null;
    const earliest = [d1, d2].filter(Boolean).sort((a, b) => a - b)[0];
    if (!earliest) return null;
    const diff = Math.ceil((earliest - today) / 86400000);
    if (diff < 0) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">⚠️ Hết hạn</span>;
    if (diff <= 3) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">🟠 Còn {diff} ngày</span>;
    if (diff <= 7) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">🟡 Còn {diff} ngày</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">✅ Còn {diff} ngày</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <div className="font-black text-slate-800 text-base">{shelf.name || shelf.code}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              👤 NV: <span className="font-semibold text-slate-700">{empName(shelf.assigneeId)}</span>
              &nbsp;·&nbsp;
              📅 Hạn nộp: <span className="font-semibold text-slate-700">{shelf.dueDate || '—'}</span>
              &nbsp;·&nbsp;
              {items.length} sản phẩm
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 ml-3">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {items.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nhân viên chưa nhập hàng nào vào bảng này.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left sticky top-0">
                <tr>
                  <th className="px-3 py-2 rounded-tl-xl">STT</th>
                  <th className="px-3 py-2">Tên sản phẩm</th>
                  <th className="px-3 py-2">Mã SP</th>
                  <th className="px-3 py-2 text-center">SL</th>
                  <th className="px-3 py-2">HSD 1</th>
                  <th className="px-3 py-2">HSD 2</th>
                  <th className="px-3 py-2 rounded-tr-xl">Cảnh báo</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id || idx} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{item.productName || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{item.sku || '—'}</td>
                    <td className="px-3 py-2 text-center font-bold">{item.qty ?? '—'}</td>
                    <td className="px-3 py-2 text-xs">{item.expiryDate ? String(item.expiryDate).slice(0, 10) : '—'}</td>
                    <td className="px-3 py-2 text-xs">{item.expiryDate2 ? String(item.expiryDate2).slice(0, 10) : '—'}</td>
                    <td className="px-3 py-2">{expiryBadge(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400 text-right">
          Dữ liệu do <span className="font-semibold text-slate-600">{empName(shelf.assigneeId)}</span> nhập — chỉ đọc
        </div>
      </div>
    </div>
  );
}

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
    id: null,
    code: '',
    assigneeId: [],
    name: '',
    dueDate: '',
    notifyDays: DEFAULT_NOTIFY_DAYS
  });

  // State cho modal xem chi tiết
  const [detailShelf, setDetailShelf] = useState(null);

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
    setForm(f => ({ ...f, assigneeId: [] }));
  };

  const storeEmps = useMemo(
    () => (employees || []).filter(e => !activeStore || e.dept === activeStore),
    [employees, activeStore]
  );

  const empName = (ids) => {
    if (!ids) return 'Chưa giao';
    return ids.split(',').map(id => (employees || []).find(e => e.id === id)?.name || id).join(', ');
  };
  const storeLabel = getStoreLabel(stores, activeStore) || 'Chưa chọn cửa hàng';

  const storeShelves = useMemo(() => {
    let list = (shelves || []).filter(s => !activeStore || s.storeId === activeStore);
    if (!isManager) list = list.filter(s => s.assigneeId && s.assigneeId.split(',').includes(user?.id));
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
    if (filterEmp) list = list.filter(s => s.assigneeId && s.assigneeId.split(',').includes(filterEmp));
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

  const openDetail = (shelf) => {
    const items = (shelfItems || []).filter(i => i.shelfId === shelf.id);
    setDetailShelf({ shelf, items });
  };

  const editShelf = (shelf) => {
    setForm({
      id: shelf.id,
      code: shelf.code,
      assigneeId: shelf.assigneeId ? shelf.assigneeId.split(',') : [],
      name: shelf.name || '',
      dueDate: shelf.dueDate || '',
      notifyDays: shelf.notifyDays || DEFAULT_NOTIFY_DAYS
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selected = filteredShelves.find(s => s.id === selectedId) || storeShelves.find(s => s.id === selectedId) || null;

  const handleAssignTask = async () => {
    if (!activeStore) return alert('Chọn cửa hàng');
    if (!form.assigneeId || form.assigneeId.length === 0) return alert('Chọn ít nhất 1 nhân viên');
    if (!form.name.trim()) return alert('Nhập tên quầy / kệ');
    if (!form.dueDate) return alert('Chọn hạn nộp trên lịch');
    const slug = form.name.trim().replace(/\s+/g, '-').slice(0, 16) || 'KE';
    const code = form.id ? form.code : `${slug}-${String(Date.now()).slice(-4)}`.toUpperCase();
    try {
      const saved = await saveShelf({
        id: form.id,
        storeId: activeStore,
        code: code,
        name: form.name.trim(),
        assigneeId: form.assigneeId.join(','),
        dueDate: form.dueDate,
        notifyDays: Number(form.notifyDays) || DEFAULT_NOTIFY_DAYS
      });
      setForm({ id: null, code: '', assigneeId: [], name: '', dueDate: '', notifyDays: DEFAULT_NOTIFY_DAYS });
      if (!form.id) openShelf(saved);
      else alert('Đã cập nhật kệ!');
    } catch (e) {
      alert(e.message || 'Không lưu được. Kiểm tra kết nối.');
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
          <div className="text-sm font-black text-slate-800 mb-3">{form.id ? `Sửa nhiệm vụ kệ: ${form.name}` : `Giao nhiệm vụ tại ${storeLabel}`}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <Field label="1. Nhân viên (chọn nhiều)">
              <div className="mt-1 border border-slate-200 rounded-xl max-h-32 overflow-y-auto p-1 bg-white">
                {storeEmps.length === 0 ? <div className="p-2 text-xs text-slate-400">Không có NV</div> : storeEmps.map(e => (
                  <label key={e.id} className="flex items-center gap-2 py-1.5 px-2 hover:bg-slate-50 cursor-pointer rounded-lg transition-colors">
                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4" checked={form.assigneeId.includes(e.id)} onChange={(ev) => {
                      const newIds = ev.target.checked ? [...form.assigneeId, e.id] : form.assigneeId.filter(id => id !== e.id);
                      setForm({ ...form, assigneeId: newIds });
                    }} />
                    <span className="text-sm font-medium text-slate-700">{e.name}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="2. Quầy / kệ (nhập tên)">
              <input className={FIELD_CLS} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Kệ mát trái, quầy A1..." />
            </Field>
            <Field label="3. Hạn nộp">
              <input type="date" className={FIELD_CLS} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
            <div className="flex gap-2 w-full">
              {form.id && (
                <button type="button" onClick={() => setForm({ id: null, code: '', assigneeId: [], name: '', dueDate: '', notifyDays: DEFAULT_NOTIFY_DAYS })} className="flex items-center justify-center h-[42px] px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-colors w-1/3">
                  Hủy
                </button>
              )}
              <button type="button" onClick={handleAssignTask} className={`flex items-center justify-center gap-2 h-[42px] px-4 text-white rounded-xl text-sm font-bold transition-colors ${form.id ? 'bg-indigo-600 hover:bg-indigo-700 w-2/3' : 'bg-blue-600 hover:bg-blue-700 w-full'}`}>
                {form.id ? <Save size={16} /> : <CalendarClock size={16} />} 
                {form.id ? 'Lưu thay đổi' : 'Giao nhiệm vụ'}
              </button>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-slate-500 mt-4">
            Báo NV trước khi HSD còn
            <input type="number" min={1} max={14} className="w-14 border rounded-lg px-1.5 py-1 outline-none focus:ring-2 focus:ring-blue-500" value={form.notifyDays} onChange={e => setForm({ ...form, notifyDays: e.target.value })} />
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
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-3 py-2.5">Quầy / kệ</th>
              <th className="px-3 py-2.5">Nhân viên</th>
              <th className="px-3 py-2.5">Hạn nộp</th>
              <th className="px-3 py-2.5">Kiểm tra</th>
              <th className="px-3 py-2.5">Hàng HSD</th>
              <th className="px-3 py-2.5 w-52 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {filteredShelves.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Chưa có nhiệm vụ kệ.</td></tr>
            )}
            {filteredShelves.map(shelf => {
              const m = shelfCheckMeta(shelf, shelfItems);
              const isOwner = shelf.assigneeId && shelf.assigneeId.split(',').includes(user?.id);
              return (
                <tr key={shelf.id} className={`border-t border-slate-100 ${selectedId === shelf.id || form.id === shelf.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                  <td className="px-3 py-2 font-bold text-slate-800">{shelf.name || shelf.code}</td>
                  <td className="px-3 py-2 text-slate-600">{empName(shelf.assigneeId)}</td>
                  <td className={`px-3 py-2 font-semibold ${dueToneClass(m.due.key)}`}>{shelf.dueDate || '—'}<div className="text-[11px] font-normal">{m.due.label}</div></td>
                  <td className="px-3 py-2 text-slate-600">{m.items.length} món{m.lastSaved ? ` · ${String(m.lastSaved).slice(0, 10)}` : ''}</td>
                  <td className="px-3 py-2">{m.warn > 0 ? <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full text-xs">{m.warn} cảnh báo</span> : <span className="text-slate-400">OK</span>}</td>
                  <td className="px-3 py-2 flex items-center justify-end gap-1.5">
                    {/* Manager: Xem chi tiết */}
                    {isManager && (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors"
                        onClick={() => openDetail(shelf)}
                      >
                        <Eye size={13} /> Xem
                      </button>
                    )}
                    {/* Nhân viên được giao: Mở bảng nhập */}
                    {(isOwner || isManager) && (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition-colors"
                        onClick={() => openShelf(shelf)}
                      >
                        Mở bảng
                      </button>
                    )}
                    {isManager && (
                      <>
                        <button type="button" className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors ml-1" onClick={() => editShelf(shelf)} title="Sửa thông tin kệ">
                          <Pencil size={14} />
                        </button>
                        <button type="button" className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors" onClick={() => { if (confirm('Xóa kệ này? Toàn bộ sản phẩm sẽ bị xóa!')) deleteShelf(shelf.id).then(() => setSelectedId(id => id === shelf.id ? null : id)); }} title="Xóa kệ">
                          <Trash2 size={14} />
                        </button>
                      </>
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

      {/* Modal xem chi tiết read-only */}
      {detailShelf && (
        <ShelfDetailModal
          shelf={detailShelf.shelf}
          items={detailShelf.items}
          empName={empName}
          onClose={() => setDetailShelf(null)}
        />
      )}
    </div>
  );
}
