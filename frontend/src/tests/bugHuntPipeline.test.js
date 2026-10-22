// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const autoTableMock = vi.fn();
const saveMock = vi.fn();

vi.mock('jspdf', () => {
  return {
    default: class MockJsPDF {
      setFontSize() {}
      text() {}
      autoTable(opts) {
        autoTableMock(opts);
      }
      save(name) {
        saveMock(name);
      }
    }
  };
});
vi.mock('jspdf-autotable', () => ({}));

import { exportScheduleToPDF } from '../utils/pdfExport';
import { exportScheduleToExcel, exportTimesheetToExcel } from '../utils/excelExport';
import { buildPayrollAOA } from '../utils/exportPayroll';
import { shiftCellText, buildOFCReportCSV } from '../utils/exportOFC';
import { parseShiftTimeRange, checkEmployeeShiftRestGap } from '../utils/shiftHelper';

describe('3-Agent Bug Hunt Pipeline (Bug Hunter -> QA Tester -> Dev Fixer)', () => {
  beforeEach(() => {
    autoTableMock.mockClear();
    saveMock.mockClear();
  });

  it('[BUG-01] pdfExport normalizes object cells, excludes unconfirmed (:reg) shifts, and scopes borrowed employees properly', () => {
    const employees = [
      { id: 'NV01', name: 'An', dept: 'VN0485' },
      { id: 'NV02', name: 'Bình', dept: 'VN0999', isBorrowedTo: 'VN0485' }
    ];
    const scheduleMap = {
      NV01: {
        T2: { shift: '6-14', covering_store: 'VN0999', confirmed: true },
        T3: { shift: '14-22', confirmed: false, registered: true },
        T4: '22-6:reg',
        T5: '14-22'
      },
      NV02: {
        T2: '6-14', // Ca làm tại cửa hàng gốc VN0999 — không được lộ sang bảng VN0485
        T3: { shift: '14-22', covering_store: 'VN0485', confirmed: true }
      }
    };

    exportScheduleToPDF('2026-10-19', employees, scheduleMap, 'VN0485');
    expect(autoTableMock).toHaveBeenCalledTimes(1);
    const { body } = autoTableMock.mock.calls[0][0];

    // Dòng NV01 (CH gốc VN0485):
    // T2: đi chi viện VN0999 -> chuỗi '6-14 VN0999' (không phải raw object)
    // T3, T4: chưa chốt -> 'OFF'
    // T5: '14-22'
    expect(typeof body[0][2]).toBe('string');
    expect(body[0][2]).toBe('6-14 VN0999');
    expect(body[0][3]).toBe('OFF');
    expect(body[0][4]).toBe('OFF');
    expect(body[0][5]).toBe('14-22');

    // Dòng NV02 (nhân sự chi viện đến VN0485):
    // T2 (làm ở CH gốc VN0999) -> phải là 'OFF' trên bảng VN0485
    // T3 (chi viện tại VN0485) -> '14-22'
    expect(body[1][2]).toBe('OFF');
    expect(body[1][3]).toBe('14-22');
  });

  it('[BUG-02] exportScheduleToExcel excludes unconfirmed shifts and hides home-store shifts on borrowed rows', () => {
    const capturedBlobs = [];
    const OrigBlob = globalThis.Blob;
    globalThis.Blob = class MockBlob {
      constructor(parts, opts) {
        capturedBlobs.push(parts.join(''));
        return new OrigBlob(parts, opts);
      }
    };
    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:test');

    try {
      const groupedEmps = {
        VN0485: [
          { id: 'NV01', name: 'An', dept: 'VN0485', type: 'STPT' },
          { id: 'NV02', name: 'Bình', dept: 'VN0999', type: 'STPT', isBorrowedTo: 'VN0485' }
        ]
      };
      const weekSchedule = {
        NV01: {
          T2: { shift: '6-14', confirmed: false, registered: true },
          T3: '14-22:reg'
        },
        NV02: {
          T2: '6-14', // Ca tại CH gốc VN0999
          T3: { shift: '22-6', covering_store: 'VN0485', confirmed: true }
        }
      };

      exportScheduleToExcel({
        currentWeek: '2026-10-19',
        deptName: 'VN0485',
        groupedEmps,
        weekSchedule,
        userName: 'OFC'
      });

      const html = capturedBlobs[0] || '';
      // NV01 chỉ có ca đăng ký chưa chốt -> không được xuất '6-14' hay '14-22'
      expect(html).not.toContain('>6-14<');
      expect(html).not.toContain('>14-22<');
      // NV02 chỉ chi viện ca 22-6 vào T3
      expect(html).toContain('>22-6<');
    } finally {
      globalThis.Blob = OrigBlob;
      URL.createObjectURL = origCreateObjectURL;
    }
  });

  it('[BUG-03] buildPayrollAOA and exportTimesheetToExcel calculate shift hours accurately instead of parseFloat("22-6") === 22', () => {
    const cycleDates = [
      { key: '2026-10-19', dayKey: 'T2', fullDateStr: '2026-10-19', shortDisplay: '19/10' },
      { key: '2026-10-20', dayKey: 'T3', fullDateStr: '2026-10-20', shortDisplay: '20/10' },
      { key: '2026-10-21', dayKey: 'T4', fullDateStr: '2026-10-21', shortDisplay: '21/10' }
    ];
    const groupedEmps = {
      VN0485: [{ id: 'NV01', name: 'An', dept: 'VN0485', type: 'STPT', role: 'STPT' }]
    };

    const { aoa } = buildPayrollAOA({
      payrollCycle: { month: 10, year: 2026 },
      cycleDates,
      groupedEmps,
      filterOnlyMe: false,
      currentUserId: 'ADMIN',
      getDayValue: (_empId, day) => {
        if (day === '2026-10-19') return '22-6'; // 8h (không phải 22h!)
        if (day === '2026-10-20') return '14-22'; // 8h (không phải 14h!)
        if (day === '2026-10-21') return { shift: '6-14', confirmed: false, registered: true }; // chưa chốt -> '' (0h)
        return '';
      },
      getActualValue: () => ''
    });

    const empRow = aoa[4];
    // Cột 7, 8, 9 là 3 ngày trong cycleDates
    expect(empRow[7]).toBe(8);
    expect(empRow[8]).toBe(8);
    expect(empRow[9]).toBe('');
    // Working day = 2, Công cho PT = 16h (không phải 22 + 14 = 36h!)
    expect(empRow[10]).toBe(2);
    expect(empRow[11]).toBe(16);

    // Kiểm tra thêm exportTimesheetToExcel
    const capturedBlobs = [];
    const OrigBlob = globalThis.Blob;
    globalThis.Blob = class MockBlob {
      constructor(parts, opts) {
        capturedBlobs.push(parts.join(''));
        return new OrigBlob(parts, opts);
      }
    };
    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:test');

    try {
      exportTimesheetToExcel({
        currentWeek: '2026-10-19',
        deptName: 'VN0485',
        groupedEmps,
        getDayValue: (_id, day) => (day === '2026-10-19' ? '22-6' : day === '2026-10-20' ? '14-22' : ''),
        activeDays: ['2026-10-19', '2026-10-20'],
        filterOnlyMe: false,
        currentUserId: 'ADMIN',
        cycleDates
      });
      const html = capturedBlobs[0] || '';
      expect(html).toContain('>16h<');
      expect(html).not.toContain('>36h<');
    } finally {
      globalThis.Blob = OrigBlob;
      URL.createObjectURL = origCreateObjectURL;
    }
  });

  it('[BUG-04] exportOFC ignores unconfirmed shifts and formats object shifts in CSV without [object Object]', () => {
    expect(shiftCellText({ shift: '6-14', confirmed: false, registered: true })).toBe('');
    expect(shiftCellText('6-14:reg')).toBe('');
    expect(shiftCellText('off')).toBe('off');
    expect(shiftCellText({ shift: '6-14', covering_store: 'VN0999', confirmed: true })).toBe('6-14 (VN0999)');

    const csv = buildOFCReportCSV({
      list: [
        {
          id: 'NV01',
          name: 'An',
          dept: 'VN0485',
          role: 'STPT',
          activeTotalHours: 8,
          shiftsMap: {
            T2: { shift: '6-14', covering_store: 'VN0999', confirmed: true },
            T3: { shift: '14-22', confirmed: false, registered: true }
          }
        }
      ],
      dayKeys: ['T2', 'T3'],
      dateHeaders: 'T2,T3'
    });

    expect(csv).not.toContain('[object Object]');
    expect(csv).toContain('6-14 (VN0999),,8');
  });

  it('[BUG-05] parseShiftTimeRange supports double shifts ("6-14/14-22") and checkEmployeeShiftRestGap detects short rest after double shift', () => {
    expect(parseShiftTimeRange('6-14/14-22')).toEqual({ start: 6, end: 22 });
    expect(parseShiftTimeRange('14-22/22-6')).toEqual({ start: 14, end: 30 });

    const gapResult = checkEmployeeShiftRestGap(
      { NV01: { T2: '6-14/14-22', T3: '6-14' } },
      'NV01',
      'T3',
      '6-14'
    );
    expect(gapResult.hasRestWarning).toBe(true);
    expect(gapResult.restHours).toBe(8);
  });
});
