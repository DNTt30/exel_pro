import { describe, it, expect } from 'vitest';
import { buildOFCReportCSV } from '../utils/exportOFC';

describe('buildOFCReportCSV', () => {
  const base = {
    list: [{
      dept: 'VN0485',
      id: '260716009',
      attendanceCode: 'ATT01',
      role: 'STPT',
      name: 'NGUYỄN VĂN A',
      shiftsMap: { T2: '6-14', T3: 'off' },
      activeTotalHours: 23
    }],
    dayKeys: ['T2', 'T3'],
    dateHeaders: '11/08,12/08'
  };

  it('dòng đầu là header đủ cột, có BOM UTF-8 ở đầu file', () => {
    const csv = buildOFCReportCSV(base);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    // Dòng đầu gồm BOM + header
    expect(csv.slice(1).split('\n')[0]).toBe('STT,Cửa Hàng,Mã nhân Viên,Mã Điểm Danh,Vị Trí,Họ và Tên,11/08,12/08,Tổng giờ làm');
  });

  it('dòng dữ liệu map đúng thứ tự ca', () => {
    expect(buildOFCReportCSV(base).split('\n')[1])
      .toBe('1,VN0485,260716009,ATT01,STPT,"NGUYỄN VĂN A",6-14,off,23');
  });

  it('thiếu ca xuất chuỗi rỗng; tên có dấu phẩy được bọc ngoặc kép', () => {
    const csv = buildOFCReportCSV({
      ...base,
      list: [{ dept: 'VN0500', id: '1', name: 'A,B', shiftsMap: {}, activeTotalHours: 0 }]
    });
    expect(csv.split('\n')[1]).toBe('1,VN0500,1,,,"A,B",,,0');
  });
});
