import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getSession: vi.fn() }));
vi.mock('../services/api/client', () => ({ db: () => ({ rpc: mocks.rpc }) }));
vi.mock('../lib/supabase', () => ({ supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'public-key', supabase: { auth: { getSession: mocks.getSession } } }));
import { changeMyRecoveryEmail, getEmployeeProfiles, saveMyEmployeeProfile } from '../services/api/employeeProfile';
beforeEach(() => { mocks.rpc.mockResolvedValue({ data: [] }); mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'jwt', user: { email: '260716009@ofc.app' } } } }); });
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); });
it('maps nullable profile fields and reads the scoped RPC', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: [{ id: '260716009', dob: null, major: null, work_plan_until: null }] });
  expect(await getEmployeeProfiles('260716009')).toMatchObject([{ dob: '', major: '', workPlanUntil: '' }]);
  expect(mocks.rpc).toHaveBeenCalledWith('get_employee_profiles', { p_emp_id: '260716009' });
});
it('only sends allowed personal fields and clears empty values to null', async () => {
  const setHeader = vi.fn().mockResolvedValue({ error: null });
  mocks.rpc.mockReturnValueOnce({ setHeader });
  await saveMyEmployeeProfile({ dob: '', university: '  ', major: ' CNTT ', workPlanUntil: '', role: 'ADMIN', recoveryEmail: 'bypass@example.com', id: 'other' }, '260716009');
  expect(mocks.rpc).toHaveBeenCalledWith('update_my_employee_profile', { p_dob: null, p_university: null, p_major: 'CNTT', p_work_plan_until: null });
  expect(setHeader).toHaveBeenCalledWith('Authorization', 'Bearer jwt');
});
it('requires a session, sends password only to Edge, and reports wrong password', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'INVALID_PASSWORD', ok: false }), { status: 400 }));
  vi.stubGlobal('fetch', fetcher);
  mocks.getSession.mockResolvedValueOnce({ data: { session: null } });
  await expect(changeMyRecoveryEmail('new@example.com', 'Current9', '260716009')).rejects.toThrow('Phiên đăng nhập');
  expect(fetcher).not.toHaveBeenCalled();
  await expect(changeMyRecoveryEmail('New@Example.com', 'Current9', '260716009')).rejects.toThrow('Mật khẩu hiện tại không đúng');
  const [url, request] = fetcher.mock.calls[0];
  expect(url).toBe('https://example.supabase.co/functions/v1/employee-profile');
  expect(request.headers.Authorization).toBe('Bearer jwt');
  expect(JSON.parse(request.body)).toEqual({ new_email: 'new@example.com', current_password: 'Current9' });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('rejects saving old form data after the account changed', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await expect(saveMyEmployeeProfile({ dob: '', university: '', major: '', workPlanUntil: '' }, 'other')).rejects.toThrow('Phiên đăng nhập');
  await expect(changeMyRecoveryEmail('new@example.com', 'Current9', 'other')).rejects.toThrow('Phiên đăng nhập');
  expect(mocks.rpc).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
});
