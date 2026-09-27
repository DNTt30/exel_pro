import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand';
import { createAuthSlice } from '../store/slices/authSlice';
import * as api from '../services/api';
import { supabase } from '../lib/supabase';
import { ensureAuthSession, provisionAuthUser, isOpsManager, signOutAuth } from '../lib/authSession';
import { checkDeviceTrusted } from '../lib/adminOtp';
import { checkLocked, recordFailure, resetFailures, THROTTLE_MAX_FAILS } from '../lib/loginThrottle';
import { verifyAdminPassword } from '../lib/adminCredential';

vi.mock('../services/api', () => ({
  getEmployeeById: vi.fn(),
  getEmployees: vi.fn(),
  addActivityLog: vi.fn(),
  changeMyPassword: vi.fn(),
}));
vi.mock('../lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: vi.fn(), updateUser: vi.fn(), signOut: vi.fn() } },
}));
vi.mock('../lib/authSession', async (importOriginal) => ({
  ...await importOriginal(),
  ensureAuthSession: vi.fn(),
  provisionAuthUser: vi.fn(),
  signOutAuth: vi.fn(),
}));
vi.mock('../lib/adminOtp', () => ({ checkDeviceTrusted: vi.fn() }));
vi.mock('../lib/adminCredential', () => ({ verifyAdminPassword: vi.fn() }));
vi.mock('../utils/appLogs', () => ({ rememberClientIp: vi.fn(), clientMeta: () => ({}), redact: vi.fn() }));
vi.mock('../utils/telegram', () => ({ telegramConfigured: () => false, notifyTelegram: vi.fn() }));

const employee = { id: '260512001', name: 'Nhân viên', role: 'STFT', type: 'STFT', dept: 'VN0485', isActive: true };
const invalidPassword = { data: { session: null }, error: { code: 'invalid_credentials', message: 'Invalid login credentials' } };
const signedIn = (id = employee.id, metadata = {}) => {
  const user = { email: `${id}@ofc.app`, user_metadata: metadata };
  return { data: { user, session: { user } }, error: null };
};
let store;

beforeEach(() => {
  vi.resetAllMocks();
  resetFailures('admin');
  resetFailures(employee.id);
  api.getEmployeeById.mockResolvedValue({ ...employee });
  api.addActivityLog.mockResolvedValue(null);
  supabase.auth.signInWithPassword.mockResolvedValue(signedIn());
  supabase.auth.updateUser.mockResolvedValue({ error: null });
  checkDeviceTrusted.mockResolvedValue(true);
  provisionAuthUser.mockResolvedValue({ ok: true });
  supabase.auth.signOut.mockResolvedValue({ error: null });
  verifyAdminPassword.mockResolvedValue(false);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  store = createStore((set, get) => ({
    ...createAuthSlice(set, get),
    employees: [employee],
    appendAdminLog: vi.fn(),
    initializeData: vi.fn().mockResolvedValue(),
  }));
});

afterEach(() => vi.restoreAllMocks());

describe('useStore.login', () => {
  it('allows exactly seven days and blocks one millisecond later', async () => {
    const now = new Date('2026-09-27T00:00:00Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    api.getEmployeeById.mockResolvedValue({ ...employee, createdAt: new Date(now - 7 * 86400000).toISOString() });
    await expect(store.getState().login(employee.id, '1')).resolves.toMatchObject({ mustChangePassword: true });
    await store.getState().logout();
    vi.mocked(Date.now).mockReturnValue(now + 1);
    supabase.auth.signInWithPassword.mockClear();
    await expect(store.getState().login(employee.id, '1')).rejects.toMatchObject({ code: 'PASSWORD_EXPIRED' });
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('honors an admin reset flag with a non-default password', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce(signedIn(employee.id, { must_change_password: true }));
    await expect(store.getState().login(employee.id, 'Temporary9')).resolves.toMatchObject({ mustChangePassword: true });
  });
  it('does not revive a session when logout occurs during sign-in', async () => {
    let finish;
    supabase.auth.signInWithPassword.mockReturnValueOnce(new Promise(resolve => { finish=resolve; }));
    const login=store.getState().login(employee.id,'1');
    const rejected=expect(login).rejects.toThrow('đã được thay thế');
    await vi.waitFor(() => expect(supabase.auth.signInWithPassword).toHaveBeenCalled());
    const logout=store.getState().logout();
    finish(signedIn()); await rejected; await logout;
    expect(store.getState().user).toBeNull();
    expect(store.getState().initializeData).not.toHaveBeenCalled();
  });

  it.each([[8,true],[2,false]])('computes expiry from the real login with an account %i days old', async (days,expired) => {
    api.getEmployeeById.mockResolvedValueOnce({...employee,createdAt:new Date(Date.now()-days*86400000).toISOString()});
    if (expired) {
      await expect(store.getState().login(employee.id, '1')).rejects.toMatchObject({ code: 'PASSWORD_EXPIRED' });
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
      expect(store.getState().user).toBeNull();
      expect(store.getState().initializeData).not.toHaveBeenCalled();
      return;
    }
    const user=await store.getState().login(employee.id,'1');
    expect(user.mustChangePassword).toBe(true);
    expect(user.isPasswordExpired).toBe(expired);
  });
  it('allows an older account with its changed password', async () => {
    api.getEmployeeById.mockResolvedValueOnce({ ...employee, createdAt: new Date(Date.now() - 8 * 86400000).toISOString() });
    const user = await store.getState().login(employee.id, 'changed-password');
    expect(user.isPasswordExpired).toBe(false);
    expect(signOutAuth).not.toHaveBeenCalled();
  });
  it.each(['', 'abc', '12345678', '1234567890', '12345678a'])('chặn mã không hợp lệ: %j trước khi gọi API', async (id) => {
    await expect(store.getState().login(id, '1')).rejects.toThrow();
    expect(api.getEmployeeById).not.toHaveBeenCalled();
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(store.getState().user).toBeNull();
  });

  it('chuẩn hóa khoảng trắng và giữ mật khẩu mặc định 1 cho nhân viên', async () => {
    const user = await store.getState().login(` ${employee.id} `, '1');
    expect(api.getEmployeeById).toHaveBeenCalledWith(employee.id);
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: `${employee.id}@ofc.app`, password: `ofc-${employee.id}-1` });
    expect(user).toMatchObject({ id: employee.id, role: 'employee', isManager: false });
    expect(store.getState().user).toEqual(user);
    expect(isOpsManager(user)).toBe(false);
  });

  it('admin / 1 dùng mật khẩu Auth tương ứng ngay lần đầu', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue(signedIn('admin'));
    const user = await store.getState().login(' admin ', '1');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledExactlyOnceWith({ email: 'admin@ofc.app', password: 'ofc-admin-1' });
    expect(user).toMatchObject({ id: 'admin', role: 'admin', isManager: true });
    expect(isOpsManager(user)).toBe(true);
  });

  it.each([{ role: 'Quản lý cửa hàng' }, { role: 'Cửa hàng trưởng' }, { role: 'SM' }, { type: 'SM' }])('nhận diện quản lý %j', async (fields) => {
    api.getEmployeeById.mockResolvedValue({ ...employee, ...fields });
    const user = await store.getState().login(employee.id, '1');
    expect(user.isManager).toBe(true);
    expect(isOpsManager(user)).toBe(true);
  });

  it('không lấy nhân viên từ cache nếu server không tìm thấy', async () => {
    api.getEmployeeById.mockResolvedValue(null);
    await expect(store.getState().login(employee.id, '1')).rejects.toThrow('Không tìm thấy');
    expect(api.getEmployees).not.toHaveBeenCalled();
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(store.getState().user).toBeNull();
  });

  it('chặn tài khoản đã vô hiệu hóa', async () => {
    api.getEmployeeById.mockResolvedValue({ ...employee, isActive: false });
    await expect(store.getState().login(employee.id, '1')).rejects.toThrow('vô hiệu hóa');
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('kiểm tra khóa tạm trước khi tra cứu nhân viên', async () => {
    for (let i = 0; i < THROTTLE_MAX_FAILS; i++) recordFailure(employee.id);
    await expect(store.getState().login(employee.id, '1')).rejects.toThrow('quá nhiều lần');
    expect(api.getEmployeeById).not.toHaveBeenCalled();
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it.each(['admin', employee.id])('lỗi mạng không khóa tài khoản %s', async (id) => {
    supabase.auth.signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'));
    for (let i = 0; i < THROTTLE_MAX_FAILS; i++) {
      await expect(store.getState().login(id, '1')).rejects.toThrow('kết nối');
    }
    expect(checkLocked(id)).toMatchObject({ allowed: true, recentFails: 0 });
    expect(provisionAuthUser).not.toHaveBeenCalled();
    expect(store.getState().user).toBeNull();
  });

  it.each([{ status: 503 }, { status: 429 }, { code: 'email_not_confirmed' }])('lỗi dịch vụ %j không tính là sai mật khẩu', async (error) => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error });
    await expect(store.getState().login(employee.id, '1')).rejects.toThrow('xác thực');
    expect(checkLocked(employee.id).recentFails).toBe(0);
    expect(provisionAuthUser).not.toHaveBeenCalled();
  });

  it('mật khẩu riêng sai không tự tạo tài khoản', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue(invalidPassword);
    await expect(store.getState().login(employee.id, 'wrong')).rejects.toThrow('Mật khẩu không chính xác');
    expect(checkLocked(employee.id).recentFails).toBe(1);
    expect(provisionAuthUser).not.toHaveBeenCalled();
  });

  it('không tự tạo tài khoản nhân viên khi mật khẩu mặc định bị từ chối', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce(invalidPassword).mockResolvedValueOnce(signedIn());
    await expect(store.getState().login(employee.id, '1')).rejects.toThrow('Mật khẩu không chính xác');
    expect(provisionAuthUser).not.toHaveBeenCalled();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledOnce();
  });

  it('không dùng lại phiên cũ để vượt qua mật khẩu bị từ chối', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue(invalidPassword);
    ensureAuthSession.mockResolvedValue({ ok: true, session: signedIn().data.session });
    await expect(store.getState().login(employee.id, '1')).rejects.toThrow('Mật khẩu không chính xác');
    expect(ensureAuthSession).not.toHaveBeenCalled();
    expect(store.getState().user).toBeNull();
  });

  it('chặn cả mật khẩu Auth mặc định nhập trực tiếp khi quá hạn', async () => {
    api.getEmployeeById.mockResolvedValueOnce({ ...employee, createdAt: new Date(Date.now() - 8 * 86400000).toISOString() });
    await expect(store.getState().login(employee.id, `ofc-${employee.id}-1`)).rejects.toMatchObject({ code: 'PASSWORD_EXPIRED' });
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('giữ đăng nhập bằng mật khẩu riêng trên thiết bị mới', async () => {
    const user = await store.getState().login(employee.id, 'ExistingPassword9');
    expect(user.mustChangePassword).toBe(false);
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: `${employee.id}@ofc.app`, password: 'ExistingPassword9' });
  });

  it('dọn phiên admin và không ghi LOGIN_FAILED khi đang chờ OTP', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue(signedIn('admin'));
    checkDeviceTrusted.mockResolvedValue(false);
    await expect(store.getState().login('admin', '1')).rejects.toMatchObject({ code: 'OTP_REQUIRED' });
    expect(supabase.auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
    expect(store.getState().user).toBeNull();
    expect(store.getState().initializeData).not.toHaveBeenCalled();
    expect(api.addActivityLog).not.toHaveBeenCalled();
    checkDeviceTrusted.mockResolvedValue(true);
    await expect(store.getState().login('admin', '1')).resolves.toMatchObject({ id: 'admin' });
  });

  it('chặn đăng nhập nếu không dọn được phiên trong bước OTP', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue(signedIn('admin'));
    checkDeviceTrusted.mockResolvedValue(false);
    supabase.auth.signOut.mockResolvedValue({ error: { message: 'unavailable' } });
    await expect(store.getState().login('admin', '1')).rejects.toThrow('hoàn tất bước xác thực');
    expect(store.getState().user).toBeNull();
    expect(store.getState().initializeData).not.toHaveBeenCalled();
  });

  it('lỗi ghi log và tải dữ liệu không làm đăng nhập thành công báo thất bại', async () => {
    store.getState().appendAdminLog.mockRejectedValue(new Error('log unavailable'));
    store.getState().initializeData.mockRejectedValue(new Error('data unavailable'));
    await expect(store.getState().login(employee.id, '1')).resolves.toMatchObject({ id: employee.id });
    expect(store.getState().user?.id).toBe(employee.id);
  });

  it('lỗi ghi log không che mất lỗi đăng nhập', async () => {
    api.addActivityLog.mockRejectedValue(new Error('log unavailable'));
    supabase.auth.signInWithPassword.mockResolvedValue(invalidPassword);
    await expect(store.getState().login(employee.id, 'wrong')).rejects.toThrow('Mật khẩu không chính xác');
  });

  it('đăng nhập thành công xóa cảnh báo cũ và bộ đếm sai', async () => {
    recordFailure(employee.id);
    store.setState({ authWarning: 'old error' });
    await store.getState().login(employee.id, '1');
    expect(checkLocked(employee.id).recentFails).toBe(0);
    expect(store.getState().authWarning).toBeNull();
  });
});

describe('password state updates', () => {
  it('clears flags only after successful API write and never stores the password', async () => {
    store.setState({ user: { ...employee, mustChangePassword: true } });
    api.changeMyPassword.mockRejectedValueOnce(new Error('write failed'));
    await expect(store.getState().changeMyPassword('1', 'MatKhau9')).rejects.toThrow('write failed');
    expect(store.getState().user.mustChangePassword).toBe(true);
    api.changeMyPassword.mockResolvedValueOnce(true);
    await store.getState().changeMyPassword('1', 'MatKhau9');
    expect(store.getState().user).toMatchObject({ mustChangePassword: false, mustSetupPassword: false });
    expect(JSON.stringify(store.getState())).not.toContain('MatKhau9');
  });
  it('does not revive the user if logout occurs while the API write is pending', async () => {
    store.setState({ user: { ...employee, mustChangePassword: true } });
    let finish;
    api.changeMyPassword.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const write = store.getState().changeMyPassword('1', 'MatKhau9');
    const rejected = expect(write).rejects.toThrow('đã thay đổi');
    await vi.waitFor(() => expect(api.changeMyPassword).toHaveBeenCalled());
    const logout = store.getState().logout();
    finish(true);
    await rejected;
    await logout;
    expect(store.getState().user).toBeNull();
  });
});
