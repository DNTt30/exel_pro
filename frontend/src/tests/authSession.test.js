import { describe, it, expect } from 'vitest';
import { toAuthEmail, toAuthPassword, authMetadata, isManagerFromEmp, isAreaManagerFromEmp, isStoreManagerFromEmp, isOpsManager, canPickStore, appRoleOf, canApproveSchedule } from '../lib/authSession';

describe('toAuthEmail', () => {
  it('maps admin and employee ids to ofc.internal emails', () => {
    expect(toAuthEmail('admin')).toBe('admin@ofc.app');
    expect(toAuthEmail('260804002')).toBe('260804002@ofc.app');
    expect(toAuthEmail('')).toBe('');
  });
});

describe('toAuthPassword', () => {
  it('is at least 6 characters and keeps Hướng B pin 1', () => {
    expect(toAuthPassword('admin').length).toBeGreaterThanOrEqual(6);
    expect(toAuthPassword('260804002')).toContain('260804002');
  });
});

describe('isManagerFromEmp', () => {
  it('detects store SM vs OFC area manager', () => {
    expect(isStoreManagerFromEmp({ role: 'Cửa hàng trưởng' })).toBe(true);
    expect(isAreaManagerFromEmp({ role: 'Cửa hàng trưởng' })).toBe(false);
    expect(isAreaManagerFromEmp({ role: 'OFC' })).toBe(true);
    expect(isAreaManagerFromEmp({ role: 'SM' })).toBe(true);
    expect(isManagerFromEmp({ role: 'OFC' })).toBe(true);
    expect(isManagerFromEmp({ role: 'Cửa hàng trưởng' })).toBe(true);
    expect(isManagerFromEmp({ role: 'STPT', type: 'STPT' })).toBe(false);
    expect(isManagerFromEmp({ role: 'employee', jobTitle: 'Cửa hàng trưởng' })).toBe(true);
    expect(isAreaManagerFromEmp({ role: 'employee', jobTitle: 'OFC' })).toBe(true);
  });
});

describe('isOpsManager / canPickStore', () => {
  it('treats builtin admin as store SM who can pick a store', () => {
    const admin = { id: 'admin', role: 'admin', isManager: true, jobTitle: 'Cửa hàng trưởng' };
    expect(isOpsManager(admin)).toBe(true);
    expect(canPickStore(admin)).toBe(true);
  });

  it('gives Cửa hàng trưởng the same manager UI, locked to their store', () => {
    const sm = { id: '260000001', role: 'employee', isManager: true, jobTitle: 'Cửa hàng trưởng', dept: 'VN0485' };
    expect(isOpsManager(sm)).toBe(true);
    expect(isStoreManagerFromEmp(sm)).toBe(true);
    expect(canPickStore(sm)).toBe(false);
  });

  it('lets OFC pick stores', () => {
    const ofc = { id: '260000002', role: 'employee', isManager: true, jobTitle: 'OFC', dept: 'VN0470' };
    expect(isOpsManager(ofc)).toBe(true);
    expect(canPickStore(ofc)).toBe(true);
  });

  it('keeps regular staff off manager UI', () => {
    const nv = { id: '260000003', role: 'employee', jobTitle: 'STPT', dept: 'VN0485' };
    expect(isOpsManager(nv)).toBe(false);
    expect(canPickStore(nv)).toBe(false);
  });
});

describe('appRoleOf', () => {
  it('maps Staff / SM / AM / Admin', () => {
    expect(appRoleOf({ role: 'employee', jobTitle: 'STPT' })).toBe('staff');
    expect(appRoleOf({ role: 'employee', isManager: true, jobTitle: 'Cửa hàng trưởng', dept: 'VN0485' })).toBe('sm');
    expect(appRoleOf({ role: 'employee', isManager: true, jobTitle: 'OFC' })).toBe('am');
    expect(appRoleOf({ id: 'admin', role: 'admin', isManager: true })).toBe('admin');
    expect(canApproveSchedule({ id: 'admin', role: 'admin' })).toBe(true);
    expect(canApproveSchedule({ isManager: true, jobTitle: 'Cửa hàng trưởng' })).toBe(false);
  });
});

describe('authMetadata', () => {
  it('writes emp_id, role and is_manager for RLS', () => {
    expect(authMetadata({ id: 'admin', role: 'admin', isManager: false })).toEqual({
      emp_id: 'admin',
      role: 'admin',
      is_manager: false,
      dept: ''
    });
    expect(authMetadata({ id: '260804002', role: 'employee', isManager: true, dept: 'VN0485' })).toEqual({
      emp_id: '260804002',
      role: 'employee',
      is_manager: true,
      dept: 'VN0485'
    });
  });
});
