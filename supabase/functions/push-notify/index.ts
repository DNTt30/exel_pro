/**
 * Supabase Edge Function: push-notify
 * Gửi Web Push notification đến NV cụ thể hoặc toàn bộ CH
 *
 * Secrets cần set:
 *   supabase secrets set VAPID_PRIVATE_KEY=xxx VAPID_PUBLIC_KEY=yyy VAPID_SUBJECT=mailto:admin@gs25.com
 *
 * Deploy:
 *   supabase functions deploy push-notify --project-ref <ref>
 *
 * Body JSON:
 *   { userId?: string, storeId?: string, title: string, body: string, url?: string, tag?: string }
 */
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? '';
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT')     ?? 'mailto:admin@gs25.com';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Deno VAPID helper (dùng WebCrypto API)
async function importVapidKey(privateKeyBase64: string) {
  const keyData = Uint8Array.from(atob(privateKeyBase64.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
  return await crypto.subtle.importKey('pkcs8', keyData, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function buildVapidJwt(endpoint: string) {
  const origin = new URL(endpoint).origin;
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const payload = btoa(JSON.stringify({
    aud: origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const sigInput = `${header}.${payload}`;
  const key = await importVapidKey(VAPID_PRIVATE_KEY);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key,
    new TextEncoder().encode(sigInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${sigInput}.${sigB64}`;
}

async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: object) {
  const body = JSON.stringify(payload);
  const jwt  = await buildVapidJwt(sub.endpoint);
  const res  = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Content-Length': String(new TextEncoder().encode(body).length),
      'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      'TTL': '86400',
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  return res.status;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: cors });
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) return new Response('not configured', { status: 500, headers: cors });

  // Xác thực Supabase JWT
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return new Response('forbidden', { status: 403, headers: cors });
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return new Response('forbidden', { status: 403, headers: cors });

  try {
    const { userId, storeId, title, body, url = '/', tag = 'gs25-notify' } = await req.json();
    if (!title || !body) return new Response('bad request', { status: 400, headers: cors });

    // Lấy danh sách subscriptions
    let query = supabase.from('push_subscriptions').select('endpoint,p256dh,auth,user_id');
    if (userId)       query = query.eq('user_id', userId);
    else if (storeId) {
      // Lấy user_id của NV thuộc store
      const { data: emps } = await supabase.from('employees').select('id').eq('dept', storeId);
      const ids = (emps || []).map((e: { id: string }) => e.id);
      if (ids.length === 0) return new Response(JSON.stringify({ sent: 0 }), { headers: { ...cors, 'Content-Type': 'application/json' } });
      query = query.in('user_id', ids);
    }

    const { data: subs, error: subErr } = await query;
    if (subErr) throw subErr;
    if (!subs || subs.length === 0) return new Response(JSON.stringify({ sent: 0 }), { headers: { ...cors, 'Content-Type': 'application/json' } });

    const payload = { title, body, url, tag, icon: '/icon-192.png' };
    let sent = 0; let failed = 0;
    await Promise.all(subs.map(async (sub) => {
      try {
        const status = await sendPush(sub, payload);
        if (status < 300) sent++;
        else if (status === 410 || status === 404) {
          // Subscription expired — xoá
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          failed++;
        } else failed++;
      } catch { failed++; }
    }));

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[push-notify]', e);
    return new Response('internal error', { status: 500, headers: cors });
  }
});
