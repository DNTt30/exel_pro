const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (status, code) => new Response(JSON.stringify({ ok: code === 'OK', code }), { status, headers });
export function createEmployeeProfileHandler({ admin, verifyPassword }) {
  return async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers });
    if (req.method !== 'POST') return reply(405, 'METHOD_NOT_ALLOWED');
    const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return reply(401, 'AUTH_REQUIRED');
    try {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data?.user?.id) return reply(401, 'AUTH_REQUIRED');
      let body;
      try { body = await req.json(); } catch { return reply(400, 'INVALID_INPUT'); }
      const password = body?.current_password;
      const email = typeof body?.new_email === 'string' ? body.new_email.trim().toLowerCase() : '';
      if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, 'INVALID_EMAIL');
      if (typeof password !== 'string' || !password || password.length > 256) return reply(400, 'PASSWORD_REQUIRED');
      const { data: attempt, error: attemptError } = await admin.rpc('begin_profile_email_change', { p_user_id: data.user.id });
      if (attemptError) return reply(503, 'SERVER_ERROR');
      if (attempt?.code !== 'OK') return reply(attempt?.code === 'RATE_LIMITED' ? 429 : 403, attempt?.code || 'SERVER_ERROR');
      const authEmail = `${attempt.emp_id}@ofc.app`;
      const authPassword = password === '1' ? `ofc-${attempt.emp_id}-1` : password;
      if (!await verifyPassword(authEmail, authPassword, data.user.id)) return reply(400, 'INVALID_PASSWORD');
      const { data: saved, error: saveError } = await admin.rpc('set_verified_recovery_email', {
        p_user_id: data.user.id, p_expected_email: attempt.recovery_email ?? null, p_new_email: email,
      });
      if (saveError) return reply(503, 'SERVER_ERROR');
      return reply(saved?.code === 'OK' ? 200 : 409, saved?.code || 'SERVER_ERROR');
    } catch { return reply(503, 'SERVER_ERROR'); }
  };
}
