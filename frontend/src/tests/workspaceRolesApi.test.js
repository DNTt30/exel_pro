import { beforeEach, expect, it, vi } from 'vitest';
import { getWorkspaceRoles, saveWorkspaceRole, assignWorkspaceRole } from '../services/api/workspaceRoles';
import { getEmployees } from '../services/api/employees';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), select: vi.fn(), order: vi.fn(), eq: vi.fn(), result: vi.fn() }));
vi.mock('../services/api/client', () => ({ db: () => mocks }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.from.mockReturnValue(mocks); mocks.select.mockReturnValue(mocks); mocks.eq.mockReturnValue(mocks); mocks.order.mockReturnValue(mocks);
  // PostgREST query builders intentionally implement the PromiseLike protocol.
  // eslint-disable-next-line unicorn/no-thenable
  mocks.then = (resolve, reject) => Promise.resolve(mocks.result()).then(resolve, reject);
});
const employee = { id: 'nv', role: 'STPT', jobTitle: '', type: 'STPT', dept: 'A', workspaceRoleId: null };
it('assignment sends explicit prior authority snapshot to the server', async () => {
  mocks.rpc.mockResolvedValue({ data: { ...employee, role: 'SM', workspaceRoleId: 'r' } });
  await assignWorkspaceRole(employee, 'r');
  expect(mocks.rpc).toHaveBeenCalledWith('assign_workspace_role', { p_emp_id: 'nv', p_role_id: 'r', p_expected: { workspaceRoleId: null, role: 'STPT', jobTitle: '', type: 'STPT', dept: 'A' } });
});
it('rejects client-proposed custom admin before API', async () => {
  await expect(saveWorkspaceRole({ name: 'Boss', permissionGroup: 'admin', isActive: true })).rejects.toThrow();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it.each([
  [{ code: '23505' }, 'đã tồn tại'], [{ code: '42501' }, 'Admin'],
  [{ code: '40001', message: 'ROLE_CONFLICT' }, 'Tải lại'],
  [{ message: 'ROLE_GROUP_IMMUTABLE' }, 'cố định'], [{ message: 'ROLE_UNAVAILABLE' }, 'không còn hoạt động'],
])('surfaces mutation failure %j', async (error, message) => {
  mocks.rpc.mockResolvedValue({ error });
  await expect(saveWorkspaceRole({ name: 'Boss', permissionGroup: 'staff', isActive: true })).rejects.toThrow(message);
});
it('missing catalog reports migration issue rather than empty success', async () => {
  mocks.result.mockReturnValue({ error: { code: '42P01' } });
  await expect(getWorkspaceRoles()).rejects.toThrow('migration');
});
it('reads custom role IDs without changing canonical roles', async () => {
  mocks.result.mockReturnValue({ data: [{ id: 'nv', workspace_role_id: 'r1', role: 'STPT' }] });
  expect((await getEmployees())[0]).toMatchObject({ workspaceRoleId: 'r1', role: 'STPT' });
});
it('only falls back for the new missing column and preserves store scope', async () => {
  mocks.result.mockReturnValueOnce({ error: { code: '42703', message: 'column employees.workspace_role_id does not exist' } }).mockReturnValueOnce({ data: [{ id: 'nv', role: 'STPT' }] });
  expect((await getEmployees({ dept: 'A' }))[0].workspaceRoleId).toBe(null);
  expect(mocks.eq.mock.calls).toEqual([['dept', 'A'], ['dept', 'A']]);
  expect(mocks.select.mock.calls[1][0]).not.toContain('workspace_role_id');
});
it.each([{ code: '42501', message: 'permission denied' }, { code: '42703', message: 'column skills missing' }])('does not hide unrelated employee read errors %j', async error => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.result.mockReturnValue({ error }); await expect(getEmployees()).rejects.toEqual(error);
  expect(mocks.select).toHaveBeenCalledTimes(1); vi.restoreAllMocks();
});
