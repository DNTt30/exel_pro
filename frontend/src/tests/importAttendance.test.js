import { describe, it, expect } from 'vitest';
import { normalizeAttendanceValue, parseEzHRAttendance } from '../utils/ezhrAttendanceParser';

describe('ezhrAttendanceParser — Chuẩn hóa giá trị chấm công', () => {
  it('nhận diện số lẻ có dấu phẩy và dấu chấm từ ezHR9', () => {
    expect(normalizeAttendanceValue('7,84')).toEqual({ hours: 7.84, note: '' });
    expect(normalizeAttendanceValue('7.84')).toEqual({ hours: 7.84, note: '' });
    expect(normalizeAttendanceValue('8,25h')).toEqual({ hours: 8.25, note: '' });
    expect(normalizeAttendanceValue('4.5H')).toEqual({ hours: 4.5, note: '' });
    expect(normalizeAttendanceValue(8)).toEqual({ hours: 8, note: '' });
  });

  it('nhận diện chấm 0h và nghỉ OFF', () => {
    expect(normalizeAttendanceValue('0')).toEqual({ hours: 0, note: '' });
    expect(normalizeAttendanceValue('0h')).toEqual({ hours: 0, note: '' });
    expect(normalizeAttendanceValue('OFF')).toEqual({ hours: 0, note: 'OFF' });
    expect(normalizeAttendanceValue('off')).toEqual({ hours: 0, note: 'OFF' });
  });

  it('nhận diện mã phép chữ AL, PL, UL...', () => {
    expect(normalizeAttendanceValue('AL')).toEqual({ hours: null, note: 'AL' });
    expect(normalizeAttendanceValue('PL')).toEqual({ hours: null, note: 'PL' });
    expect(normalizeAttendanceValue('UL')).toEqual({ hours: null, note: 'UL' });
  });

  it('bỏ qua ô trống hoặc gạch ngang', () => {
    expect(normalizeAttendanceValue('')).toBeNull();
    expect(normalizeAttendanceValue('   ')).toBeNull();
    expect(normalizeAttendanceValue('-')).toBeNull();
    expect(normalizeAttendanceValue(null)).toBeNull();
  });
});

describe('ezhrAttendanceParser — Parse file Excel ezHR9', () => {
  const cycleDates = [
    { key: 'd0', shortDisplay: '26', display: '26/08', dayKey: 'T4', fullDateStr: '2026-08-26', weekKey: '2026-08-24' },
    { key: 'd1', shortDisplay: '27', display: '27/08', dayKey: 'T5', fullDateStr: '2026-08-27', weekKey: '2026-08-24' },
    { key: 'd2', shortDisplay: '28', display: '28/08', dayKey: 'T6', fullDateStr: '2026-08-28', weekKey: '2026-08-24' },
    { key: 'd3', shortDisplay: '29', display: '29/08', dayKey: 'T7', fullDateStr: '2026-08-29', weekKey: '2026-08-24' }
  ];

  const employees = [
    { id: 'NV001', name: 'Nguyễn Văn A', dept: 'VN0485' },
    { id: 'NV002', name: 'Trần Thị B', dept: 'VN0485' }
  ];

  const schedule = {
    '2026-08-24': {
      'NV001': { 'T4': '6-14', 'T5': '6-14', 'T6': 'OFF', 'T7': '6-14' },
      'NV002': { 'T4': '14-22', 'T5': 'OFF', 'T6': '14-22', 'T7': 'OFF' }
    }
  };

  it('parse chuẩn định dạng Ma trận ngang (Matrix)', () => {
    const rows = [
      ['BẢNG CHẤM CÔNG THÁNG EZHR9'],
      ['STT', 'Mã NV', 'Họ và tên', 'Cửa hàng', '26/08', '27/08', '28/08', '29/08'],
      [1, 'NV001', 'Nguyễn Văn A', 'VN0485', '7,84', '8.0', '8', 'OFF'],
      [2, 'NV002', 'Trần Thị B', 'VN0485', '8', '0', 'AL', '']
    ];

    const res = parseEzHRAttendance({ rows, cycleDates, employees, schedule });
    expect(res.success).toBe(true);
    expect(res.format).toBe('MATRIX');
    expect(res.matchedEmployeesCount).toBe(2);

    // NV001 ngày 26: lịch 8h, thực tế 7.84h -> diff = -0.16h (UNDER)
    const rec1 = res.records.find(r => r.empId === 'NV001' && r.workDate === '2026-08-26');
    expect(rec1).toBeDefined();
    expect(rec1.actualHours).toBe(7.84);
    expect(rec1.diff).toBe(-0.16);
    expect(rec1.status).toBe('UNDER');

    // NV001 ngày 28: lịch OFF, thực tế 8h -> OT/Làm ngày nghỉ (OFF_WORK)
    const rec3 = res.records.find(r => r.empId === 'NV001' && r.workDate === '2026-08-28');
    expect(rec3).toBeDefined();
    expect(rec3.actualHours).toBe(8);
    expect(rec3.diff).toBe(8);
    expect(rec3.status).toBe('OFF_WORK');

    // NV002 ngày 28: mã AL -> LEAVE
    const recAL = res.records.find(r => r.empId === 'NV002' && r.workDate === '2026-08-28');
    expect(recAL).toBeDefined();
    expect(recAL.note).toBe('AL');
    expect(recAL.status).toBe('LEAVE');
  });

  it('parse chuẩn định dạng Danh sách dòng (Flat Rows)', () => {
    const rows = [
      ['BÁO CÁO CHI TIẾT ĐIỂM DANH'],
      ['Mã nhân viên', 'Tên nhân viên', 'Ngày làm việc', 'Tổng giờ'],
      ['NV001', 'Nguyễn Văn A', '2026-08-26', '7,84'],
      ['NV001', 'Nguyễn Văn A', '2026-08-27', '8.5'],
      ['NV002', 'Trần Thị B', '26/08', '8']
    ];

    const res = parseEzHRAttendance({ rows, cycleDates, employees, schedule });
    expect(res.success).toBe(true);
    expect(res.format).toBe('FLAT_LIST');
    expect(res.records.length).toBe(3);
  });
});
