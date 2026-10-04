import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { getAdminLogs } from '../../services/api/logs';
import { 
  Bot, Sparkles, MessageSquare, Users, TrendingUp, Clock, 
  Search, BookOpen, RefreshCw, Calendar, ArrowUpRight, ShieldCheck,
  ChevronRight, Utensils, AlertCircle, Award
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Phân loại câu hỏi dựa trên từ khóa thực tế của nhân viên GS25
function categorizeQuery(text = '') {
  const t = text.toLowerCase();
  if (/lịch|ca|ngày mai|hôm nay|tuần|đổi ca|trực|làm việc|off|nghỉ/i.test(t)) {
    return { id: 'schedule', label: 'Lịch & Ca làm', color: 'blue', icon: '📅', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  if (/công thức|pha|nấu|mì|trà|oden|lẩu|xúc xích|hotdog|chiên|tok|bánh|súp|gà/i.test(t)) {
    return { id: 'recipe', label: 'Công thức FF', color: 'amber', icon: '☕', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  if (/hủy|date|hạn|hàng tươi|cơm nắm|sandwich|onigiri|gimbap|bao lâu/i.test(t)) {
    return { id: 'shelf', label: 'Date & Hủy hàng', color: 'rose', icon: '🏷️', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
  }
  if (/lương|ot|tiền|thưởng|luật|phụ cấp|lễ|tết|đêm|hạn mức|91h|48h/i.test(t)) {
    return { id: 'labor', label: 'Lương & Chế độ', color: 'emerald', icon: '⚖️', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  return { id: 'other', label: 'Chung & Nghiệp vụ', color: 'purple', icon: '💬', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
}

export default function AICopilotAnalyticsWidget({ filterDept = 'ALL' }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isPending, startTransition] = useTransition();

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const data = await getAdminLogs();
      const aiQueries = (data || []).filter(l => l.action === 'AI_QUERY');
      setLogs(aiQueries);
    } catch (err) {
      console.warn('[AICopilotAnalytics] Lỗi tải logs:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Lọc theo cửa hàng được chọn từ Dashboard
  const scopedLogs = useMemo(() => {
    if (filterDept === 'ALL') return logs;
    return logs.filter(l => l.target === filterDept || l.target === 'ALL');
  }, [logs, filterDept]);

  // Thống kê phân tích tổng hợp
  const stats = useMemo(() => {
    const total = scopedLogs.length;
    const uniqueUsers = new Set(scopedLogs.map(l => l.actorId)).size;

    // Phân bổ theo chủ đề
    const categoryCounts = {
      schedule: 0,
      recipe: 0,
      shelf: 0,
      labor: 0,
      other: 0,
    };

    // Phân bổ theo khung giờ
    const hourBlocks = {
      morning: 0,   // 06:00 - 12:00
      afternoon: 0, // 12:00 - 18:00
      evening: 0,   // 18:00 - 22:00
      night: 0,     // 22:00 - 06:00
    };

    // Theo 7 ngày gần nhất
    const last7DaysMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      last7DaysMap[key] = { label, count: 0 };
    }

    // Top người dùng & Cửa hàng
    const userQueryMap = {};
    const storeQueryMap = {};

    scopedLogs.forEach(l => {
      // Chủ đề
      const cat = categorizeQuery(l.detail);
      categoryCounts[cat.id] = (categoryCounts[cat.id] || 0) + 1;

      // Khung giờ
      const date = l.createdAt ? new Date(l.createdAt) : new Date();
      const hour = date.getHours();
      if (hour >= 6 && hour < 12) hourBlocks.morning++;
      else if (hour >= 12 && hour < 18) hourBlocks.afternoon++;
      else if (hour >= 18 && hour < 22) hourBlocks.evening++;
      else hourBlocks.night++;

      // 7 ngày
      const dayKey = l.createdAt ? l.createdAt.slice(0, 10) : '';
      if (last7DaysMap[dayKey]) {
        last7DaysMap[dayKey].count++;
      }

      // User
      const uKey = `${l.actorName || l.actorId} (${l.target || 'Store'})`;
      userQueryMap[uKey] = (userQueryMap[uKey] || 0) + 1;

      // Store
      const sKey = l.target || 'Chung';
      storeQueryMap[sKey] = (storeQueryMap[sKey] || 0) + 1;
    });

    const topUsers = Object.entries(userQueryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topStores = Object.entries(storeQueryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const dailyTrend = Object.values(last7DaysMap);
    const maxDaily = Math.max(...dailyTrend.map(d => d.count), 1);

    return {
      total,
      uniqueUsers,
      categoryCounts,
      hourBlocks,
      dailyTrend,
      maxDaily,
      topUsers,
      topStores
    };
  }, [scopedLogs]);

  // Bộ lọc danh sách câu hỏi
  const filteredFeed = useMemo(() => {
    let result = scopedLogs;
    if (selectedCategory !== 'ALL') {
      result = result.filter(l => categorizeQuery(l.detail).id === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l => 
        (l.detail || '').toLowerCase().includes(q) ||
        (l.actorName || '').toLowerCase().includes(q) ||
        (l.actorId || '').toLowerCase().includes(q)
      );
    }
    return result.slice(0, 20); // Top 20 câu gần nhất
  }, [scopedLogs, selectedCategory, search]);

  const categoriesMeta = [
    { id: 'schedule', label: 'Lịch & Ca làm', count: stats.categoryCounts.schedule, color: '#3b82f6', bg: 'bg-blue-500' },
    { id: 'recipe', label: 'Công thức FF', count: stats.categoryCounts.recipe, color: '#f59e0b', bg: 'bg-amber-500' },
    { id: 'shelf', label: 'Date & Hủy hàng', count: stats.categoryCounts.shelf, color: '#f43f5e', bg: 'bg-rose-500' },
    { id: 'labor', label: 'Lương & Chế độ', count: stats.categoryCounts.labor, color: '#10b981', bg: 'bg-emerald-500' },
    { id: 'other', label: 'Khác / Chung', count: stats.categoryCounts.other, color: '#a855f7', bg: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      
      {/* ── Top Overview Banner ── */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-2xl p-6 text-white shadow-sm border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-md">
              <Bot size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">Trung Tâm Quản Trị Trợ Lý AI (TÚ mini)</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  Realtime Copilot
                </span>
              </div>
              <p className="text-xs text-indigo-100/90 mt-1">
                Theo dõi dữ liệu thực tế: nhân viên hỏi gì, thời điểm cao điểm và độ quan tâm nghiệp vụ tại {filterDept === 'ALL' ? 'Toàn bộ cửa hàng' : `Cửa hàng ${filterDept}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchLogs(true)}
              disabled={isRefreshing}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-white/15 cursor-pointer shadow-xs disabled:opacity-50"
              title="Làm mới dữ liệu AI"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Đang tải...' : 'Làm mới'}</span>
            </button>
            <Link
              to="/admin/handbook"
              className="px-4 py-2 bg-white text-blue-800 hover:bg-blue-50 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <BookOpen size={14} className="text-blue-600" />
              <span>Quản lý Sổ tay & SOP</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        {/* 4 Quick Stat Metric Pills */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-200">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="text-[11px] text-blue-100/80 font-bold">Tổng lượt hỏi AI</p>
              <p className="text-xl font-black">{stats.total} <span className="text-xs font-normal text-blue-200">câu</span></p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-200">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[11px] text-emerald-100/80 font-bold">Nhân sự tương tác</p>
              <p className="text-xl font-black">{stats.uniqueUsers} <span className="text-xs font-normal text-emerald-200">người</span></p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-200">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-[11px] text-amber-100/80 font-bold">Chủ đề hot nhất</p>
              <p className="text-base font-black truncate max-w-[130px]">
                {categoriesMeta.sort((a, b) => b.count - a.count)[0]?.label || 'Lịch & Ca'}
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-200">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-[11px] text-purple-100/80 font-bold">Hệ thống Trợ lý</p>
              <p className="text-base font-black">Online 24/7</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Charts Row: 7-Day Bar Chart + Intent Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Biểu đồ 1: Tần suất hỏi theo 7 ngày gần nhất (Cột trực quan) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Tần Suất Hỏi Trợ Lý AI 7 Ngày Gần Nhất
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                Theo ngày
              </span>
            </div>

            {/* Daily Bar Chart (SVG/Tailwind) */}
            <div className="pt-6 pb-2">
              <div className="h-44 flex items-end justify-between gap-3 px-2">
                {stats.dailyTrend.map((d, idx) => {
                  const heightPercent = stats.maxDaily > 0 ? (d.count / stats.maxDaily) * 100 : 0;
                  const isToday = idx === stats.dailyTrend.length - 1;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      {/* Tooltip on hover */}
                      <span className="text-[10px] font-black text-slate-700 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white px-1.5 py-0.5 rounded transition-all">
                        {d.count}
                      </span>
                      
                      {/* Bar */}
                      <div className="w-full max-w-[36px] bg-slate-100 rounded-t-lg overflow-hidden h-36 flex items-end">
                        <div 
                          style={{ height: `${Math.max(heightPercent, 6)}%` }}
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            isToday 
                              ? 'bg-gradient-to-t from-blue-600 to-indigo-500 shadow-md shadow-blue-500/30' 
                              : 'bg-gradient-to-t from-slate-400 to-blue-400 group-hover:from-blue-500 group-hover:to-indigo-500'
                          }`}
                        />
                      </div>

                      {/* Day Label */}
                      <span className={`text-[11px] font-bold ${isToday ? 'text-blue-700 font-black' : 'text-slate-500'}`}>
                        {d.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Phân bổ theo khung giờ trong ngày */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Clock size={12} className="text-slate-500" />
              Khung Giờ Cao Điểm Nhân Viên Hỏi AI
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-center">
                <span className="text-[10px] font-bold text-slate-500 block">🌅 Sáng (6h - 12h)</span>
                <span className="text-sm font-black text-slate-800">{stats.hourBlocks.morning} câu</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-center">
                <span className="text-[10px] font-bold text-slate-500 block">☀️ Chiều (12h - 18h)</span>
                <span className="text-sm font-black text-slate-800">{stats.hourBlocks.afternoon} câu</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-center">
                <span className="text-[10px] font-bold text-slate-500 block">🌙 Tối (18h - 22h)</span>
                <span className="text-sm font-black text-slate-800">{stats.hourBlocks.evening} câu</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-center">
                <span className="text-[10px] font-bold text-slate-500 block">🌌 Đêm (22h - 6h)</span>
                <span className="text-sm font-black text-slate-800">{stats.hourBlocks.night} câu</span>
              </div>
            </div>
          </div>
        </div>

        {/* Biểu đồ 2: Cơ cấu chủ đề câu hỏi (Category Breakdown) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Cơ Cấu Chủ Đề Quan Tâm
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                100% tỷ trọng
              </span>
            </div>

            {/* Category Bars List */}
            <div className="space-y-3.5 mt-5">
              {categoriesMeta.map((cat) => {
                const percent = stats.total > 0 ? Math.round((cat.count / stats.total) * 100) : 0;
                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${cat.bg}`} />
                        <span>{cat.label}</span>
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {cat.count} <span className="text-slate-400 font-normal">({percent}%)</span>
                      </span>
                    </div>
                    {/* Progress Track */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        style={{ width: `${percent}%` }}
                        className={`h-full rounded-full ${cat.bg} transition-all duration-500`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 3 Tương tác nổi bật */}
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              🏆 Top Nhân Sự Tích Cực Tra Cứu
            </span>
            {stats.topUsers.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có dữ liệu người dùng</p>
            ) : (
              stats.topUsers.slice(0, 3).map(([userLabel, count], idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-700 truncate">{userLabel}</span>
                  </div>
                  <span className="font-black text-blue-700 shrink-0">{count} lượt</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── Realtime AI Question Feed ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Nhật Ký Câu Hỏi Nhân Viên Hỏi Trợ Lý AI ({filteredFeed.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Theo dõi nhân viên đang gặp vướng mắc quy trình gì để bổ sung vào Sổ tay hướng dẫn
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-56">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm nội dung câu hỏi..."
                value={search}
                onChange={e => {
                  const val = e.target.value;
                  startTransition(() => setSearch(val));
                }}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            {/* Category Filter Pills */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer shadow-2xs"
            >
              <option value="ALL">Tất cả chủ đề</option>
              <option value="schedule">📅 Lịch làm</option>
              <option value="recipe">☕ Công thức FF</option>
              <option value="shelf">🏷️ Date hủy hàng</option>
              <option value="labor">⚖️ Lương & Chế độ</option>
              <option value="other">💬 Khác</option>
            </select>
          </div>
        </div>

        {/* Feed List */}
        <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
          {filteredFeed.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-1.5">
              <MessageSquare size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Chưa có câu hỏi nào phù hợp với bộ lọc</p>
              <p className="text-[11px] text-slate-400">Khi nhân viên chat với TÚ mini, câu hỏi sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            filteredFeed.map((item) => {
              const cat = categorizeQuery(item.detail);
              const dateDisplay = item.createdAt 
                ? new Date(item.createdAt).toLocaleString('vi-VN', { 
                    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' 
                  }) 
                : 'Vừa xong';

              return (
                <div key={item.id} className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-3 group">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs shrink-0 mt-0.5 border border-slate-200">
                      {item.actorName ? item.actorName.charAt(0).toUpperCase() : 'N'}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">{item.actorName || item.actorId}</span>
                        {item.target && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                            🏬 {item.target}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.bg}`}>
                          {cat.icon} {cat.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {dateDisplay}
                        </span>
                      </div>
                      
                      {/* Query Bubble */}
                      <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white/70 p-2 rounded-lg border border-slate-150 inline-block">
                        "{item.detail}"
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                    <Link
                      to="/admin/handbook"
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Mở Sổ tay để xem hoặc thêm SOP cho câu hỏi này"
                    >
                      <BookOpen size={12} />
                      <span className="hidden sm:inline">+ Thêm Sổ tay</span>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Tự động cập nhật từ phiên tương tác TÚ mini của nhân viên</span>
          <Link to="/admin/handbook" className="text-blue-600 hover:underline font-bold flex items-center gap-1">
            <span>Cấu hình Sổ tay chi tiết</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

    </div>
  );
}
