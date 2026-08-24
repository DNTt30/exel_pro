import { describe, it, expect } from 'vitest';
import { normalizeShiftCell } from '../utils/scheduleTextNormalize';

describe('normalizeShiftCell', () => {
  it('chuan hoa cac kieu viet ca', () => {
    expect(normalizeShiftCell('18-22')).toBe('18-22');
    expect(normalizeShiftCell('6h-18h')).toBe('6-18');
    expect(normalizeShiftCell('18-22h')).toBe('18-22');
    expect(normalizeShiftCell('22-6')).toBe('22-6');
    expect(normalizeShiftCell(' Off ')).toBe('off');
    expect(normalizeShiftCell('Nghỉ')).toBe('off');
  });

  it('bat chi vien kem ma CH ke ca khong cach', () => {
    expect(normalizeShiftCell('22-6 VN0497')).toEqual({ shift: '22-6', covering_store: 'VN0497' });
    expect(normalizeShiftCell('10-14VN0485')).toEqual({ shift: '10-14', covering_store: 'VN0485' });
  });

  it('ca kep lay ca dau, ky tu la giu nguyen', () => {
    expect(normalizeShiftCell('14-22/22-6')).toBe('14-22');
    expect(normalizeShiftCell('AL')).toBe('AL');
    expect(normalizeShiftCell('')).toBe('');
  });
});
