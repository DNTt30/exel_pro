const PROXY_URL = import.meta.env.VITE_TELEGRAM_PROXY_URL || '';

export function telegramConfigured() { return Boolean(PROXY_URL); }

// Bot tokens and shared secrets must never be included in the browser bundle.
export async function notifyTelegram(text) {
  if (!text || !PROXY_URL) return { ok: false, skipped: true };
  try {
    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase.auth.getSession();
    if (!data?.session?.access_token) return { ok: false, skipped: true };
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify({ text: String(text).slice(0, 3500) }),
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.ok };
  } catch { return { ok: false }; }
}
