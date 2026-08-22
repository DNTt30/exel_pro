import { describe, it, expect } from 'vitest';
import {
  daysUntil,
  expiryStatus,
  isExpiryAlert,
  nearestExpiryDate,
  itemExpiryStatus,
  isItemExpiryAlert,
  dueStatus,
  collectExpiryAlerts
} from '../utils/shelfExpiry';

describe('shelfExpiry', () => {
  const today = new Date('2026-08-21T12:00:00');

  it('counts days until expiry', () => {
    expect(daysUntil('2026-08-21', today)).toBe(0);
    expect(daysUntil('2026-08-24', today)).toBe(3);
    expect(daysUntil('2026-08-18', today)).toBe(-3);
  });

  it('alerts within notify window', () => {
    expect(isExpiryAlert('2026-08-24', 3, today)).toBe(true);
    expect(isExpiryAlert('2026-08-30', 3, today)).toBe(false);
    expect(isExpiryAlert('2026-08-18', 3, today)).toBe(true);
    expect(expiryStatus('2026-08-24', 3, today).key).toBe('soon');
    expect(expiryStatus('', 3, today).key).toBe('none');
  });

  it('uses the earlier of two expiry dates', () => {
    expect(nearestExpiryDate('2026-08-30', '2026-08-22')).toBe('2026-08-22');
    expect(nearestExpiryDate('', '2026-08-30')).toBe('2026-08-30');
    expect(nearestExpiryDate('', '')).toBe('');
    const twoDates = { expiryDate: '2026-08-30', expiryDate2: '2026-08-22' };
    expect(itemExpiryStatus(twoDates, 3, today).key).toBe('soon');
    expect(isItemExpiryAlert(twoDates, 3, today)).toBe(true);
    expect(isItemExpiryAlert({ expiryDate: '2026-08-30', expiryDate2: '2026-09-01' }, 3, today)).toBe(false);
  });

  it('marks assignment due status', () => {
    expect(dueStatus('', false, '', today).key).toBe('none');
    expect(dueStatus('2026-08-21', false, '', today).key).toBe('today');
    expect(dueStatus('2026-08-18', false, '', today).key).toBe('late');
    expect(dueStatus('2026-08-25', true, '2026-08-20T10:00:00', today).key).toBe('done');
  });

  it('collects expiry alerts from shelves', () => {
    const shelves = [{ id: 's1', notifyDays: 3, code: 'A' }];
    const items = [
      { id: 'i1', shelfId: 's1', productName: 'Sữa', expiryDate: '2026-08-22' },
      { id: 'i2', shelfId: 's1', productName: 'Bánh', expiryDate: '2026-09-10' }
    ];
    const hits = collectExpiryAlerts(shelves, items, today);
    expect(hits).toHaveLength(1);
    expect(hits[0].item.id).toBe('i1');
  });
});
