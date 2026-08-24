// Supabase Edge Function: proxy gửi Telegram an toàn.
// Token bot KHÔNG còn nằm trong bundle client — lưu bằng secrets của Function:
//   supabase secrets set TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy NOTIFY_SECRET=z
// Deploy:
//   supabase functions deploy telegram-notify --project-ref <ref>
// Frontend cấu hình .env:
//   VITE_TELEGRAM_PROXY_URL=https://<ref>.functions.supabase.co/telegram-notify
//   VITE_TELEGRAM_PROXY_SECRET=z   (khớp NOTIFY_SECRET)
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') ?? '';
const SECRET = Deno.env.get('NOTIFY_SECRET') ?? '';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ofc-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: cors });
  if (!BOT_TOKEN || !CHAT_ID) return new Response('function not configured', { status: 500, headers: cors });
  if (SECRET && req.headers.get('x-ofc-secret') !== SECRET) {
    return new Response('forbidden', { status: 403, headers: cors });
  }
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') return new Response('bad request', { status: 400, headers: cors });
    const res = await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: String(text).slice(0, 3500),
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return new Response('telegram error', { status: 502, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch {
    return new Response('bad request', { status: 400, headers: cors });
  }
});
