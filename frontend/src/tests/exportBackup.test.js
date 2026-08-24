import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildBackupWorkbook } from '../utils/exportBackup';

const fakeState = {
  employees: [
    { id: '260716001', name: 'Nguyễn A', dept: 'VN0485', type: 'STPT', role: 'STPT', maxH: 23, isActive: true },
    { id: '260716002', name: 'Trần B', dept: 'VN0485', type: 'STFT', role: '', maxH: 48, isActive: false }
  ],
  schedule: {
    '2026-06-08': {
      260716001: { T2: '6-14', T3: { shift: '14-22', covering_store: 'VN0499' }, CN: 'off' },
      260716002: {}
    }
  },
  feedbacks: [{ id: 'fb1', empId: '260716001', status: 'pending' }],
  shiftSwaps: [], shelves: [{ id: 'k1' }], shelfItems: [],
  stores: [{ id: 'VN0485' }],
  scheduleWeeks: { 'VN0485|2026-06-08': { status: 'approved' } }
};

describe('exportBackup', () => {
  it('tao du cac sheet chuan', () => {
    const wb = buildBackupWorkbook(fakeState);
    ['Nhan vien', 'Lich', 'Feedbacks', 'Doi ca', 'Ke hang', 'Mon trong ke', 'Cua hang']
      .forEach(n => expect(wb.SheetNames).toContain(n));
  });

  it('sheet Lich giu dung ca + chi viet + trang thai nghi', () => {
    const wb = buildBackupWorkbook(fakeState);
    const arr = XLSX.utils.sheet_to_json(wb.Sheets['Lich'], { header: 1 });
    const r1 = arr[1];
    expect(r1[0]).toBe('2026-06-08');
    expect(r1[3]).toBe('6-14');        // T2: ca thuong
    expect(r1[4]).toBe('14-22 (VN0499)'); // T3: chi vien co ma CH
    expect(r1[9]).toBe('Nghỉ');         // CN: off
  });
});
