import { describe, it, expect } from 'vitest';
import { toAuthEmail, toAuthPassword, authMetadata, isManagerFromEmp } from '../lib/authSession';

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
  it('detects SM and store manager roles', () => {
    expect(isManagerFromEmp({ role: 'SM' })).toBe(true);
    expect(isManagerFromEmp({ role: 'Cửa hàng trưởng' })).toBe(true);
    expect(isManagerFromEmp({ role: 'STPT', type: 'STPT' })).toBe(false);
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
