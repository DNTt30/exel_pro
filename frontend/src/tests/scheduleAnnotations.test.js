import { describe, it, expect } from 'vitest';
import {
  getStoreLabel,
  isSupportAssignment,
  getSwapsForWeek,
  getSwapBadgeForDay
} from '../utils/scheduleAnnotations';

const stores = [
  { id: 'VN0485', name: 'GS25 Lê Văn Sỹ' },
  { id: 'VN0497', name: 'GS25 Nguyễn Đình Chiểu' }
];

describe('scheduleAnnotations', () => {
  it('formats store label with name when known', () => {
    expect(getStoreLabel(stores, 'VN0485')).toBe('VN0485 · GS25 Lê Văn Sỹ');
    expect(getStoreLabel(stores, 'VN0001')).toBe('VN0001');
    expect(getStoreLabel(stores, '')).toBe('');
  });

  it('detects hỗ trợ only when covering_store differs from home dept', () => {
    expect(isSupportAssignment({ shift: '6-14', covering_store: 'VN0485' }, 'VN0497')).toBe(true);
    expect(isSupportAssignment({ shift: '6-14', covering_store: 'VN0497' }, 'VN0497')).toBe(false);
    expect(isSupportAssignment('14-22_VN0485', 'VN0497')).toBe(true);
    expect(isSupportAssignment('6-14', 'VN0497')).toBe(false);
    expect(isSupportAssignment('', 'VN0497')).toBe(false);
  });

  it('keeps only this-week pending/approved swaps for the employee', () => {
    const swaps = [
      { id: 1, week: '2026-08-17', fromEmpId: 'A', toEmpId: 'B', status: 'approved' },
      { id: 2, week: '2026-08-17', fromEmpId: 'A', toEmpId: 'C', status: 'rejected' },
      { id: 3, week: '2026-08-10', fromEmpId: 'A', toEmpId: 'B', status: 'pending_partner' },
      { id: 4, week: '2026-08-17', fromEmpId: 'X', toEmpId: 'Y', status: 'pending_manager' }
    ];
    const mine = getSwapsForWeek(swaps, 'A', '2026-08-17');
    expect(mine.map(s => s.id)).toEqual([1]);
  });

  it('labels same-day swap vs swap-out / swap-in', () => {
    const sameDay = [{
      fromEmpId: 'A', toEmpId: 'B', fromEmpName: 'An', toEmpName: 'Bình',
      fromDay: 'T3', toDay: 'T3', status: 'approved'
    }];
    expect(getSwapBadgeForDay(sameDay, 'A', 'T3')).toMatchObject({
      kind: 'swap', pending: false, label: 'Đổi ca với Bình'
    });

    const crossDay = [{
      fromEmpId: 'A', toEmpId: 'B', fromEmpName: 'An', toEmpName: 'Bình',
      fromDay: 'T2', toDay: 'T5', status: 'pending_partner'
    }];
    expect(getSwapBadgeForDay(crossDay, 'A', 'T2')).toMatchObject({
      kind: 'swap-out', pending: true, label: 'Chờ đổi đi · Bình'
    });
    expect(getSwapBadgeForDay(crossDay, 'A', 'T5')).toMatchObject({
      kind: 'swap-in', pending: true, label: 'Chờ nhận ca · Bình'
    });
    expect(getSwapBadgeForDay(crossDay, 'B', 'T2')).toMatchObject({
      kind: 'swap-in', label: 'Chờ nhận ca · An'
    });
    expect(getSwapBadgeForDay(crossDay, 'A', 'T4')).toBeNull();
  });
});
