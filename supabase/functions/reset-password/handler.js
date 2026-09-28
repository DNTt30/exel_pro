import { validateNewPassword } from '../_shared/passwordPolicy.js';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
const messages = {
  EMPLOYEE_NOT_FOUND: 'Mã nhân viên không tồn tại.', EMPLOYEE_INACTIVE: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản lý.',
  RECOVERY_EMAIL_MISSING: 'Chưa có email khôi phục. Vui lòng nhờ quản lý cập nhật Gmail trong hồ sơ.',
  AUTH_ACCOUNT_MISSING: 'Tài khoản đăng nhập chưa được tạo. Vui lòng liên hệ quản lý.',
  RATE_LIMITED: 'Bạn đã yêu cầu 3 mã trong 15 phút. Vui lòng thử lại sau.',
  RESET_IN_PROGRESS: 'Yêu cầu đổi mật khẩu đang được xử lý. Vui lòng chờ.',
  OTP_INVALID: 'Mã OTP không đúng. Vui lòng kiểm tra lại.', OTP_EXPIRED: 'Mã OTP đã hết hạn. Vui lòng nhận mã mới.',
  OTP_LOCKED: 'Bạn đã nhập sai 5 lần. Vui lòng nhận mã mới.', OTP_USED: 'Mã OTP đã được sử dụng. Vui lòng nhận mã mới.',
};
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: cors });
const fail = (code, status = 400, error = messages[code] || 'Không thể xử lý lúc này. Vui lòng thử lại sau.') => reply(status, { ok: false, code, error });
const resultError = data => fail(data?.code || 'SERVER_ERROR', data?.code === 'RATE_LIMITED' ? 429 : 400);
export function generateOtp() {
  const bytes = new Uint32Array(1);
  do { crypto.getRandomValues(bytes); } while (bytes[0] >= 4294000000);
  return String(bytes[0] % 1000000).padStart(6, '0');
}
export async function hashOtp(empId, otp, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${empId}:${otp}`));
  return [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function createResetPasswordHandler({ admin, hashSecret, botToken, chatId, resendKey, emailFrom, fetchImpl = fetch, createOtp = generateOtp }) {
  const rpc = async (name, args) => {
    const { data, error } = await admin.rpc(name, args);
    if (error) throw new Error('RESET_STORAGE_ERROR');
    return data;
  };
  return async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);
    let body;
    try { body = await req.json(); } catch { return fail('INVALID_JSON'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('INVALID_INPUT');
    const { action = 'admin_reset', new_password: newPassword } = body;
    if (!['request_otp', 'verify_and_reset', 'admin_reset'].includes(action)) return fail('INVALID_ACTION');
    try {
      if (action === 'admin_reset') {
        const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer /i, '');
        if (!jwt) return fail('UNAUTHORIZED', 401);
        const { data: auth, error: authError } = await admin.auth.getUser(jwt);
        if (authError || !auth?.user) return fail('UNAUTHORIZED', 401);
        const { data: profile, error: profileError } = await admin.from('app_profiles').select('emp_id').eq('id', auth.user.id).single();
        if (profileError || !profile) return fail('FORBIDDEN', 403);
        const { data: roles, error: roleError } = await admin.from('user_store_roles').select('id').eq('user_emp_id', profile.emp_id).eq('role', 'ADMIN').limit(1);
        if (roleError || !roles?.length) return fail('FORBIDDEN', 403);
        const policyError = validateNewPassword(newPassword);
        if (policyError) return fail('WEAK_PASSWORD', 400, policyError);
        if (typeof body.target_emp_id !== 'string' || !/^(admin|\d{9})$/.test(body.target_emp_id)) return fail('INVALID_EMP_ID');
        const { data: target, error: targetError } = await admin.from('app_profiles').select('id').eq('emp_id', body.target_emp_id).single();
        if (targetError || !target?.id) return fail('AUTH_ACCOUNT_MISSING', 404);
        const { error } = await admin.auth.admin.updateUserById(target.id, { password: newPassword, user_metadata: { must_change_password: true, password_changed_at: null } });
        if (error) return fail('RESET_FAILED', 502);
        await admin.from('app_profiles').update({ credential_set_at: null }).eq('emp_id', body.target_emp_id);
        return reply(200, { ok: true });
      }
      const empId = typeof body.emp_id === 'string' ? body.emp_id.trim() : '';
      if (!/^(admin|\d{9})$/.test(empId)) return fail('INVALID_EMP_ID', 400, 'Nhập mã nhân viên 9 chữ số hoặc admin.');
      if (!hashSecret) return fail('NOT_CONFIGURED', 503);
      if (action === 'request_otp') {
        const isAdmin = empId === 'admin';
        if (isAdmin ? !botToken || !chatId : !resendKey || !emailFrom) {
          return fail('NOT_CONFIGURED', 503, `Chưa cấu hình gửi OTP qua ${isAdmin ? 'Telegram' : 'email'}. Vui lòng liên hệ quản lý.`);
        }
        const otp = createOtp();
        const issued = await rpc('issue_password_reset_otp', { p_emp_id: empId, p_hash: await hashOtp(empId, otp, hashSecret) });
        if (issued?.code !== 'OK') return resultError(issued);
        const text = `Tài khoản ${issued.name} - ${empId} yêu cầu đổi mật khẩu. Mã OTP là: ${otp} (Có hiệu lực 5 phút). Không chia sẻ mã cho người khác.`;
        let delivered = false;
        try {
          const sent = isAdmin
            ? await fetchImpl(`https://api.telegram.org/bot${botToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000),
              body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }) })
            : await fetchImpl('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}`, 'Idempotency-Key': `password-reset/${issued.id}` }, signal: AbortSignal.timeout(8000),
              body: JSON.stringify({ from: emailFrom, to: [issued.email], subject: 'GS25 — Mã OTP khôi phục mật khẩu', text }) });
          const result = await sent.json();
          delivered = sent.ok && (isAdmin ? result.ok === true : !!result.id);
        } catch { /* Do not log OTPs, passwords, recipient emails, or provider URLs. */ }
        if (!delivered) {
          await rpc('finish_password_reset_otp', { p_id: issued.id, p_success: false });
          return fail('DELIVERY_FAILED', 502, 'Không gửi được mã OTP. Vui lòng thử lại sau hoặc liên hệ quản lý.');
        }
        return reply(200, { ok: true, expires_in: 300, channel: isAdmin ? 'telegram' : 'email' });
      }
      const policyError = validateNewPassword(newPassword);
      if (policyError) return fail('WEAK_PASSWORD', 400, policyError);
      const otp = typeof body.otp_code === 'string' ? body.otp_code.trim() : '';
      if (!/^\d{6}$/.test(otp)) return fail('INVALID_OTP_FORMAT', 400, 'Mã OTP phải gồm đúng 6 chữ số.');
      const claimed = await rpc('claim_password_reset_otp', { p_emp_id: empId, p_hash: await hashOtp(empId, otp, hashSecret) });
      if (claimed?.code !== 'OK') return resultError(claimed);
      let updated;
      try {
        updated = await admin.auth.admin.updateUserById(claimed.user_id, { password: newPassword,
          user_metadata: { must_change_password: false, password_changed_at: new Date().toISOString() } });
      } catch { return fail('RESET_UNCERTAIN', 502, 'Chưa xác nhận được kết quả. Hãy thử đăng nhập bằng mật khẩu mới hoặc liên hệ quản lý.'); }
      if (updated.error) {
        await rpc('finish_password_reset_otp', { p_id: claimed.id, p_success: false });
        return fail('RESET_FAILED', 502, 'Không đổi được mật khẩu. Vui lòng nhận mã OTP mới.');
      }
      try {
        const finished = await rpc('finish_password_reset_otp', { p_id: claimed.id, p_success: true });
        if (finished?.code !== 'OK') throw new Error('RESET_FINALIZE_ERROR');
      } catch {
        return reply(200, { ok: true, warning: 'Mật khẩu đã đổi. Nhật ký chưa đồng bộ; vui lòng báo quản lý.', code: 'AUDIT_PENDING' });
      }
      return reply(200, { ok: true });
    } catch { return fail('SERVER_ERROR', 503); }
  };
}
