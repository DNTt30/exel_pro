import { beforeEach, expect, it, vi } from 'vitest';
import { create } from 'zustand';
import { createWorkspaceRolesSlice } from '../store/slices/workspaceRolesSlice';
import { customRoleName, workspaceRoleSchema } from '../utils/workspaceRoles';
import { isManagerFromEmp, isAreaManagerFromEmp } from '../lib/authSession';
import * as api from '../services/api';
vi.mock('../services/api', () => ({ getWorkspaceRoles: vi.fn(), saveWorkspaceRole: vi.fn(), assignWorkspaceRole: vi.fn() }));
const admin = { id: 'admin', role: 'admin' };
const employee = { id: 'nv', role: 'STPT', type: 'STPT', jobTitle: 'STPT', maxH: 23, dept: 'A', workspaceRoleId: 'r1' };
const role = { id: 'r1', name: 'Quản lý khu vực', permissionGroup: 'staff', isActive: true, revision: 1 };
const store = (user = admin) => create((set, get) => ({ user, _sessionEpoch: 1, employees: [employee], ...createWorkspaceRolesSlice(set, get) }));
beforeEach(() => vi.resetAllMocks());
it('custom name cannot confer authority or alter contract', () => {
  expect(customRoleName(employee, [role])).toBe('Quản lý khu vực');
  expect(isManagerFromEmp(employee)).toBe(false);
  expect(isAreaManagerFromEmp(employee)).toBe(false);
  expect(employee.maxH).toBe(23);
});
it.each(['admin', 'owner', '', null])('rejects unsupported group %s', permissionGroup => {
  expect(workspaceRoleSchema.safeParse({ name: 'Role', permissionGroup, isActive: true }).success).toBe(false);
});
it.each(['', 'a', '<script>', 'Role\nName', 'a'.repeat(61)])('rejects invalid name %s', name => {
  expect(workspaceRoleSchema.safeParse({ name, permissionGroup: 'staff', isActive: true }).success).toBe(false);
});
it.each([null, { id: 'sm', role: 'SM' }, { id: 'am', role: 'OFC' }, { id: 'nv', role: 'admin' }])('blocks non-admin mutation %j', async user => {
  const s = store(user);
  await expect(s.getState().saveWorkspaceRole(role)).rejects.toThrow('Admin');
  await expect(s.getState().assignWorkspaceRole(employee, 'r2')).rejects.toThrow('Admin');
  expect(api.saveWorkspaceRole).not.toHaveBeenCalled(); expect(api.assignWorkspaceRole).not.toHaveBeenCalled();
});
it('failed assignment leaves employee unchanged', async () => {
  const s = store(); api.assignWorkspaceRole.mockRejectedValue(new Error('conflict'));
  await expect(s.getState().assignWorkspaceRole(employee, 'r2')).rejects.toThrow('conflict');
  expect(s.getState().employees).toEqual([employee]);
});
it('applies only server-returned authority, preserving contract data', async () => {
  const s = store(); api.assignWorkspaceRole.mockResolvedValue({ id: 'nv', role: 'SM', jobTitle: 'SM', workspaceRoleId: 'r2' });
  await s.getState().assignWorkspaceRole(employee, 'r2');
  expect(s.getState().employees[0]).toMatchObject({ role: 'SM', type: 'STPT', maxH: 23, dept: 'A' });
});
it('logout prevents pending catalog response from restoring private data', async () => {
  const s = store(); let resolve; api.getWorkspaceRoles.mockReturnValue(new Promise(r => { resolve = r; }));
  const pending = s.getState().loadWorkspaceRoles(); s.setState({ user: null, _sessionEpoch: 2, workspaceRoles: [] });
  resolve([role]); await pending; expect(s.getState().workspaceRoles).toEqual([]);
});
it('a slow read cannot overwrite a successful rename', async () => {
  const s = store(); let resolve; api.getWorkspaceRoles.mockReturnValue(new Promise(r => { resolve = r; }));
  const pending = s.getState().loadWorkspaceRoles(); api.saveWorkspaceRole.mockResolvedValue({ ...role, name: 'Renamed', revision: 2 });
  await s.getState().saveWorkspaceRole({}, role); resolve([role]); await pending;
  expect(s.getState().workspaceRoles[0].name).toBe('Renamed'); expect(s.getState().rolesStatus).toBe('ready');
});
