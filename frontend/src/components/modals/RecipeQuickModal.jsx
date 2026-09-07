import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { Search, Sparkles, Copy, Check, Clock, Utensils, Droplets, Flame } from 'lucide-react';
import { FF_RECIPE_GROUPS, stripVi } from '../../data/ffOnsiteRecipes';

const CATEGORY_TABS = [
  { id: 'all', label: 'Tất cả', emoji: '🌟' },
  { id: 'mi', label: 'Mì & Tok', emoji: '🍜' },
  { id: 'nuoc', label: 'Nước & Trà', emoji: '☕' },
  { id: 'chien', label: 'Đồ chiên', emoji: '🍗' },
  { id: 'banh', label: 'Bánh & Hotdog', emoji: '🥖' },
  { id: 'tteobokki', label: 'Xốt & Tok', emoji: '🍢' },
  { id: 'lau', label: 'Lẩu Oden', emoji: '🍲' }
];

export default function RecipeQuickModal({ isOpen, onClose }) {
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Gom tất cả món từ các nhóm
  const allItems = useMemo(() => {
    const list = [];
    FF_RECIPE_GROUPS.forEach(group => {
      (group.items || []).forEach(item => {
        list.push({
          ...item,
          groupId: group.id,
          groupTitle: group.title,
          groupEmoji: group.emoji
        });
      });
    });
    return list;
  }, []);

  // Lọc theo Category và Search Query
  const filteredItems = useMemo(() => {
    const qNorm = stripVi(searchQuery);
    return allItems.filter(item => {
      // Lọc theo nhóm
      if (selectedCat !== 'all' && item.groupId !== selectedCat) {
        return false;
      }
      // Lọc theo từ khóa
      if (!qNorm) return true;
      const nameNorm = stripVi(item.name);
      const bodyNorm = stripVi(item.body);
      const aliasMatch = (item.aliases || []).some(a => stripVi(a).includes(qNorm));
      return nameNorm.includes(qNorm) || bodyNorm.includes(qNorm) || aliasMatch;
    });
  }, [allItems, selectedCat, searchQuery]);

  const handleCopy = (item) => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(`${item.name}\n${item.body}`).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Trích xuất highlight nhanh từ nội dung (thời gian, nhiệt độ, định lượng)
  const extractHighlights = (body) => {
    const highlights = [];
    const timeMatch = body.match(/(\d+\s*(?:phút|giây|p|s|p\d+)(?:\s*–\s*\d+\s*(?:phút|giây|p|s))?)/i);
    if (timeMatch) highlights.push({ icon: Clock, text: timeMatch[1].trim(), color: 'text-amber-700 bg-amber-50 border-amber-200' });

    const mlMatch = body.match(/(\d+\s*ml|\d+\s*g)/i);
    if (mlMatch) highlights.push({ icon: Droplets, text: mlMatch[1].trim(), color: 'text-blue-700 bg-blue-50 border-blue-200' });

    const microwaveMatch = body.match(/(số\s*2\s*—\s*\d+\s*lần|quay lò vi sóng|100°C)/i);
    if (microwaveMatch) highlights.push({ icon: Flame, text: microwaveMatch[1].trim(), color: 'text-rose-700 bg-rose-50 border-rose-200' });

    return highlights;
  };

  return (
    <Modal title="🍳 Sổ Tay Chế Biến & Pha Chế FF Onsite GS25" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-3.5 max-h-[80vh] flex flex-col -mx-1">
        {/* Banner giới thiệu nhanh */}
        <div className="p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <div>
              <strong className="block text-[11px] uppercase tracking-wide text-blue-800">Tra cứu công thức 1-chạm</strong>
              <p className="text-[10px] text-blue-600">Định lượng ml, gram, thời gian chiên/nấu máy quầy counter.</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-white/80 border border-blue-200 px-2 py-0.5 rounded-full text-blue-700">
            {filteredItems.length} món
          </span>
        </div>

        {/* Ô Tìm Kiếm Live */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Gõ tìm nhanh: mì tương đen, trà tắc, xúc xích, bột tok, hotdog..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs outline-none transition-all placeholder:text-slate-400 font-medium"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Thanh Danh Mục (Category Pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCat(tab.id)}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer text-[11px] ${
                selectedCat === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Danh Sách Thẻ Món */}
        <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[220px] max-h-[50vh] pr-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-1.5">
              <Utensils size={28} className="mx-auto text-slate-300" />
              <div className="text-xs font-bold text-slate-600">Không tìm thấy công thức "{searchQuery}"</div>
              <p className="text-[11px] text-slate-400">Hãy thử gõ tên không dấu, ví dụ: "mi", "tra tac", "xuc xich"</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const highlights = extractHighlights(item.body);
              const isCopied = copiedId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-3 bg-white border border-slate-200 hover:border-blue-300 rounded-xl shadow-2xs transition-all space-y-2"
                >
                  {/* Header Thẻ */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm">{item.groupEmoji}</span>
                        <h3 className="font-extrabold text-xs text-slate-900 leading-snug">{item.name}</h3>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                          {item.groupTitle}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(item)}
                      title="Sao chép công thức"
                      className="text-slate-400 hover:text-blue-600 p-1 rounded-md hover:bg-slate-100 transition-colors flex items-center gap-1 text-[10px] font-semibold flex-shrink-0 cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check size={12} className="text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Chép</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Highlights Bar */}
                  {highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {highlights.map((h, hIdx) => {
                        const Icon = h.icon;
                        return (
                          <span
                            key={hIdx}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${h.color}`}
                          >
                            <Icon size={10} />
                            <span>{h.text}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Nội Dung Công Thức & Bước Làm */}
                  <div className="p-2 bg-slate-50/80 rounded-lg text-slate-700 text-[11px] leading-relaxed whitespace-pre-line font-medium border border-slate-100">
                    {item.body.replace(/^[^\n]*\n/, '') || item.body}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Sparkles size={12} className="text-amber-500" /> Nguồn: Tiêu chuẩn FF Onsite GS25
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline text-xs px-3 py-1.5 cursor-pointer font-bold"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
}
