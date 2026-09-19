const PROXY_URL = import.meta.env.VITE_TELEGRAM_PROXY_URL || '';
const PROXY_SECRET = import.meta.env.VITE_TELEGRAM_PROXY_SECRET || '';
// Chế độ cũ (KHÔNG an toàn): token nằm trong bundle client, ai cũng đọc được.
// Chỉ dùng khi chưa triển khai Edge Function proxy — nên chuyển sang proxy sớm.
const TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
const CHAT = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';

let warned = false;
function warnDirectMode() {
  if (warned) return;
  warned = true;
  console.warn('[telegram] Đang gửi trực tiếp bằng token trong bundle client. Hãy triển khai supabase/functions/telegram-notify và đặt VITE_TELEGRAM_PROXY_URL. Xem docs/telegram-proxy.md');
}

export function telegramConfigured() {
  return Boolean(PROXY_URL || (TOKEN && CHAT));
}

/** Gửi Telegram qua proxy nếu có; không chặn UI, không log token. */
export async function notifyTelegram(text) {
  if (!text) return { ok: false, skipped: true };

  // Ưu tiên chế độ proxy an toàn (sử dụng Supabase JWT hoặc Proxy)
  if (PROXY_URL) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (PROXY_SECRET) {
        headers['x-ofc-secret'] = PROXY_SECRET;
      }

      // Đính kèm JWT phiên người dùng hiện tại để xác thực an toàn không cần shared secret
      try {
        const { supabase } = await import('../lib/supabase');
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.access_token) {
            headers['Authorization'] = `Bearer ${data.session.access_token}`;
          }
        }
      } catch {
        // bỏ qua nếu chạy ở môi trường không có supabase client
      }

      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: String(text).slice(0, 3500) }),
        signal: AbortSignal.timeout(8000),
      });
      return res.ok ? { ok: true } : { ok: false };
    } catch {
      return { ok: false };
    }
  }

  if (!TOKEN || !CHAT) return { ok: false, skipped: true };
  warnDirectMode();
  try {
    const res = await fetch('https://api.telegram.org/bot' + TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT,
        text: String(text).slice(0, 3500),
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
