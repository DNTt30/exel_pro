// Supabase Edge Function: OTP 2FA cho tài khoản admin qua Telegram.
// Xác minh diễn ra Ở ĐÂY (server-side) — không thể bị bypass như kiểm tra client.
//
// Deploy:
//   supabase functions deploy admin-otp --project-ref <ref>
//   supabase secrets set TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy NOTIFY_SECRET=z
//   (chạy sql_admin_otp.sql để tạo bảng admin_otps trước)
// Frontend .env:
//   VITE_ADMIN_OTP_URL=https://<ref>.functions.supabase.co/admin-otp
//   VITE_TELEGRAM_PROXY_SECRET=z   (dùng chung NOTIFY_SECRET)

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') ?? '';
const SECRET = Deno.env.get('NOTIFY_SECRET') ?? '';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ofc-secret',
};

const OTP_TTL_MS = 5 * 60 * 1000;
const DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function genCode() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1000000).padStart(6, '0');
}

function uuid() {
  return crypto.randomUUID();
}

async function sb(path, method, body) {
  const res = await fetch(SB_URL + '/rest/v1/' + path, {
    method,
    headers: {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error('db-' + res.status);
  return res.json();
}

async function sendTelegram(text) {
  const res = await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text }),
    signal: AbortSignal.timeout(8000),
  });
  return res.ok;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: cors });
  if (!BOT_TOKEN || !CHAT_ID || !SB_URL || !SB_KEY) return new Response('function not configured', { status: 500, headers: cors });
  if (SECRET && req.headers.get('x-ofc-secret') !== SECRET) return new Response('forbidden', { status: 403, headers: cors });

  try {
    const { action, code, deviceToken } = await req.json();
    const now = Date.now();

    // ── REQUEST: tạo OTP mới, lưu hash, gửi Telegram ──
    if (action === 'request') {
      // Chỉ tối đa 1 mã đang chờ (chưa tiêu thụ, còn hạn) — chống spam Telegram
      const pending = await sb(
        'admin_otps?purpose=eq.otp&consumed=eq.false&expires_at=gte.' + new Date(now).toISOString(),
        'GET'
      );
      if (Array.isArray(pending) && pending.length > 0) {
        return new Response(JSON.stringify({ ok: false, reason: 'cooldown' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      const codeStr = genCode();
      await sb('admin_otps', 'POST', [{
        purpose: 'otp',
        code_hash: await sha256Hex(codeStr),
        attempts: 0,
        consumed: false,
        expires_at: new Date(now + OTP_TTL_MS).toISOString(),
      }]);
      const sent = await sendTelegram('🔐 OFC — Ma OTP admin: ' + codeStr + ' (het han 5 phut). Khong chia se ma nay.');
      if (!sent) return new Response(JSON.stringify({ ok: false, reason: 'telegram' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ ok: true, expiresInSec: OTP_TTL_MS / 1000 }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // ── VERIFY: so khớp mã, phát hành deviceToken tin tưởng 30 ngày ──
    if (action === 'verify') {
      const clean = String(code || '').replace(/\D/g, '');
      if (clean.length !== 6) return new Response(JSON.stringify({ ok: false, reason: 'bad-code' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
      const rows = await sb(
        'admin_otps?purpose=eq.otp&consumed=eq.false&expires_at=gte.' + new Date(now).toISOString() + '&order=created_at.desc&limit=1',
        'GET'
      );
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return new Response(JSON.stringify({ ok: false, reason: 'expired' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
      if ((row.attempts ?? 0) >= MAX_ATTEMPTS) {
        await sb('admin_otps?id=eq.' + row.id, 'PATCH', { consumed: true });
        return new Response(JSON.stringify({ ok: false, reason: 'expired' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      if ((await sha256Hex(clean)) !== row.code_hash) {
        await sb('admin_otps?id=eq.' + row.id, 'PATCH', { attempts: (row.attempts ?? 0) + 1 });
        return new Response(JSON.stringify({ ok: false, reason: 'wrong' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      await sb('admin_otps?id=eq.' + row.id, 'PATCH', { consumed: true });
      const token = uuid();
      await sb('admin_otps', 'POST', [{
        purpose: 'device',
        token_hash: await sha256Hex(token),
        consumed: true,
        expires_at: new Date(now + DEVICE_TTL_MS).toISOString(),
      }]);
      return new Response(JSON.stringify({ ok: true, deviceToken: token }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // ── CHECK-DEVICE: thiết bị đã tin tưởng thì bỏ qua OTP ──
    if (action === 'check-device' && deviceToken) {
      const h = await sha256Hex(String(deviceToken));
      const rows = await sb(
        'admin_otps?purpose=eq.device&token_hash=eq.' + h + '&consumed=eq.true&expires_at=gte.' + new Date(now).toISOString() + '&limit=1',
        'GET'
      );
      const trusted = Array.isArray(rows) && rows.length > 0;
      return new Response(JSON.stringify({ ok: true, trusted }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: false, reason: 'unknown-action' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ ok: false, reason: 'error' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
