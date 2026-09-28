import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createResetPasswordHandler, generateOtp, hashOtp } from '../../../supabase/functions/reset-password/handler.js';

const id = '260512001', claimId = '11111111-1111-1111-1111-111111111111';
let admin, fetchImpl, handler;
const invoke = async body => {
  const response = await handler(new Request('http://local/reset-password', { method: 'POST', body: JSON.stringify(body) }));
  return { status: response.status, ...await response.json() };
};
beforeEach(() => {
  admin = { rpc: vi.fn(async name => ({ data: name === 'issue_password_reset_otp'
    ? { code: 'OK', id: claimId, name: 'NV', email: 'registered@gmail.com' }
    : name === 'claim_password_reset_otp' ? { code: 'OK', id: claimId, user_id: 'auth-user' } : { code: 'OK' } })),
    auth: { getUser: vi.fn(), admin: { updateUserById: vi.fn().mockResolvedValue({ error: null }) } }, from: vi.fn() };
  fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'email-message', ok: true })));
  handler = createResetPasswordHandler({ admin, hashSecret: 'test-secret', botToken: 'test-bot', chatId: 'admin-chat',
    resendKey: 'test-email-key', emailFrom: 'GS25 <test@example.com>', fetchImpl, createOtp: () => '012345' });
});
describe('password recovery handler', () => {
  it('sends employees only to the registered email and never returns OTP/email in the response', async () => {
    const result = await invoke({ action: 'request_otp', emp_id: id, email: 'attacker@gmail.com' });
    expect(result).toMatchObject({ ok: true, channel: 'email', expires_in: 300 });
    const [url, request] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(JSON.parse(request.body)).toMatchObject({ to: ['registered@gmail.com'], text: expect.stringContaining('012345') });
    expect(JSON.stringify(result)).not.toMatch(/012345|registered@gmail/);
    expect(admin.rpc.mock.calls[0][1].p_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(admin.rpc.mock.calls[0][1].p_hash).not.toContain('012345');
  });
  it('sends admin OTP only to the configured Telegram chat', async () => {
    expect(await invoke({ action: 'request_otp', emp_id: 'admin', chat_id: 'attacker' })).toMatchObject({ channel: 'telegram' });
    expect(fetchImpl.mock.calls[0][0]).toContain('api.telegram.org');
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).chat_id).toBe('admin-chat');
  });
  it('reports missing email configuration without creating a challenge', async () => {
    handler = createResetPasswordHandler({ admin, hashSecret: 'secret' });
    expect(await invoke({ action: 'request_otp', emp_id: id })).toMatchObject({ code: 'NOT_CONFIGURED', status: 503 });
    expect(admin.rpc).not.toHaveBeenCalled();
  });
  it.each(['RATE_LIMITED', 'EMPLOYEE_INACTIVE', 'RECOVERY_EMAIL_MISSING', 'AUTH_ACCOUNT_MISSING'])('does not send on %s', async code => {
    admin.rpc.mockResolvedValueOnce({ data: { code } });
    expect(await invoke({ action: 'request_otp', emp_id: id })).toMatchObject({ ok: false, code });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('invalidates failed delivery while preserving the database request history', async () => {
    fetchImpl.mockResolvedValue(new Response('{"ok":false}', { status: 502 }));
    expect(await invoke({ action: 'request_otp', emp_id: id })).toMatchObject({ code: 'DELIVERY_FAILED' });
    expect(admin.rpc).toHaveBeenLastCalledWith('finish_password_reset_otp', { p_id: claimId, p_success: false });
  });
  it.each(['OTP_INVALID','OTP_EXPIRED','OTP_LOCKED','OTP_USED','EMPLOYEE_INACTIVE'])('does not reset for %s', async code => {
    admin.rpc.mockResolvedValueOnce({ data: { code } });
    expect(await invoke({ action: 'verify_and_reset', emp_id: id, otp_code: '012345', new_password: 'MatKhau9' })).toMatchObject({ code });
    expect(admin.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
  it('uses the claimed auth identity, clears flags, then finalizes and logs', async () => {
    expect(await invoke({ action: 'verify_and_reset', emp_id: id, user_id: 'attacker', otp_code: '012345', new_password: 'MatKhau9' })).toMatchObject({ ok: true });
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith('auth-user', { password: 'MatKhau9', user_metadata: { must_change_password: false, password_changed_at: expect.any(String) } });
    expect(admin.rpc).toHaveBeenLastCalledWith('finish_password_reset_otp', { p_id: claimId, p_success: true });
  });
  it('rejects weak passwords before consuming the OTP', async () => {
    expect(await invoke({ action: 'verify_and_reset', emp_id: id, otp_code: '012345', new_password: '12345678' })).toMatchObject({ code: 'WEAK_PASSWORD' });
    expect(admin.rpc).not.toHaveBeenCalled();
  });
  it('does not make a consumed OTP reusable after an ambiguous Auth failure', async () => {
    admin.auth.admin.updateUserById.mockRejectedValue(new Error('timeout'));
    expect(await invoke({ action: 'verify_and_reset', emp_id: id, otp_code: '012345', new_password: 'MatKhau9' })).toMatchObject({ code: 'RESET_UNCERTAIN' });
    expect(admin.rpc).toHaveBeenCalledOnce();
  });
  it('reports Auth success honestly if the audit transaction fails', async () => {
    admin.rpc.mockResolvedValueOnce({ data: { code: 'OK', id: claimId, user_id: 'auth-user' } }).mockResolvedValueOnce({ error: { message: 'db unavailable' } });
    expect(await invoke({ action: 'verify_and_reset', emp_id: id, otp_code: '012345', new_password: 'MatKhau9' })).toMatchObject({ ok: true, code: 'AUDIT_PENDING' });
  });
  it('keeps legacy admin reset protected without a bearer session', async () => {
    expect(await invoke({ target_emp_id: id, new_password: 'MatKhau9' })).toMatchObject({ status: 401 });
    expect(admin.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
  it.each([false, true])('verifies bearer identity and ADMIN role for a public endpoint (admin=%s)', async allowed => {
    admin.auth.getUser.mockResolvedValue({ data: { user: { id: 'caller' } } });
    admin.from.mockImplementation(table => {
      const query = { select: () => query, eq: () => query,
        single: vi.fn().mockResolvedValue({ data: { emp_id: 'caller-employee', id: 'target-auth' } }),
        limit: vi.fn().mockResolvedValue({ data: allowed ? [{ id: 1 }] : [] }),
        update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      };
      expect(['app_profiles','user_store_roles']).toContain(table);
      return query;
    });
    const response = await handler(new Request('http://local/reset-password', { method: 'POST', headers: { Authorization: 'Bearer caller-token' },
      body: JSON.stringify({ target_emp_id: id, new_password: 'MatKhau9' }) }));
    expect(admin.auth.getUser).toHaveBeenCalledWith('caller-token');
    expect(response.status).toBe(allowed ? 200 : 403);
    if (allowed) expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith('target-auth', expect.objectContaining({ user_metadata: { must_change_password: true, password_changed_at: null } }));
    else expect(admin.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
  it('rejects malformed bodies and unsupported actions', async () => {
    expect(await invoke(null)).toMatchObject({ code: 'INVALID_INPUT' });
    expect(await invoke({ action: 'other' })).toMatchObject({ code: 'INVALID_ACTION' });
    expect(await invoke({ action: 'request_otp', emp_id: 'wrong' })).toMatchObject({ code: 'INVALID_EMP_ID' });
  });
  it('binds the OTP hash to the employee and server secret', async () => {
    expect(await hashOtp(id, '012345', 'secret')).not.toBe(await hashOtp('other', '012345', 'secret'));
    expect(await hashOtp(id, '012345', 'secret')).not.toBe(await hashOtp(id, '012345', 'different'));
    expect(generateOtp()).toMatch(/^\d{6}$/);
  });
});
