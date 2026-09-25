/**
 * usePushNotification.js
 * Hook quản lý đăng ký / huỷ Web Push subscription cho NV GS25
 *
 * Flow:
 *  1. Xin quyền Notification
 *  2. Lấy SW registration
 *  3. Subscribe với VAPID public key
 *  4. Gửi subscription object lên Supabase (bảng push_subscriptions)
 *  5. Lưu trạng thái vào localStorage để biết đã đăng ký chưa
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../utils/toast';

const STORAGE_KEY = 'gs25-push-subscribed';

// VAPID public key — set bằng env var (không phải secret, có thể public)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotification(userId) {
  const [status, setStatus] = useState(() => {
    // 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading'
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
    if (localStorage.getItem(STORAGE_KEY) === userId) return 'subscribed';
    return 'unsubscribed';
  });

  // Verify SW subscription thực tế khi mount — localStorage có thể stale
  // (SW update, trình duyệt xoá subscription, đổi device...)
  useEffect(() => {
    if (status === 'unsupported' || !userId) return;
    if (Notification.permission === 'denied') { setStatus('denied'); return; }
    if (localStorage.getItem(STORAGE_KEY) !== userId) return;

    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription()
    ).then(sub => {
      if (!sub) {
        // SW đã mất subscription nhưng localStorage chưa biết → reset
        localStorage.removeItem(STORAGE_KEY);
        setStatus('unsubscribed');
      }
    }).catch(() => {}); // im lặng nếu SW chưa ready
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      toast.error('Push notification chưa được cấu hình (thiếu VAPID key)');
      return;
    }
    if (!userId) return;
    setStatus('loading');

    try {
      // 1. Xin quyền
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus('denied'); return; }

      // 2. Lấy SW
      const reg = await navigator.serviceWorker.ready;

      // 3. Huỷ sub cũ nếu có
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      // 4. Subscribe mới
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 5. Lưu lên Supabase
      const subJson = sub.toJSON();
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id:   userId,
          endpoint:  subJson.endpoint,
          p256dh:    subJson.keys?.p256dh,
          auth:      subJson.keys?.auth,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      localStorage.setItem(STORAGE_KEY, userId);
      setStatus('subscribed');
      toast.success('🔔 Đã bật thông báo! Bạn sẽ nhận được thông báo về lịch ca.');
    } catch (err) {
      console.error('[Push] Subscribe error:', err);
      setStatus('unsubscribed');
      toast.error('Không thể bật thông báo. Kiểm tra cài đặt trình duyệt.');
    }
  }, [userId]);

  const unsubscribe = useCallback(async () => {
    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      // Xoá trên Supabase
      await supabase.from('push_subscriptions').delete().eq('user_id', userId);

      localStorage.removeItem(STORAGE_KEY);
      setStatus('unsubscribed');
      toast.info('🔕 Đã tắt thông báo.');
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err);
      setStatus('subscribed'); // rollback
      toast.error('Không thể tắt thông báo. Thử lại sau.');
    }
  }, [userId]);

  return { status, subscribe, unsubscribe };
}
