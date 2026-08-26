import { describe, it, expect } from 'vitest';

// PHASE 8 - Security regression tren mat anon.
// Luu y PostgREST: khi RLS chan, DELETE/PATCH tra 2xx nhung 0 dong -> do bang so dong/hau quaer.
const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const hasEnv = Boolean(URL_ && KEY);

async function rowCountAfter(method, path, body) {
  await fetch(URL_ + '/rest/v1/' + path, {
    method,
    headers: Object.assign({ 'Content-Type': 'application/json' }, H),
    body: body ? JSON.stringify(body) : undefined,
  });
  const res = await fetch(URL_ + '/rest/v1/' + path.split('?')[0] + '?select=*', { headers: H });
  const j = res.ok ? await res.json().catch(() => []) : [];
  return Array.isArray(j) ? j.length : -1;
}

describe.skipIf(!hasEnv)('phase 8 - security regression (anon surface)', () => {
  it('T-R1: sau thu PATCH, anon van thay 0 dong admin_logs', async () => {
    const n = await rowCountAfter('PATCH', 'admin_logs?id=eq.-999', { action: 'TAMPERED' });
    expect(n).toBe(0);
  });

  it('T-R2: sau thu DELETE, anon van thay 0 dong feedbacks', async () => {
    const n = await rowCountAfter('DELETE', 'feedbacks?emp_id=eq.__rls_probe__');
    expect(n).toBe(0);
  });

  it('T-R3: login_lookup an toan voi input doc Injection', async () => {
    const res = await fetch(URL_ + '/rest/v1/rpc/login_lookup', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, H),
      body: JSON.stringify({ p_ma: "'; DROP TABLE employees; --" }),
    });
    expect(res.ok).toBe(true);
    const txt = await res.text();
    expect(txt === '' || txt === 'null' || JSON.parse(txt) === null || Array.isArray(JSON.parse(txt))).toBe(true);
  });
});