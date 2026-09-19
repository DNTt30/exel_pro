import { useState, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useStore } from '../../store/useStore';

function timeAgo(ts) {
  if (!ts) return '';
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 5) return 'vừa xong';
  if (sec < 60) return `${sec}s trước`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}p trước`;
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function CloudSyncBadge() {
  const syncStatus = useStore(s => s.syncStatus);
  const realtimeStatus = useStore(s => s.realtimeStatus);
  const lastSyncedAt = useStore(s => s.lastSyncedAt);
  const initializeData = useStore(s => s.initializeData);

  const [, setTick] = useState(0);

  // Tự động cập nhật nhãn thời gian timeAgo mỗi 5 giây
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  if (syncStatus === 'loading') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1 shadow-2xs" title="Đang đồng bộ dữ liệu từ Supabase...">
        <Loader2 size={11} className="animate-spin text-blue-600" />
        <span className="hidden sm:inline">Đang đồng bộ</span>
      </span>
    );
  }

  if (syncStatus === 'error' || realtimeStatus === 'error') {
    return (
      <button 
        type="button" 
        onClick={() => initializeData()} 
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2.5 py-1 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs" 
        title="Mất kết nối Supabase — Bấm để kết nối lại"
      >
        <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
        <span>Offline</span>
        <span className="hidden sm:inline text-[10px] text-rose-600 underline font-normal">(Kết nối lại)</span>
      </button>
    );
  }

  if (realtimeStatus === 'connecting') {
    return (
      <button 
        type="button" 
        onClick={() => initializeData()} 
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-2.5 py-1 hover:bg-sky-100 transition-all cursor-pointer shadow-2xs" 
        title="Đang thiết lập kênh Realtime WebSocket..."
      >
        <Loader2 size={11} className="animate-spin text-sky-500" />
        <span className="hidden sm:inline">Kết nối Live...</span>
      </button>
    );
  }

  // Trạng thái Connected: Live Pulse Pill (🟢 Nhịp tim WebSocket)
  return (
    <button 
      type="button" 
      onClick={() => initializeData()} 
      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50/90 border border-emerald-200/90 rounded-full px-2.5 py-1 hover:bg-emerald-100 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs group" 
      title="🟢 Đang kết nối Realtime trực tiếp (Supabase WebSocket). Mọi thay đổi sẽ cập nhật 0s. Bấm để tải lại toàn bộ."
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-emerald-700 font-extrabold tracking-wide">Live</span>
      <span className="hidden md:inline font-medium text-emerald-600/90 border-l border-emerald-200/80 pl-1.5 text-[10px]">
        {lastSyncedAt ? timeAgo(lastSyncedAt) : 'sẵn sàng'}
      </span>
      <RefreshCw size={10} className="hidden group-hover:inline text-emerald-600 transition-transform group-hover:rotate-180" />
    </button>
  );
}
