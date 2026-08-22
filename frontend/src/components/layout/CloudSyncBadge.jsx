import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

function timeAgo(ts) {
  if (!ts) return '';
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 10) return 'vừa xong';
  if (sec < 60) return `${sec}s trước`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} phút trước`;
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function CloudSyncBadge() {
  const syncStatus = useStore(s => s.syncStatus);
  const lastSyncedAt = useStore(s => s.lastSyncedAt);

  if (syncStatus === 'loading') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-1" title="Đang tải từ Supabase">
        <Loader2 size={12} className="animate-spin" /> <span className="hidden sm:inline">Đang đồng bộ</span>
      </span>
    );
  }
  if (syncStatus === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-100 rounded-full px-2 py-1" title="Không kết nối được cloud">
        <CloudOff size={12} /> <span className="hidden sm:inline">Lỗi cloud</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-1" title="Lịch, NV, kệ, nhật ký lưu bảng Supabase. Máy chỉ giữ phiên đăng nhập.">
      <Cloud size={12} /> <span className="hidden sm:inline">Cloud {lastSyncedAt ? timeAgo(lastSyncedAt) : 'sẵn sàng'}</span>
    </span>
  );
}
