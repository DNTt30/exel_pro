import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), updateUser: vi.fn(), rpc: vi.fn(), from: vi.fn(),
}));
vi.mock('../lib/supabase', () => ({ supabase: { auth: mocks, rpc: mocks.rpc, from: mocks.from }, supabaseAnonKey: 'fixture', supabaseUrl: '' }));
import { ensureAuthSession } from '../lib/authSession';
import { changeMyPassword, adminResetPassword, updateAdminSessionPassword } from '../services/api/password';
import { validateNewPassword } from '../utils/passwordPolicy';

const user = { id: '260512001' };
const session = { user: { email: `${user.id}@ofc.app` } };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ error: null });
});

describe('shared password policy', () => {
  it.each(['1', '12345678', 'PASSWORD', 'password1', '00000000', '11111111', 'abcdefgh', 'abcdefgh ', 'mậtkhẩumới'])('rejects weak password %j', pw => {
    expect(validateNewPassword(pw)).toBeTruthy();
  });
  it.each(['MatKhau9', 'MatKhau!', 'MậtKhẩu9', 'abcdefgh/'])('accepts %j', pw => {
    expect(validateNewPassword(pw)).toBeNull();
  });
});

describe('session restoration cannot create a default-password login', () => {
  it.each([undefined, '', null])('requires an explicit password when no session exists (%j)', async password => {
    expect(await ensureAuthSession(user, { password, allowSignUp: true })).toMatchObject({ ok: false });
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it('never provisions after rejected credentials even with the old allowSignUp option', async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message: 'invalid' } });
    expect(await ensureAuthSession(user, { password: 'wrong', allowSignUp: true })).toMatchObject({ ok: false });
    expect(mocks.signInWithPassword).toHaveBeenCalledExactlyOnceWith({ email: session.user.email, password: 'wrong' });
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it('restores the existing matching session without a password or metadata write', async () => {
    mocks.getSession.mockResolvedValue({ data: { session } });
    expect(await ensureAuthSession(user, { restoreOnly: true })).toEqual({ ok: true, session });
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it('does not sign out a different account or log in during restoration', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { email: 'other@ofc.app' } } } });
    expect(await ensureAuthSession(user, { restoreOnly: true })).toMatchObject({ ok: false });
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe('password writes require a valid session and consistent policy', () => {
  it('does not fabricate a session from userId when changing a password', async () => {
    await expect(changeMyPassword('1', 'MatKhau9', { userId: user.id, isFirstTime: true })).rejects.toThrow('phiên đăng nhập');
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it('rejects a session belonging to another user', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { email: 'other@ofc.app' } } } });
    await expect(changeMyPassword('1', 'MatKhau9', { userId: user.id })).rejects.toThrow('đã thay đổi');
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it('does not substitute a default password for an empty old password', async () => {
    mocks.getSession.mockResolvedValue({ data: { session } });
    await expect(changeMyPassword('', 'MatKhau9', { userId: user.id })).rejects.toThrow('nhập mật khẩu hiện tại');
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it('requires successful reauthentication before updating', async () => {
    mocks.getSession.mockResolvedValue({ data: { session } });
    mocks.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    await expect(changeMyPassword('1', 'MatKhau9', { userId: user.id })).rejects.toThrow('không đúng');
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: session.user.email, password: `ofc-${user.id}-1` });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it('changes the password and clears server flags after explicit authentication', async () => {
    mocks.getSession.mockResolvedValue({ data: { session } });
    mocks.signInWithPassword.mockResolvedValue({ data: { session }, error: null });
    await expect(changeMyPassword('1', 'MatKhau9', { userId: user.id })).resolves.toBe(true);
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'MatKhau9', data: { must_change_password: false, password_changed_at: expect.any(String) } });
  });
  it.each([changeMyPassword.bind(null, '1'), adminResetPassword.bind(null, user.id), updateAdminSessionPassword])('rejects weak passwords before any API call', async write => {
    await expect(write('12345678')).rejects.toThrow('quá đơn giản');
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
