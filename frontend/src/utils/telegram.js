const TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
const CHAT = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';

export function telegramConfigured() {
  return Boolean(TOKEN && CHAT);
}

/** Gửi Telegram nếu đã cấu hình .env — không chặn UI, không log token. */
export async function notifyTelegram(text) {
  if (!TOKEN || !CHAT || !text) return { ok: false, skipped: true };
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT,
        text: String(text).slice(0, 3500),
        disable_web_page_preview: true
      }),
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
