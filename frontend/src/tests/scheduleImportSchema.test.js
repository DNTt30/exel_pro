import { describe, it, expect } from 'vitest';
import { validateImportRows } from '../utils/scheduleImportSchema';

const ctx = {
  existingIds: new Set(['111111111']),
  storeIds: new Set(['VN0485', 'VN0497']),
  existingShiftsById: { '111111111': { T2: '6-14' } },
};

describe('excel import pipeline validation', () => {
  it('dòng hợp lệ đi vào valid', () => {
    const r = validateImportRows([
      { id: '222222222', name: 'Nguyen Van B', dept: 'VN0485', shifts: { T2: '6-14', T3: 'off' } },
    ], ctx);
    expect(r.errors).toHaveLength(0);
    expect(r.valid).toHaveLength(1);
  });

  it('ERROR: mã NV sai định dạng (8 số)', () => {
    const r = validateImportRows([{ id: '12345678', name: 'A B', dept: 'VN0485', shifts: { T2: '6-14' } }], ctx);
    expect(r.errors[0].code).toBe('INVALID_ID_FORMAT');
    expect(r.valid).toHaveLength(0);
  });

  it('ERROR: cửa hàng lạ', () => {
    const r = validateImportRows([{ id: '222222222', name: 'A B', dept: 'VN9999', shifts: { T2: '6-14' } }], ctx);
    expect(r.errors[0].code).toBe('UNKNOWN_STORE');
  });

  it('ERROR: không có ca nào', () => {
    const r = validateImportRows([{ id: '222222222', name: 'A B', dept: 'VN0485', shifts: {} }], ctx);
    expect(r.errors[0].code).toBe('NO_SHIFTS');
  });

  it('WARNING: nhân viên mới + ghi đè lịch cũ', () => {
    const r = validateImportRows([
      { id: '333333333', name: 'C D', dept: 'VN0497', shifts: { T3: '14-22' } },
      { id: '111111111', name: 'E F', dept: 'VN0485', shifts: { T4: 'off' } },
    ], ctx);
    expect(r.valid).toHaveLength(2);
    const codes = r.warnings.map(w => w.code);
    expect(codes).toContain('NEW_EMPLOYEE');
    expect(codes).toContain('OVERWRITE_EXISTING');
  });
});
