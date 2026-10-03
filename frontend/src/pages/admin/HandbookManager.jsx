import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen, Plus, Search, Edit2, Trash2,
  FileText, RefreshCw, Sparkles, ChevronDown, ChevronRight,
  ShieldCheck, Utensils, Settings, Info, Users,
  Copy, Check, Eye, EyeOff, Layers, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { handbookApi } from '../../services/api/handbook';
import { toast } from '../../components/ui/toastStore';
import Modal from '../../components/modals/Modal';
import ConfirmModal from '../../components/modals/ConfirmModal';
import { useStore } from '../../store/useStore';

export const CATEGORY_OPTIONS = [
  {
    value: 'quality',
    label: 'Chất lượng & Date',
    shortLabel: 'Chất lượng',
    icon: ShieldCheck,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/90',
    barColor: 'bg-amber-500',
    iconColor: 'text-amber-600 bg-amber-100/80',
    selectLabel: 'Chất lượng & Date (Quality)',
    desc: 'Quy định giờ hủy FF & GM, nhiệt độ tủ đông/mát, nguyên tắc FIFO'
  },
  {
    value: 'ops',
    label: 'Vận hành & Báo cáo',
    shortLabel: 'Vận hành',
    icon: Settings,
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200/90',
    barColor: 'bg-sky-500',
    iconColor: 'text-sky-600 bg-sky-100/80',
    selectLabel: 'Vận hành & Vệ sinh (Ops)',
    desc: 'Lịch vệ sinh 3 ca, hóa chất Saraya/Ecolab, báo cáo ảnh Gapo'
  },
  {
    value: 'recipe',
    label: 'Công thức & SOP',
    shortLabel: 'Công thức',
    icon: Utensils,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
    barColor: 'bg-emerald-500',
    iconColor: 'text-emerald-600 bg-emerald-100/80',
    selectLabel: 'Công thức & SOP (Recipe)',
    desc: 'Quy trình nấu súp chả cá, mì cay, nướng gà, pha nước, định lượng'
  },
  {
    value: 'labor',
    label: 'Quy định & Nhân sự',
    shortLabel: 'Nhân sự',
    icon: Users,
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/90',
    barColor: 'bg-indigo-500',
    iconColor: 'text-indigo-600 bg-indigo-100/80',
    selectLabel: 'Quy định & Nhân sự (Labor)',
    desc: 'Quy định đồng phục, ca làm, thời gian nghỉ ngơi, chính sách cửa hàng'
  },
  {
    value: 'general',
    label: 'Quy định Chung',
    shortLabel: 'Chung',
    icon: Info,
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    barColor: 'bg-slate-400',
    iconColor: 'text-slate-600 bg-slate-200/80',
    selectLabel: 'Chung (General)',
    desc: 'Tôn chỉ phục vụ, nội quy cơ sở, các hướng dẫn nghiệp vụ tổng quát'
  }
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORY_OPTIONS.map(c => [c.value, c])
);

/**
 * Custom hook quản lý dữ liệu Sổ tay AI
 * Hỗ trợ auto-reload khi chỉnh sửa & Realtime Supabase Channel
 */
export function useHandbookEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchEntries = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const data = await handbookApi.getAll();
      setEntries(data || []);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu Sổ tay:', err);
      setError(err);
      toast.error('Không thể tải Sổ tay AI: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries(false);

    // Supabase Realtime Channel: tự động đồng bộ khi DB thay đổi
    let channel = null;
    if (supabase && typeof supabase.channel === 'function') {
      try {
        channel = supabase
          .channel('realtime:handbook_entries')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'handbook_entries' },
            () => {
              fetchEntries(true);
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Realtime channel không thể khởi tạo:', e);
      }
    }

    return () => {
      if (channel && supabase && typeof supabase.removeChannel === 'function') {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchEntries]);

  // Cập nhật và load lại trang tự động ngay sau khi hoàn tất
  const addEntry = async (entryData) => {
    const created = await handbookApi.create(entryData);
    await fetchEntries(true);
    return created;
  };

  const updateEntry = async (id, updateData) => {
    const updated = await handbookApi.update(id, updateData);
    await fetchEntries(true);
    return updated;
  };

  const deleteEntry = async (id) => {
    await handbookApi.remove(id);
    await fetchEntries(true);
  };

  return {
    entries,
    loading,
    isRefreshing,
    error,
    refresh: () => fetchEntries(false),
    addEntry,
    updateEntry,
    deleteEntry
  };
}

/**
 * Hiển thị nội dung chi tiết với định dạng markdown/bullet point đẹp mắt
 */
function FormattedContent({ text }) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed font-sans select-text">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1.5" />;

        // Header Markdown: ### or ## or #
        if (trimmed.startsWith('###')) {
          return (
            <h4 key={idx} className="text-xs font-black text-slate-900 pt-1 pb-0.5 border-b border-slate-200/80">
              {trimmed.replace(/^###\s*/, '')}
            </h4>
          );
        }
        if (trimmed.startsWith('##')) {
          return (
            <h3 key={idx} className="text-xs font-black text-blue-900 pt-1.5 pb-0.5">
              {trimmed.replace(/^##\s*/, '')}
            </h3>
          );
        }

        // Bullet point
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          const content = trimmed.replace(/^[-•*]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-blue-500 font-bold leading-5">•</span>
              <span className="flex-1">{renderBoldText(content)}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s*(.+)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="font-bold text-blue-600 min-w-[18px] text-[11px]">{numMatch[1]}.</span>
              <span className="flex-1">{renderBoldText(numMatch[2])}</span>
            </div>
          );
        }

        // Warning or Quote block
        if (trimmed.startsWith('⚠️') || trimmed.startsWith('>') || trimmed.startsWith('🔥')) {
          return (
            <div key={idx} className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs font-medium my-1">
              {renderBoldText(trimmed.replace(/^>\s*/, ''))}
            </div>
          );
        }

        // Table row marker (simple render)
        if (trimmed.startsWith('|')) {
          if (trimmed.includes('---')) return null;
          const cells = trimmed.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
          return (
            <div key={idx} className="grid grid-cols-2 gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded text-[11px]">
              {cells.map((cell, cIdx) => (
                <div key={cIdx} className="font-medium text-slate-800">{cell.trim()}</div>
              ))}
            </div>
          );
        }

        return <p key={idx}>{renderBoldText(trimmed)}</p>;
      })}
    </div>
  );
}

function renderBoldText(str) {
  if (!str.includes('**')) return str;
  const parts = str.split('**');
  return parts.map((part, i) => (
    i % 2 === 1 ? <strong key={i} className="font-black text-slate-900">{part}</strong> : part
  ));
}

/**
 * Hàng List Item đại diện cho 1 entry trong Sổ tay
 */
function HandbookListRow({ entry, onEdit, onDelete, isExpanded, onToggleExpand }) {
  const [copied, setCopied] = useState(false);
  const cat = CATEGORY_MAP[entry.category] || CATEGORY_MAP.general;
  const Icon = cat.icon;

  const handleCopy = (e) => {
    e.stopPropagation();
    const textToCopy = `[${cat.shortLabel}] ${entry.title}\n\n${entry.content}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      toast.success('Đã sao chép quy trình vào bộ nhớ tạm!');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.info(entry.title);
    });
  };

  // Preview một dòng văn bản ngắn gọn
  const cleanSnippet = useMemo(() => {
    return (entry.content || '')
      .replace(/[#*`_>|]/g, '')
      .replace(/\n+/g, ' · ')
      .trim();
  }, [entry.content]);

  return (
    <div className={`transition-colors duration-150 border-b border-slate-100 last:border-b-0 ${
      isExpanded ? 'bg-blue-50/20' : 'hover:bg-slate-50/80 bg-white'
    }`}>
      {/* ── Main Row Bar ── */}
      <div 
        onClick={onToggleExpand}
        className="w-full px-3.5 sm:px-5 py-3 sm:py-3.5 flex items-start sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer select-none group"
      >
        {/* Left: Category Icon & Title details */}
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          {/* Category Icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0 transition-transform group-hover:scale-105 ${cat.iconColor}`}>
            <Icon size={16} />
          </div>

          {/* Title & Metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-blue-700 transition-colors leading-tight">
                {entry.title}
              </h3>
              
              {entry.source_doc && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200/80 text-[10px] font-medium" title={entry.source_doc}>
                  <FileText size={10} className="text-slate-400" />
                  <span className="max-w-[160px] sm:max-w-[240px] truncate">{entry.source_doc}</span>
                </span>
              )}
            </div>

            {/* Snippet (hiển thị khi chưa mở rộng) */}
            {!isExpanded && (
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-1 leading-normal font-normal">
                {cleanSnippet}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 mt-0.5 sm:mt-0" onClick={e => e.stopPropagation()}>
          {/* Nút Xem / Thu gọn */}
          <button
            type="button"
            onClick={onToggleExpand}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              isExpanded 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title={isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
          >
            {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            <span className="hidden md:inline text-[11px]">
              {isExpanded ? 'Thu gọn' : 'Chi tiết'}
            </span>
          </button>

          {/* Nút Copy */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            title="Sao chép nội dung"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          </button>

          {/* Nút Sửa */}
          <button
            type="button"
            onClick={() => onEdit(entry)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            title="Chỉnh sửa entry"
          >
            <Edit2 size={14} />
          </button>

          {/* Nút Xóa */}
          <button
            type="button"
            onClick={() => onDelete(entry)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Xóa entry"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* ── Expanded Full Details Panel ── */}
      {isExpanded && (
        <div className="px-4 sm:px-6 py-4 bg-slate-50/80 border-t border-slate-100/90 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${cat.badgeClass}`}>
                  {cat.label}
                </span>
                {entry.created_by && (
                  <span className="text-[11px] text-slate-400">
                    Người tạo: <strong className="text-slate-600">{entry.created_by}</strong>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(entry)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <Edit2 size={12} />
                  <span>Sửa nội dung</span>
                </button>
              </div>
            </div>

            {/* Nội dung markdown đã format */}
            <FormattedContent text={entry.content} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loader dạng hàng list
 */
function SkeletonListRows() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(sec => (
        <div key={sec} className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs animate-pulse">
          <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="h-4 w-44 bg-slate-200 rounded" />
            <div className="h-4 w-16 bg-slate-200 rounded-full" />
          </div>
          {[1, 2, 3].map(row => (
            <div key={row} className="px-4 py-3.5 border-b border-slate-100 last:border-b-0 flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-200 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-60 bg-slate-200 rounded" />
                <div className="h-2.5 w-full bg-slate-100 rounded" />
              </div>
              <div className="h-7 w-20 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * TRANG QUẢN LÝ SỔ TAY AI (HANDBOOK MANAGER)
 */
export default function HandbookManager() {
  const user = useStore(state => state.user);
  const { 
    entries, 
    loading, 
    isRefreshing, 
    refresh, 
    addEntry, 
    updateEntry, 
    deleteEntry 
  } = useHandbookEntries();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Expanded entries state: lưu set các id đang được mở rộng
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Modal State (Thêm / Sửa)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    category: 'quality',
    title: '',
    content: '',
    source_doc: ''
  });

  // Confirm Delete State
  const [deletingEntry, setDeletingEntry] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mở modal thêm mới với category tùy chọn
  const handleOpenAdd = (defaultCat = null) => {
    setEditingEntry(null);
    setFormData({
      category: defaultCat || (selectedCategory !== 'all' ? selectedCategory : 'quality'),
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
      category: entry.category || 'quality',
      title: entry.title || '',
      content: entry.content || '',
      source_doc: entry.source_doc || ''
    });
    setIsModalOpen(true);
  };

  // Toggle expand 1 entry
  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Mở rộng tất cả / Thu gọn tất cả
  const handleExpandAll = (expand) => {
    if (expand) {
      setExpandedIds(new Set(entries.map(e => e.id)));
    } else {
      setExpandedIds(new Set());
    }
  };

  // Lưu entry (Thêm hoặc Sửa)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanTitle = formData.title.trim();
    const cleanContent = formData.content.trim();

    if (!cleanTitle) return toast.error('Vui lòng nhập tiêu đề cho quy trình.');
    if (!cleanContent) return toast.error('Vui lòng nhập nội dung chi tiết.');

    setIsSaving(true);
    try {
      if (editingEntry) {
        await updateEntry(editingEntry.id, {
          category: formData.category,
          title: cleanTitle,
          content: cleanContent,
          source_doc: formData.source_doc.trim() || null
        });
        toast.success('Đã cập nhật quy trình Sổ tay thành công!');
      } else {
        await addEntry({
          category: formData.category,
          title: cleanTitle,
          content: cleanContent,
          source_doc: formData.source_doc.trim() || null,
          created_by: user?.name || user?.id || 'Admin'
        });
        toast.success('Đã thêm quy trình mới vào Sổ tay AI!');
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error('Lỗi khi lưu: ' + (err.message || 'Không thể ghi nhận dữ liệu'));
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
      toast.success('Đã xóa quy trình khỏi cơ sở dữ liệu Sổ tay!');
      setDeletingEntry(null);
    } catch (err) {
      toast.error('Lỗi khi xóa: ' + (err.message || 'Không thể xóa'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Danh sách entries đã lọc
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

  // Phân nhóm theo từng đầu mục Category
  const groupedSections = useMemo(() => {
    const map = new Map();
    CATEGORY_OPTIONS.forEach(cat => {
      map.set(cat.value, {
        category: cat,
        items: []
      });
    });

    filteredEntries.forEach(item => {
      const catKey = item.category || 'general';
      if (!map.has(catKey)) {
        map.set(catKey, {
          category: CATEGORY_MAP[catKey] || CATEGORY_MAP.general,
          items: []
        });
      }
      map.get(catKey).items.push(item);
    });

    // Chỉ trả về các category:
    // - Nếu chọn filter 'all': chỉ hiển thị những category có items (hoặc tất cả nếu chưa có filter)
    // - Nếu chọn filter cụ thể: chỉ hiển thị category đó
    if (selectedCategory !== 'all') {
      const sec = map.get(selectedCategory);
      return sec ? [sec] : [];
    }

    return Array.from(map.values()).filter(sec => sec.items.length > 0);
  }, [filteredEntries, selectedCategory]);

  return (
    <div className="w-full px-3.5 sm:px-6 py-4 sm:py-5 space-y-4 animate-in fade-in duration-150">

      {/* ── HEADER PANEL: Thanh lịch, cân bằng màu sắc, chuẩn phong cách GS25 ── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Tiêu đề & Giới thiệu */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
            <BookOpen size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Quản lý Sổ tay AI & Quy trình GS25
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-[10px] font-bold">
                <Sparkles size={11} className="text-blue-500" />
                TÚ mini AI
              </span>
              {isRefreshing && (
                <span className="text-[10px] text-blue-600 font-medium animate-pulse flex items-center gap-1">
                  <RefreshCw size={10} className="animate-spin" /> Đang đồng bộ...
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cơ sở tri thức động cho trợ lý AI · Tự động nạp kiến thức mới ngay khi quản trị viên chỉnh sửa
            </p>
          </div>
        </div>

        {/* Nút hành động chính */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={refresh}
            disabled={loading || isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Tải lại dữ liệu từ máy chủ"
          >
            <RefreshCw size={14} className={loading || isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAdd()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Thêm quy định</span>
          </button>
        </div>
      </div>

      {/* ── THANH THỐNG KÊ & BỘ LỌC ĐẦU MỤC ── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 sm:p-3.5 space-y-3">
        {/* Stats Row & Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {/* Nút Tất cả */}
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
            }`}
          >
            <Layers size={13} />
            <span>Tất cả ({entries.length})</span>
          </button>

          {/* Nút từng chuyên mục */}
          {CATEGORY_OPTIONS.map(cat => {
            const count = entries.filter(e => e.category === cat.value).length;
            const isSelected = selectedCategory === cat.value;
            const Icon = cat.icon;

            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
                }`}
              >
                <Icon size={13} className={isSelected ? 'text-white' : 'text-slate-400'} />
                <span>{cat.shortLabel}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Thanh Tìm kiếm & Nút Mở rộng */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tiêu đề, nội dung quy trình, mã tài liệu SOP..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleExpandAll(true)}
              className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors text-[11px] font-bold cursor-pointer"
            >
              Mở rộng tất cả
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => handleExpandAll(false)}
              className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-[11px] font-bold cursor-pointer"
            >
              Thu gọn
            </button>
          </div>
        </div>
      </div>

      {/* ── NỘI DUNG DANH SÁCH THEO TỪNG ĐẦU MỤC ── */}
      {loading ? (
        <SkeletonListRows />
      ) : filteredEntries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <BookOpen size={28} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {searchQuery || selectedCategory !== 'all' ? 'Không tìm thấy quy trình phù hợp' : 'Chưa có quy trình nào trong Sổ tay AI'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'all'
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc chọn chuyên mục khác.'
              : 'Hãy thêm quy trình đầu tiên để trang bị kiến thức nghiệp vụ cho TÚ mini AI.'}
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => handleOpenAdd()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>+ Thêm quy định mới</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedSections.map(sec => {
            const cat = sec.category;
            const Icon = cat.icon;

            return (
              <div 
                key={cat.value} 
                className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
              >
                {/* ── Section Header (Đầu mục) ── */}
                <div className="px-4 sm:px-5 py-3 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.iconColor}`}>
                      <Icon size={15} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                          {cat.label}
                        </h2>
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${cat.badgeClass}`}>
                          {sec.items.length} quy định
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 hidden sm:block">
                        {cat.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAdd(cat.value)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus size={12} />
                      <span className="hidden sm:inline">Thêm vào mục này</span>
                    </button>
                  </div>
                </div>

                {/* ── Danh sách các hàng list bên trong đầu mục ── */}
                <div className="divide-y divide-slate-100">
                  {sec.items.map(entry => (
                    <HandbookListRow
                      key={entry.id}
                      entry={entry}
                      onEdit={handleOpenEdit}
                      onDelete={setDeletingEntry}
                      isExpanded={expandedIds.has(entry.id)}
                      onToggleExpand={() => toggleExpand(entry.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Footer note */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 py-1">
            <span>
              Hiển thị <strong className="text-slate-600">{filteredEntries.length}</strong> / <strong className="text-slate-600">{entries.length}</strong> quy định
            </span>
            <span>
              Đồng bộ dữ liệu thời gian thực với TÚ mini Copilot
            </span>
          </div>
        </div>
      )}

      {/* ── MODAL THÊM / SỬA QUY TRÌNH ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingEntry ? '✏️ Chỉnh sửa Quy trình Sổ tay' : '➕ Thêm Quy trình Sổ tay AI mới'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chuyên mục (Category) <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.selectLabel}
                  </option>
                ))}
              </select>
            </div>

            {/* Source doc */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mã tài liệu gốc (Source Document)
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
              Tiêu đề quy trình <span className="text-red-500">*</span>
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
                Nội dung quy trình (Hỗ trợ Markdown) <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Hỗ trợ bullet, số thứ tự, in đậm **text**
              </span>
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

          {/* Modal Footer */}
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
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{editingEntry ? 'Lưu cập nhật' : 'Thêm quy định'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── CONFIRM DELETE DIALOG ── */}
      <ConfirmModal
        isOpen={Boolean(deletingEntry)}
        onClose={() => !isDeleting && setDeletingEntry(null)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa quy trình"
        message={`Bạn có chắc chắn muốn xóa quy trình "${deletingEntry?.title || ''}" khỏi cơ sở dữ liệu Sổ tay AI?\nThao tác này sẽ ẩn quy trình khỏi hệ thống tra cứu.`}
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
