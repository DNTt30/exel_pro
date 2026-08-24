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

  // Ưu tiên chế độ proxy an toàn
  if (PROXY_URL) {
    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(PROXY_SECRET ? { 'x-ofc-secret': PROXY_SECRET } : {}),
        },
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
