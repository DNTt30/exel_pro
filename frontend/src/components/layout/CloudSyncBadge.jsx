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
  const authWarning = useStore(s => s.authWarning);

  const [, setTick] = useState(0);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine !== false);

  // Tự động cập nhật nhãn thời gian timeAgo mỗi 5 giây & theo dõi trạng thái mạng
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 5000);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
    }
    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      }
    };
  }, []);

  if (!isOnline || syncStatus === 'offline') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-full px-2.5 py-1 shadow-2xs"
        title={lastSyncedAt ? `Đang xem dữ liệu lưu trên máy (đồng bộ lần cuối ${timeAgo(lastSyncedAt)}). Tự động đồng bộ lại khi có mạng.` : 'Thiết bị đang ngoại tuyến (Offline).'}
      >
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        <span>Offline · Bản lưu</span>
        {lastSyncedAt && (
          <span className="hidden md:inline font-medium text-amber-700/90 border-l border-amber-200 pl-1.5 text-[10px]">
            {timeAgo(lastSyncedAt)}
          </span>
        )}
      </span>
    );
  }

  if (syncStatus === 'loading' || syncStatus === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1 shadow-2xs" title="Đang đồng bộ dữ liệu từ Supabase...">
        <Loader2 size={11} className="animate-spin text-blue-600" />
        <span className="hidden sm:inline">{syncStatus === 'saving' ? 'Đang lưu' : 'Đang đồng bộ'}</span>
      </span>
    );
  }

  if (authWarning || syncStatus === 'error' || realtimeStatus === 'error') {
    return (
      <button 
        type="button" 
        onClick={() => initializeData()} 
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2.5 py-1 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs" 
        title={authWarning || (syncStatus === 'error' ? 'Có dữ liệu chưa tải hoặc chưa lưu được. Bấm để tải lại; xem thông báo lỗi của thao tác vừa thực hiện.' : 'Cập nhật trực tiếp đang gián đoạn. Bấm để tải lại dữ liệu và kết nối Live.')}
      >
        <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
        <span>{authWarning ? 'Kiểm tra đăng nhập' : syncStatus === 'error' ? 'Lỗi đồng bộ' : 'Live gián đoạn'}</span>
        <span className="hidden sm:inline text-[10px] text-rose-600 underline font-normal">(Thử lại)</span>
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

  if (realtimeStatus !== 'connected') {
    return <button type="button" onClick={() => initializeData()}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
      title="Kênh cập nhật trực tiếp chưa kết nối. Bấm để tải lại dữ liệu.">
      <RefreshCw size={11} />{lastSyncedAt ? 'Đã tải dữ liệu' : 'Chưa đồng bộ'}
    </button>;
  }

  // Chỉ báo Live khi WebSocket thực sự đã đăng ký thành công.
  return (
    <button 
      type="button" 
      onClick={() => initializeData()} 
      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50/90 border border-emerald-200/90 rounded-full px-2.5 py-1 hover:bg-emerald-100 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs group" 
      title="Đã kết nối cập nhật trực tiếp. Bấm để tải lại dữ liệu."
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
