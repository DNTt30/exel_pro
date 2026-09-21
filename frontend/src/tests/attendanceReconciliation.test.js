import { describe, it, expect, vi } from 'vitest';

// Giả lập hàm sẽ được thêm vào
import { calculatePunchHours } from '../utils/ezhrAttendanceParser';
import { createScheduleSlice } from '../store/slices/scheduleSlice';

describe('Đối soát ca qua đêm (Night Shift Reconciliation)', () => {
  it('Ca 22:00 -> 06:00 hôm sau: Tính đúng 480 phút, không ra số âm', () => {
    const result = calculatePunchHours('2026-09-21T22:00:00', '2026-09-22T06:00:00');
    expect(result.minutes).toBe(480);
    expect(result.hours).toBe(8);
  });

  it('Vào 22:15 -> ra 06:00 hôm sau: Ghi nhận 465 phút; chênh lệch -15 phút', () => {
    // schedule = 480 mins (8 hours)
    const result = calculatePunchHours('2026-09-21T22:15:00', '2026-09-22T06:00:00', 8);
    expect(result.minutes).toBe(465);
    expect(result.hours).toBe(7.75);
    expect(result.diffMinutes).toBe(-15);
  });

  it('Thiếu giờ ra: Trả trạng thái thiếu dữ liệu; không mặc định bằng 0', () => {
    const result = calculatePunchHours('2026-09-21T22:00:00', null);
    expect(result.missingPunch).toBe(true);
    expect(result.minutes).toBeUndefined();
    expect(result.status).toBe('MISSING_OUT');
  });

  it('Ca qua cuối tháng: 30/09 -> 01/10: Tính đúng thời lượng theo ngày giờ đầy đủ', () => {
    const result = calculatePunchHours('2026-09-30T22:00:00', '2026-10-01T06:00:00');
    expect(result.minutes).toBe(480);
  });

  it('Vào 06:00 -> ra 14:00 (ca ngày bình thường)', () => {
    const result = calculatePunchHours('2026-09-21T06:00:00', '2026-09-21T14:00:00');
    expect(result.minutes).toBe(480);
  });
});

const mockSet = vi.fn();
const mockGet = vi.fn();

describe('Đối soát chấm công: Chống nhân đôi giờ công (P1 Requirement)', () => {
  it('Nhập lại cùng bản ghi Excel: Không cộng giờ lần hai', async () => {
    // Setup state
    let state = { attendance: {} };
    mockSet.mockImplementation((update) => {
      state = { ...state, ...update };
    });
    mockGet.mockReturnValue({
      attendance: state.attendance,
      appendAdminLog: vi.fn().mockResolvedValue(),
    });

    const slice = createScheduleSlice(mockSet, mockGet);
    
    // Mock the API upsert to just succeed
    vi.mock('../services/api', () => ({
      upsertAttendanceRows: vi.fn().mockResolvedValue(true)
    }));

    const records = [
      { empId: 'NV001', workDate: '2026-09-21', actualHours: 8, note: '' }
    ];

    // Lần nhập thứ nhất
    await slice.applyBulkAttendance(records, 'ADMIN1');
    const key = 'NV001|2026-09-21';
    expect(state.attendance[key].actualHours).toBe(8);

    // Lần nhập thứ hai với cùng dữ liệu
    await slice.applyBulkAttendance(records, 'ADMIN1');
    // Nó vẫn phải là 8, không phải 16!
    expect(state.attendance[key].actualHours).toBe(8);
  });
});
