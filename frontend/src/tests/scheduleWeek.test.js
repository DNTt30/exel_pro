import { describe, it, expect } from 'vitest';
import { listNearbyWeeks } from '../data/constants';
import { isWeekLocked, weekRecordKey, weekStatusMeta } from '../utils/scheduleWeek';

describe('schedule week flow', () => {
  it('lists history weeks plus current and future', () => {
    const list = listNearbyWeeks(new Date('2026-08-22T12:00:00'), 8, 4);
    expect(list).toHaveLength(13);
    expect(list.find(w => w.offset === 0).tag).toBe('Tuần này');
    expect(list.find(w => w.offset === -2).tag).toContain('Lịch sử');
  });

  it('locks pending and approved weeks', () => {
    expect(isWeekLocked('draft')).toBe(false);
    expect(isWeekLocked('rejected')).toBe(false);
    expect(isWeekLocked('pending')).toBe(true);
    expect(isWeekLocked('approved')).toBe(true);
    expect(weekRecordKey('VN0485', '2026-08-17')).toBe('VN0485::2026-08-17');
    expect(weekStatusMeta('approved').label).toBe('Đã duyệt');
  });
});
