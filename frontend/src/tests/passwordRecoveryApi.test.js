import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../lib/supabase', () => ({ supabase: {}, supabaseUrl: 'https://fixture.supabase.co', supabaseAnonKey: 'public-fixture' }));
import { requestPasswordResetOtp, resetPasswordWithOtp } from '../services/api/password';
beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"ok":true,"channel":"email"}'))); vi.stubEnv('VITE_ADMIN_OTP_URL', ''); vi.stubEnv('VITE_PASSWORD_RESET_URL', ''); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('requests OTP without a logged-in session or service-role key', async () => {
  await requestPasswordResetOtp(' 260512001 ');
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('https://fixture.supabase.co/functions/v1/reset-password');
  expect(JSON.parse(options.body)).toEqual({ action: 'request_otp', emp_id: '260512001' });
  expect(options.headers).toEqual({ 'Content-Type': 'application/json', apikey: 'public-fixture' });
});
it('preserves leading zeroes in OTP and posts the reset action', async () => {
  await resetPasswordWithOtp('260512001', '012345', 'MatKhau9');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ action: 'verify_and_reset', otp_code: '012345', new_password: 'MatKhau9' });
});
it('propagates error codes so the UI can return to OTP entry', async () => {
  fetch.mockResolvedValue(new Response('{"ok":false,"code":"OTP_LOCKED","error":"Nhập sai 5 lần"}', { status: 400 }));
  await expect(resetPasswordWithOtp('260512001', '012345', 'MatKhau9')).rejects.toMatchObject({ code: 'OTP_LOCKED', message: 'Nhập sai 5 lần' });
});
it('rejects weak passwords before making a request', () => {
  expect(() => resetPasswordWithOtp('260512001', '012345', '12345678')).toThrow('quá đơn giản');
  expect(fetch).not.toHaveBeenCalled();
});
