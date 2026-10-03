import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen, Plus, Search, Edit2, Trash2,
  FileText, RefreshCw, Sparkles, ChevronRight,
  ShieldCheck, FlameKindling, Utensils, Settings, Info
} from 'lucide-react';
import { handbookApi } from '../../services/api/handbook';
import { toast } from '../../components/ui/toastStore';
import Modal from '../../components/modals/Modal';
import ConfirmModal from '../../components/modals/ConfirmModal';
import { useStore } from '../../store/useStore';

export const CATEGORY_OPTIONS = [
  {
    value: 'general',
    label: 'Chung',
    icon: Info,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    cardClass: 'border-l-blue-400 bg-blue-50/30',
    iconClass: 'bg-blue-100 text-blue-600',
    selectLabel: 'Chung (General)',
  },
  {
    value: 'quality',
    label: 'Chất lượng',
    icon: ShieldCheck,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    cardClass: 'border-l-amber-400 bg-amber-50/30',
    iconClass: 'bg-amber-100 text-amber-600',
    selectLabel: 'Chất lượng & Date (Quality)',
  },
  {
    value: 'labor',
    label: 'Nhân sự',
    icon: FlameKindling,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    cardClass: 'border-l-purple-400 bg-purple-50/30',
    iconClass: 'bg-purple-100 text-purple-600',
    selectLabel: 'Quy định & Nhân sự (Labor)',
  },
  {
    value: 'recipe',
    label: 'Công thức',
    icon: Utensils,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cardClass: 'border-l-emerald-400 bg-emerald-50/30',
    iconClass: 'bg-emerald-100 text-emerald-600',
    selectLabel: 'Công thức & SOP (Recipe)',
  },
  {
    value: 'ops',
    label: 'Vận hành',
    icon: Settings,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    cardClass: 'border-l-rose-400 bg-rose-50/30',
    iconClass: 'bg-rose-100 text-rose-600',
    selectLabel: 'Vận hành & Vệ sinh (Ops)',
  },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORY_OPTIONS.map(c => [c.value, c]));

export function useHandbookEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await handbookApi.getAll();
      setEntries(data || []);
    } catch (err) {
      setError(err);
      toast.error('Không thể tải danh sách Sổ tay: ' + (err.message || 'Lỗi mạng'));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const addEntry = async (d) => { const c = await handbookApi.create(d); setEntries(p => [c, ...p]); return c; };
  const updateEntry = async (id, d) => { const u = await handbookApi.update(id, d); setEntries(p => p.map(i => i.id === id ? u : i)); return u; };
  const deleteEntry = async (id) => { await handbookApi.remove(id); setEntries(p => p.filter(i => i.id !== id)); };

  return { entries, loading, error, refresh: fetchEntries, addEntry, updateEntry, deleteEntry };
}

/* ── STAT CARD ── */
function StatCard({ cat, count, active, onClick }) {
  const Icon = cat.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer text-left w-full ${
        active
          ? 'border-blue-400 bg-blue-600 shadow-lg shadow-blue-500/20 scale-[1.02]'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-white/20' : cat.iconClass}`}>
        <Icon size={17} className={active ? 'text-white' : ''} />
      </div>
      <div className="min-w-0">
        <div className={`text-[11px] font-bold truncate ${active ? 'text-blue-100' : 'text-slate-500'}`}>{cat.label}</div>
        <div className={`text-xl font-black leading-none ${active ? 'text-white' : 'text-slate-800'}`}>{count}</div>
      </div>
    </button>
  );
}

/* ── ENTRY CARD ── */
function EntryCard({ entry, onEdit, onDelete }) {
  const cat = CATEGORY_MAP[entry.category] || CATEGORY_MAP.general;
  const Icon = cat.icon;
  const preview = (entry.content || '').replace(/[#*`_>]/g, '').replace(/\n+/g, ' ').trim().slice(0, 130);

  return (
    <div className={`group relative bg-white rounded-2xl border border-l-4 shadow-xs hover:shadow-md transition-all overflow-hidden ${cat.cardClass}`}>
      {/* top bar */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.iconClass}`}>
            <Icon size={15} />
          </div>
          <div className="min-w-0">
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${cat.badgeClass} mb-0.5`}>
              {cat.label}
            </span>
            <h3 className="font-black text-slate-800 text-sm leading-tight line-clamp-1 group-hover:text-blue-700 transition-colors">
              {entry.title}
            </h3>
          </div>
        </div>

        {/* action buttons — appear on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            type="button"
            onClick={() => onEdit(entry)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            title="Sửa"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(entry)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Xóa"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* preview */}
      <div className="px-4 pb-3">
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{preview}…</p>
      </div>

      {/* footer */}
      {entry.source_doc && (
        <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-1.5 bg-slate-50/60">
          <FileText size={11} className="text-slate-400 flex-shrink-0" />
          <span className="text-[10px] text-slate-400 truncate">{entry.source_doc}</span>
        </div>
      )}
    </div>
  );
}

/* ── SKELETON CARDS ── */
function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-l-4 border-l-slate-200 border-slate-200 p-4 space-y-3 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-200 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-16 bg-slate-200 rounded-full" />
              <div className="h-4 w-40 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="h-3 w-3/4 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── MAIN PAGE ── */
export default function HandbookManager() {
  const user = useStore(state => state.user);
  const { entries, loading, refresh, addEntry, updateEntry, deleteEntry } = useHandbookEntries();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ category: 'general', title: '', content: '', source_doc: '' });
  const [deletingEntry, setDeletingEntry] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenAdd = () => {
    setEditingEntry(null);
    setFormData({ category: 'general', title: '', content: '', source_doc: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({ category: entry.category || 'general', title: entry.title || '', content: entry.content || '', source_doc: entry.source_doc || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanTitle = formData.title.trim();
    const cleanContent = formData.content.trim();
    if (!cleanTitle) return toast.error('Vui lòng nhập tiêu đề.');
    if (!cleanContent) return toast.error('Vui lòng nhập nội dung.');
    setIsSaving(true);
    try {
      if (editingEntry) {
        await updateEntry(editingEntry.id, { category: formData.category, title: cleanTitle, content: cleanContent, source_doc: formData.source_doc.trim() || null });
        toast.success('Đã cập nhật entry!');
      } else {
        await addEntry({ category: formData.category, title: cleanTitle, content: cleanContent, source_doc: formData.source_doc.trim() || null, created_by: user?.name || user?.id || 'Admin' });
        toast.success('Đã thêm entry mới!');
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error('Lỗi khi lưu: ' + (err.message || 'Thử lại sau'));
    } finally { setIsSaving(false); }
  };

  const handleConfirmDelete = async () => {
    if (!deletingEntry) return;
    setIsDeleting(true);
    try {
      await deleteEntry(deletingEntry.id);
      toast.success('Đã xóa entry!');
      setDeletingEntry(null);
    } catch (err) {
      toast.error('Lỗi khi xóa: ' + (err.message || 'Thử lại'));
    } finally { setIsDeleting(false); }
  };

  const filteredEntries = useMemo(() => (entries || []).filter(e => {
    if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (e.title||'').toLowerCase().includes(q) || (e.content||'').toLowerCase().includes(q) || (e.source_doc||'').toLowerCase().includes(q);
    }
    return true;
  }), [entries, selectedCategory, searchQuery]);

  return (
    <div className="p-3.5 sm:p-5 md:p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-200">

      {/* ── HEADER ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-2xl p-5 sm:p-6 text-white shadow-xl shadow-blue-500/20">
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <BookOpen size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight">Quản lý Sổ tay AI</h1>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-bold flex items-center gap-1">
                  <Sparkles size={10} /> TÚ mini
                </span>
              </div>
              <p className="text-blue-100 text-xs mt-0.5">Cơ sở tri thức động cho AI & quy trình nghiệp vụ GS25</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button" onClick={refresh} disabled={loading}
              className="p-2 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              title="Tải lại"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button" onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 rounded-xl font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Thêm entry</span>
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative mt-5 grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 text-center">
          <div className="col-span-3 sm:col-span-1 bg-white/10 rounded-xl py-2.5 px-3">
            <div className="text-2xl font-black">{entries.length}</div>
            <div className="text-[10px] text-blue-200 font-bold mt-0.5">Tổng entries</div>
          </div>
          {CATEGORY_OPTIONS.map(cat => (
            <div key={cat.value} className="bg-white/10 rounded-xl py-2.5 px-2">
              <div className="text-xl font-black">{entries.filter(e => e.category === cat.value).length}</div>
              <div className="text-[10px] text-blue-200 font-bold mt-0.5 truncate">{cat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SEARCH + FILTER ── */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề, nội dung, tài liệu nguồn..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 placeholder-slate-400 shadow-xs transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button" onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'all' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            Tất cả ({entries.length})
          </button>
          {CATEGORY_OPTIONS.map(cat => {
            const count = entries.filter(e => e.category === cat.value).length;
            const active = selectedCategory === cat.value;
            const Icon = cat.icon;
            return (
              <button
                key={cat.value} type="button" onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  active ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                <Icon size={12} />
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENT ── */}
      {loading ? (
        <SkeletonCards />
      ) : filteredEntries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center shadow-xs">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen size={30} className="text-blue-400" />
          </div>
          <h3 className="text-base font-black text-slate-800">
            {searchQuery || selectedCategory !== 'all' ? 'Không tìm thấy entry phù hợp' : 'Sổ tay AI đang trống'}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
            {searchQuery || selectedCategory !== 'all'
              ? 'Thử thay đổi từ khóa hoặc chọn danh mục khác.'
              : 'Thêm quy định, SOP, công thức vào đây để TÚ mini trả lời chính xác hơn.'}
          </p>
          {!searchQuery && selectedCategory === 'all' && (
            <button
              type="button" onClick={handleOpenAdd}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer"
            >
              <Plus size={14} /> Thêm entry đầu tiên
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEntries.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onEdit={handleOpenEdit}
                onDelete={setDeletingEntry}
              />
            ))}
          </div>
          <div className="text-center text-[11px] text-slate-400 py-2">
            Hiển thị <strong className="text-slate-600">{filteredEntries.length}</strong> / <strong className="text-slate-600">{entries.length}</strong> entries · Đồng bộ real-time với TÚ mini AI
          </div>
        </>
      )}

      {/* ── MODAL THÊM / SỬA ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingEntry ? '✏️ Chỉnh sửa Entry Sổ tay' : '➕ Thêm Entry Sổ tay mới'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Chuyên mục <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.selectLabel}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tài liệu nguồn
              </label>
              <input
                type="text" value={formData.source_doc}
                onChange={e => setFormData({ ...formData, source_doc: e.target.value })}
                placeholder="VD: SOP-FF-CB-LAU V.06 (tùy chọn)"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text" required value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="VD: Quy định giờ hủy thức ăn nhanh FF buổi sáng & tối"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Nội dung <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Hỗ trợ Markdown</span>
            </div>
            <textarea
              required rows={9} value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              placeholder={`Ví dụ:\n1. Sandwich rau & burger: Hủy lúc 11:00 và 22:00.\n2. Cơm Onigiri: Hủy lúc 19:00.\n* Lưu ý: Xé rách bao bì trước khi cho vào túi rác.`}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all leading-relaxed resize-y"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit" disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{editingEntry ? 'Lưu thay đổi' : 'Thêm entry'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── CONFIRM DELETE ── */}
      <ConfirmModal
        isOpen={Boolean(deletingEntry)}
        onClose={() => !isDeleting && setDeletingEntry(null)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa Entry"
        message={`Bạn có chắc muốn xóa entry "${deletingEntry?.title || ''}"?\nEntry sẽ bị ẩn khỏi hệ thống tra cứu của TÚ mini.`}
        confirmText="Xóa entry"
        cancelText="Hủy bỏ"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
