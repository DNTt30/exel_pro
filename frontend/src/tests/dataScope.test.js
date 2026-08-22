import { describe, it, expect } from 'vitest';
import { bootstrapQueryPlan } from '../utils/dataScope';

describe('bootstrapQueryPlan', () => {
  it('scopes staff to their store and defers logs', () => {
    const plan = bootstrapQueryPlan({
      id: '260716009',
      role: 'employee',
      dept: 'VN0485',
      jobTitle: 'STFT'
    });
    expect(plan.manager).toBe(false);
    expect(plan.employees).toEqual({ dept: 'VN0485' });
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
