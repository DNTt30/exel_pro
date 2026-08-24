import { describe, it, expect } from 'vitest';
import { bootstrapQueryPlan, visibleDeptIds } from '../utils/dataScope';

describe('bootstrapQueryPlan', () => {
  it('scopes staff to their store and defers logs', () => {
    const plan = bootstrapQueryPlan({
      id: '260716009',
      role: 'employee',
      dept: 'VN0485',
      jobTitle: 'STFT'
    });
    expect(plan.manager).toBe(false);
    // NV nap du danh sach de xem lich da cua hang cung SM
    expect(plan.employees).toEqual({});
    expect(plan.feedbacks.empId).toBe('260716009');
    expect(plan.shelves.assigneeId).toBe('260716009');
    expect(plan.loadLogs).toBe(false);
  });

  it('lets builtin SM pick all stores and still defers logs', () => {
    const plan = bootstrapQueryPlan({
      id: 'admin',
      role: 'admin',
      isManager: true,
      jobTitle: 'Cửa hàng trưởng'
    });
    expect(plan.manager).toBe(true);
    expect(plan.pickStore).toBe(true);
    expect(plan.employees).toEqual({});
    expect(plan.loadLogs).toBe(false);
  });

  it('locks Cửa hàng trưởng to their dept for feedbacks/shelves', () => {
    const plan = bootstrapQueryPlan({
      id: '260000001',
      role: 'employee',
      isManager: true,
      jobTitle: 'Cửa hàng trưởng',
      dept: 'VN0485'
    });
    expect(plan.manager).toBe(true);
    expect(plan.pickStore).toBe(false);
    expect(plan.feedbacks.dept).toBe('VN0485');
    expect(plan.shelves.storeId).toBe('VN0485');
  });
});

describe('visibleDeptIds', () => {
  const stores = [
    { id: 'VN0485', sm_id: '260000001' },
    { id: 'VN0499', sm_id: '260000001' },
    { id: 'VN0500', sm_id: '260000002' },
    { id: 'VN0501', sm_id: '' }
  ];

  it('nv thay CH minh + cac CH cung SM', () => {
    expect(visibleDeptIds({ id: '260716001', dept: 'VN0485' }, stores))
      .toEqual(['VN0485', 'VN0499']);
  });

  it('nv cua CH khong co sm_id chi thay CH minh', () => {
    expect(visibleDeptIds({ id: '260716009', dept: 'VN0501' }, stores))
      .toEqual(['VN0501']);
  });

  it('OFC/admin thay toan bo', () => {
    expect(visibleDeptIds({ id: 'admin', role: 'admin' }, stores)).toHaveLength(4);
  });
});
