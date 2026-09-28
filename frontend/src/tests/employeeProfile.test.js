import { describe, expect, it, vi } from 'vitest';
import { validateEmployeeProfile, workPlanReminder } from '../utils/employeeProfile';
import { createEmployeeProfileHandler } from '../../../supabase/functions/employee-profile/handler.js';

describe('profile validation and reminder', () => {
  const empty = { dob: '', university: '', major: '', workPlanUntil: '' };
  it('allows empty optional fields, rejects future and impossible birth dates', () => {
    expect(validateEmployeeProfile(empty)).toBeNull();
    expect(validateEmployeeProfile({ ...empty, dob: '2024-02-29' }, new Date(2026, 8, 28))).toBeNull();
    for (const dob of ['2025-02-29', '2026-10-01', '1899-01-01']) expect(validateEmployeeProfile({ ...empty, dob }, new Date(2026, 8, 28))).toBeTruthy();
    expect(validateEmployeeProfile({ ...empty, major: 'a'.repeat(161) })).toBeTruthy();
  });
  it('warns this/next month across the year boundary but does not guess free text', () => {
    const now = new Date(2026, 11, 31);
    expect(workPlanReminder('Tháng 12/2026', now)).toContain('tháng này');
    expect(workPlanReminder('2027-01', now)).toContain('tháng tới');
    for (const value of ['', 'Đến khi ra trường', '11/2026', '02/2027', '13/2026']) expect(workPlanReminder(value, now)).toBeNull();
  });
});
describe('server-enforced email password verification', () => {
  function setup() {
    const admin = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'trusted-uuid' } } }) },
      rpc: vi.fn(async name => ({ data: name === 'begin_profile_email_change'
        ? { code: 'OK', emp_id: '260716009', recovery_email: 'old@example.com' } : { code: 'OK' } })) };
    const verifyPassword = vi.fn().mockResolvedValue(true);
    const handler = createEmployeeProfileHandler({ admin, verifyPassword });
    const invoke = async (body = { current_password: 'Current9', new_email: 'New@Example.com' }, jwt = 'valid') => {
      const response = await handler(new Request('https://local/employee-profile', { method: 'POST',
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : {}, body: JSON.stringify(body) }));
      return { status: response.status, ...await response.json() };
    };
    return { admin, verifyPassword, invoke };
  }
  it('requires a valid JWT and does not trust client identity', async () => {
    const { admin, invoke, verifyPassword } = setup();
    expect(await invoke(undefined, '')).toMatchObject({ status: 401 });
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(await invoke({ current_password: 'Current9', new_email: 'New@Example.com', emp_id: 'other', user_id: 'attacker' })).toMatchObject({ ok: true });
    expect(verifyPassword).toHaveBeenCalledWith('260716009@ofc.app', 'Current9', 'trusted-uuid');
    expect(admin.rpc).toHaveBeenLastCalledWith('set_verified_recovery_email', { p_user_id: 'trusted-uuid', p_expected_email: 'old@example.com', p_new_email: 'new@example.com' });
  });
  it('never writes after a wrong password, failed Auth, invalid JWT or throttling', async () => {
    const { admin, invoke, verifyPassword } = setup();
    verifyPassword.mockResolvedValueOnce(false);
    expect(await invoke()).toMatchObject({ code: 'INVALID_PASSWORD' });
    expect(admin.rpc).toHaveBeenCalledTimes(1);
    verifyPassword.mockRejectedValueOnce(new Error('Auth unavailable'));
    expect(await invoke()).toMatchObject({ status: 503 });
    expect(admin.rpc).toHaveBeenCalledTimes(2);
    admin.auth.getUser.mockResolvedValueOnce({ error: { message: 'expired' } });
    expect(await invoke()).toMatchObject({ status: 401 });
    admin.rpc.mockResolvedValueOnce({ data: { code: 'RATE_LIMITED' } });
    expect(await invoke()).toMatchObject({ status: 429 });
    expect(verifyPassword).toHaveBeenCalledTimes(2);
  });
  it('rejects missing password/invalid email, preserves concurrent-change conflict', async () => {
    const { admin, invoke } = setup();
    expect(await invoke({ new_email: 'new@example.com' })).toMatchObject({ code: 'PASSWORD_REQUIRED' });
    expect(await invoke({ new_email: 'bad', current_password: 'Current9' })).toMatchObject({ code: 'INVALID_EMAIL' });
    expect(admin.rpc).not.toHaveBeenCalled();
    admin.rpc.mockResolvedValueOnce({ data: { code: 'OK', emp_id: '260716009' } }).mockResolvedValueOnce({ data: { code: 'EMAIL_CHANGED' } });
    expect(await invoke()).toMatchObject({ status: 409, code: 'EMAIL_CHANGED' });
  });
  it('maps only an explicitly supplied default password', async () => {
    const { invoke, verifyPassword } = setup();
    await invoke({ new_email: 'new@example.com', current_password: '1' });
    expect(verifyPassword).toHaveBeenCalledWith('260716009@ofc.app', 'ofc-260716009-1', 'trusted-uuid');
  });
});
