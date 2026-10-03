import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BookOpen, Plus, Search, Edit2, Trash2, 
  FileText, RefreshCw 
} from 'lucide-react';
import { handbookApi } from '../../services/api/handbook';
import { toast } from '../../components/ui/toastStore';
import Modal from '../../components/modals/Modal';
import ConfirmModal from '../../components/modals/ConfirmModal';
import { useStore } from '../../store/useStore';

export const CATEGORY_OPTIONS = [
  { value: 'general', label: 'Chung (General)', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'quality', label: 'Chất lượng & Date (Quality)', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  { value: 'labor', label: 'Quy định & Nhân sự (Labor)', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'recipe', label: 'Công thức & SOP (Recipe)', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { value: 'ops', label: 'Vận hành & Vệ sinh (Ops)', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' }
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORY_OPTIONS.map(c => [c.value, c])
);

/**
 * Custom hook quản lý dữ liệu Sổ tay AI từ Supabase
 */
export function useHandbookEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await handbookApi.getAll();
      setEntries(data || []);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu Sổ tay:', err);
      setError(err);
      toast.error('Không thể tải danh sách Sổ tay: ' + (err.message || 'Lỗi mạng'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addEntry = async (entryData) => {
    const created = await handbookApi.create(entryData);
    setEntries(prev => [created, ...prev]);
    return created;
  };

  const updateEntry = async (id, updateData) => {
    const updated = await handbookApi.update(id, updateData);
    setEntries(prev => prev.map(item => item.id === id ? updated : item));
    return updated;
  };

  const deleteEntry = async (id) => {
    await handbookApi.remove(id);
    setEntries(prev => prev.filter(item => item.id !== id));
  };

  return {
    entries,
    loading,
    error,
    refresh: fetchEntries,
    addEntry,
    updateEntry,
    deleteEntry
  };
}

export default function HandbookManager() {
  const user = useStore(state => state.user);
  const { entries, loading, refresh, addEntry, updateEntry, deleteEntry } = useHandbookEntries();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal State (Thêm / Sửa)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    category: 'general',
    title: '',
    content: '',
    source_doc: ''
  });

  // Confirm Delete State
  const [deletingEntry, setDeletingEntry] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mở modal tạo mới
  const handleOpenAdd = () => {
    setEditingEntry(null);
    setFormData({
      category: 'general',
      title: '',
      content: '',
      source_doc: ''
    });
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({
      category: entry.category || 'general',
      title: entry.title || '',
      content: entry.content || '',
      source_doc: entry.source_doc || ''
    });
    setIsModalOpen(true);
  };

  // Lưu (Thêm hoặc Sửa)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanTitle = formData.title.trim();
    const cleanContent = formData.content.trim();

    if (!cleanTitle) {
      return toast.error('Vui lòng nhập tiêu đề cho entry.');
    }
    if (!cleanContent) {
      return toast.error('Vui lòng nhập nội dung cho entry.');
    }

    setIsSaving(true);
    try {
      if (editingEntry) {
        await updateEntry(editingEntry.id, {
          category: formData.category,
          title: cleanTitle,
          content: cleanContent,
          source_doc: formData.source_doc.trim() || null
        });
        toast.success('Đã cập nhật entry thành công!');
      } else {
        await addEntry({
          category: formData.category,
          title: cleanTitle,
          content: cleanContent,
          source_doc: formData.source_doc.trim() || null,
          created_by: user?.name || user?.id || 'Admin'
        });
        toast.success('Đã thêm entry sổ tay thành công!');
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error('Lỗi khi lưu entry: ' + (err.message || 'Không thể lưu dữ liệu'));
    } finally {
      setIsSaving(false);
    }
  };

  // Xóa entry
  const handleConfirmDelete = async () => {
    if (!deletingEntry) return;
    setIsDeleting(true);
    try {
      await deleteEntry(deletingEntry.id);
      toast.success('Đã xóa entry sổ tay thành công!');
      setDeletingEntry(null);
    } catch (err) {
      toast.error('Lỗi khi xóa entry: ' + (err.message || 'Không thể xóa'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Lọc danh sách entries
  const filteredEntries = useMemo(() => {
    return (entries || []).filter(entry => {
      if (selectedCategory !== 'all' && entry.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (entry.title || '').toLowerCase().includes(q);
        const matchContent = (entry.content || '').toLowerCase().includes(q);
        const matchSource = (entry.source_doc || '').toLowerCase().includes(q);
        return matchTitle || matchContent || matchSource;
      }
      return true;
    });
  }, [entries, selectedCategory, searchQuery]);

  return (
    <div className="p-3.5 sm:p-5 md:p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-200">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              📚 Quản lý Sổ tay AI
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Cơ sở tri thức động cho TÚ mini AI & quy trình nghiệp vụ GS25
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin text-blue-600' : ''} />
          </button>
          
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Plus size={17} />
            <span>+ Thêm entry</span>
          </button>
        </div>
      </div>

      {/* ── TOOLBAR: SEARCH & CATEGORY FILTER ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề, nội dung quy trình, tài liệu nguồn..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 placeholder-slate-400 transition-all"
          />
        </div>

        {/* Category Pills / Select */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Tất cả ({entries.length})
          </button>
          {CATEGORY_OPTIONS.map(cat => {
            const count = entries.filter(e => e.category === cat.value).length;
            const isSelected = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat.label.split(' ')[0]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── BẢNG DANH SÁCH HOẶC SKELETON ── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-slate-100 last:border-0 animate-pulse">
              <div className="h-6 w-24 bg-slate-200 rounded-full" />
              <div className="h-5 w-44 bg-slate-200 rounded" />
              <div className="flex-1 h-4 bg-slate-100 rounded" />
              <div className="h-8 w-20 bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center shadow-xs">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <BookOpen size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery || selectedCategory !== 'all' ? 'Không tìm thấy entry phù hợp' : 'Chưa có entry nào trong Sổ tay'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'all'
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác.'
              : 'Hãy thêm entry đầu tiên để trang bị kiến thức nghiệp vụ cho TÚ mini AI.'}
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>+ Thêm entry ngay</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4 w-36">Category</th>
                  <th className="py-3 px-4 w-56 sm:w-72">Title</th>
                  <th className="py-3 px-4">Preview nội dung</th>
                  <th className="py-3 px-4 w-28 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEntries.map(entry => {
                  const catMeta = CATEGORY_MAP[entry.category] || { label: entry.category, badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' };
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Cột Category */}
                      <td className="py-3 px-4 align-top">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${catMeta.badgeClass}`}>
                          {catMeta.label.split(' ')[0]}
                        </span>
                      </td>

                      {/* Cột Title */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-blue-600 transition-colors">
                          {entry.title}
                        </div>
                        {entry.source_doc && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <FileText size={12} className="flex-shrink-0" />
                            <span className="truncate max-w-[200px]" title={entry.source_doc}>
                              {entry.source_doc}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Cột Preview nội dung */}
                      <td className="py-3 px-4 align-top">
                        <div className="text-slate-600 line-clamp-2 leading-relaxed font-normal whitespace-pre-line text-xs">
                          {entry.content}
                        </div>
                      </td>

                      {/* Cột Thao tác */}
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(entry)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Sửa entry"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingEntry(entry)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa entry"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Hiển thị <strong>{filteredEntries.length}</strong> / <strong>{entries.length}</strong> entries</span>
            <span>Đồng bộ theo thời gian thực với AI knowledge base</span>
          </div>
        </div>
      )}

      {/* ── MODAL THÊM / SỬA ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingEntry ? '✏️ Chỉnh sửa Entry Sổ tay' : '➕ Thêm Entry Sổ tay AI mới'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Category (Chuyên mục) <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Source doc */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Source Document (Tài liệu gốc)
              </label>
              <input
                type="text"
                value={formData.source_doc}
                onChange={e => setFormData({ ...formData, source_doc: e.target.value })}
                placeholder="VD: BM: SOP-FFONSITE-CB-LAU-HN V.06 (tùy chọn)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Title (Tiêu đề) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="VD: Quy định giờ hủy thức ăn nhanh FF buổi sáng & tối"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Content (Textarea - Markdown) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Content (Nội dung hướng dẫn - Markdown) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">Hỗ trợ Markdown</span>
            </div>
            <textarea
              required
              rows={9}
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              placeholder={`Ví dụ:\n1. Sandwich rau & burger: Hủy lúc 11:00 và 22:00.\n2. Cơm Onigiri: Hủy lúc 19:00.\n* Lưu ý: Xé rách bao bì trước khi cho vào túi rác.`}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all leading-relaxed"
            />
          </div>

          {/* Modal Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{editingEntry ? 'Lưu thay đổi' : 'Thêm entry'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── CONFIRM DELETE DIALOG ── */}
      <ConfirmModal
        isOpen={Boolean(deletingEntry)}
        onClose={() => !isDeleting && setDeletingEntry(null)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa Entry Sổ tay"
        message={`Bạn có chắc chắn muốn xóa entry "${deletingEntry?.title || ''}" khỏi cơ sở dữ liệu Sổ tay AI?\nThao tác này sẽ ẩn entry khỏi hệ thống tra cứu.`}
        confirmText="Xóa entry"
        cancelText="Hủy bỏ"
        variant="danger"
        loading={isDeleting}
      />

    </div>
  );
}
