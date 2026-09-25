import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ signInWithPassword: vi.fn(), updateUser: vi.fn(), rpc: vi.fn(), verifyAdminPassword: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { auth: mocks, rpc: mocks.rpc }, supabaseAnonKey: 'fixture' }));
vi.mock('../lib/adminCredential', () => ({ verifyAdminPassword: mocks.verifyAdminPassword }));
import { verifyAdminSessionPassword, updateAdminSessionPassword } from '../services/api/password';
beforeEach(() => { vi.resetAllMocks(); mocks.verifyAdminPassword.mockResolvedValue(false); });
describe('admin credential API preserves existing form behavior', () => {
  it('accepts a valid session and does not attempt default credentials', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    expect(await verifyAdminSessionPassword('current')).toBe(true);
    expect(mocks.signInWithPassword).toHaveBeenCalledOnce();
  });
  it('rejects an incorrect non-default password', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: {}, error: new Error('invalid') });
    expect(await verifyAdminSessionPassword('incorrect')).toBe(false);
    expect(mocks.signInWithPassword).toHaveBeenCalledOnce();
  });
  it('keeps the default 1 fallback but still requires server authentication', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({ error: new Error('invalid') }).mockResolvedValueOnce({ data: { session: {} } });
    expect(await verifyAdminSessionPassword('1')).toBe(true);
    expect(mocks.signInWithPassword).toHaveBeenLastCalledWith({ email: 'admin@ofc.app', password: 'ofc-admin-1' });
    mocks.signInWithPassword.mockResolvedValue({ error: new Error('invalid') });
    expect(await verifyAdminSessionPassword('1')).toBe(false);
  });
  it('propagates failed password writes and does not mark credential set', async () => {
    mocks.updateUser.mockResolvedValue({ error: new Error('write failed') });
    await expect(updateAdminSessionPassword('new-password')).rejects.toThrow('write failed');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('marks credentials after a successful write and tolerates the missing legacy RPC', async () => {
    mocks.updateUser.mockResolvedValue({ error: null }); mocks.rpc.mockRejectedValue(new Error('missing'));
    await expect(updateAdminSessionPassword('new-password')).resolves.toBeUndefined();
    expect(mocks.updateUser).toHaveBeenCalledWith(expect.objectContaining({ password: 'new-password', data: expect.objectContaining({ must_change_password: false }) }));
    expect(mocks.rpc).toHaveBeenCalledWith('mark_credential_set');
  });
});
