import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { Search, Sparkles, Copy, Check, Clock, Droplets, Flame, Utensils, X } from 'lucide-react';
import { FF_RECIPE_GROUPS, stripVi } from '../../data/ffOnsiteRecipes';

const CATEGORY_TABS = [
  { id: 'all',       label: 'Tất cả',      emoji: '🌟', color: 'blue'   },
  { id: 'mi',        label: 'Mì & Tok',    emoji: '🍜', color: 'amber'  },
  { id: 'nuoc',      label: 'Nước & Trà',  emoji: '☕', color: 'cyan'   },
  { id: 'chien',     label: 'Đồ chiên',    emoji: '🍗', color: 'orange' },
  { id: 'banh',      label: 'Bánh & Hotdog', emoji: '🥖', color: 'rose' },
  { id: 'tteobokki', label: 'Xốt & Tok',  emoji: '🍢', color: 'purple' },
  { id: 'lau',       label: 'Lẩu Oden',   emoji: '🍲', color: 'teal'   },
];

// Màu accent theo nhóm
const GROUP_ACCENT = {
  nuoc:      { bg: 'bg-cyan-50',   border: 'border-cyan-200',   badge: 'bg-cyan-100 text-cyan-800',   dot: 'bg-cyan-500'   },
  mi:        { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500'  },
  chien:     { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  banh:      { bg: 'bg-rose-50',   border: 'border-rose-200',   badge: 'bg-rose-100 text-rose-800',   dot: 'bg-rose-500'   },
  tteobokki: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
  lau:       { bg: 'bg-teal-50',   border: 'border-teal-200',   badge: 'bg-teal-100 text-teal-800',   dot: 'bg-teal-500'   },
};
const DEFAULT_ACCENT = { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' };

// Inline markdown renderer: **bold**, *italic*, `code`, bullet lines
function renderMarkdownBody(text) {
  if (!text) return null;
  // Bỏ dòng đầu (tên món lớn dạng "🍊 **Trà tắc**") vì đã hiển thị trong header
  const lines = text.split('\n');
  const bodyLines = lines[0].match(/^\S.*\*\*/) ? lines.slice(1) : lines;

  return bodyLines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-1.5" />;

    const isBullet = /^[•\-\*]\s/.test(trimmed);
    const content = isBullet ? trimmed.replace(/^[•\-\*]\s/, '') : trimmed;

    const parts = renderInline(content);

    if (isBullet) {
      return (
        <div key={i} className="flex gap-2 items-baseline">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-1.5" />
          <span className="leading-snug">{parts}</span>
        </div>
      );
    }
    return <div key={i} className="leading-snug">{parts}</div>;
  });
}

function renderInline(text) {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, m, k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    if (m[2] !== undefined) parts.push(<strong key={k++} className="font-black text-slate-900">{m[2]}</strong>);
    else if (m[3] !== undefined) parts.push(<em key={k++} className="italic text-slate-700">{m[3]}</em>);
    else if (m[4] !== undefined) parts.push(<code key={k++} className="bg-white border border-slate-200 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">{m[4]}</code>);
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>);
  return parts;
}

function extractHighlights(body) {
  const hl = [];
  const timeMatch = body.match(/(\d+\s*(?:phút|giây|p(?:\d+)?|s))(?:\s*[–-]\s*\d+\s*(?:phút|giây|p|s))?/i);
  if (timeMatch) hl.push({ icon: Clock,    text: timeMatch[0].trim(), cls: 'text-amber-700 bg-amber-50 border-amber-300' });
  const mlMatch  = body.match(/(\d+\s*(?:ml|g))/i);
  if (mlMatch)   hl.push({ icon: Droplets, text: mlMatch[1].trim(),   cls: 'text-blue-700 bg-blue-50 border-blue-300'   });
  const heatMatch = body.match(/(lò vi sóng|100°C|số\s*2)/i);
  if (heatMatch) hl.push({ icon: Flame,    text: heatMatch[1].trim(), cls: 'text-rose-700 bg-rose-50 border-rose-300'   });
  return hl;
}

export default function RecipeQuickModal({ isOpen, onClose }) {
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const allItems = useMemo(() => {
    const list = [];
    FF_RECIPE_GROUPS.forEach(group => {
      (group.items || []).forEach(item => {
        list.push({ ...item, groupId: group.id, groupTitle: group.title, groupEmoji: group.emoji });
      });
    });
    return list;
  }, []);

  const filteredItems = useMemo(() => {
    const qNorm = stripVi(searchQuery);
    return allItems.filter(item => {
      if (selectedCat !== 'all' && item.groupId !== selectedCat) return false;
      if (!qNorm) return true;
      const aliasMatch = (item.aliases || []).some(a => stripVi(a).includes(qNorm));
      return stripVi(item.name).includes(qNorm) || stripVi(item.body).includes(qNorm) || aliasMatch;
    });
  }, [allItems, selectedCat, searchQuery]);

  const handleCopy = (item) => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(`${item.name}\n${item.body}`).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <Modal title="🍳 Sổ Tay Chế Biến & Pha Chế FF Onsite GS25" isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-3 max-h-[80vh] -mx-1">

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm: mì tương đen, trà tắc, xúc xích, hotdog..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 focus:ring-3 focus:ring-blue-500/10 rounded-xl text-xs outline-none transition-all placeholder:text-slate-400 font-medium"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCat(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer text-[11px] flex-shrink-0 ${
                selectedCat === tab.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Count bar */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 px-0.5">
          <span>Hiển thị <strong className="text-slate-800">{filteredItems.length}</strong> công thức</span>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-blue-600 hover:underline font-bold cursor-pointer">
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-[220px] max-h-[52vh] pr-0.5">
          {filteredItems.length === 0 ? (
            <div className="text-center py-14 space-y-2">
              <Utensils size={32} className="mx-auto text-slate-200" />
              <p className="text-xs font-bold text-slate-500">Không tìm thấy "{searchQuery}"</p>
              <p className="text-[11px] text-slate-400">Thử gõ không dấu: "mi", "tra tac", "xuc xich"</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const accent  = GROUP_ACCENT[item.groupId] || DEFAULT_ACCENT;
              const isCopied = copiedId === item.id;
              const highlights = extractHighlights(item.body);

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border ${accent.border} overflow-hidden transition-all hover:shadow-md hover:shadow-slate-200/60`}
                >
                  {/* Card header */}
                  <div className={`flex items-center justify-between gap-2 px-3.5 py-2.5 ${accent.bg}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${accent.dot}`} />
                      <span className="text-sm leading-none">{item.groupEmoji}</span>
                      <h3 className="font-black text-sm text-slate-900 leading-tight truncate">{item.name}</h3>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider flex-shrink-0 ${accent.badge}`}>
                        {item.groupTitle}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(item)}
                      className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all cursor-pointer flex-shrink-0 ${
                        isCopied
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-white/70 text-slate-500 hover:text-blue-700 hover:bg-white border border-slate-200 hover:border-blue-300'
                      }`}
                      title="Sao chép công thức"
                    >
                      {isCopied
                        ? <><Check size={11} /><span>Đã chép</span></>
                        : <><Copy size={11} /><span>Chép</span></>
                      }
                    </button>
                  </div>

                  {/* Highlights chips */}
                  {highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-3.5 pt-2.5">
                      {highlights.map((h, idx) => {
                        const Icon = h.icon;
                        return (
                          <span key={idx} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${h.cls}`}>
                            <Icon size={9} />
                            {h.text}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Body */}
                  <div className="px-3.5 py-2.5 text-[12px] text-slate-700 leading-relaxed space-y-1">
                    {renderMarkdownBody(item.body)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Sparkles size={11} className="text-amber-400" />
            Tiêu chuẩn FF Onsite GS25
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline text-xs px-4 py-1.5 cursor-pointer font-bold"
          >
            Đóng
          </button>
        </div>

      </div>
    </Modal>
  );
}
