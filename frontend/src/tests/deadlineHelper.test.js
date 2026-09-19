import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_DEADLINE_CONFIG,
  calculateWeekDeadline,
  extendDeadlineHours,
  getStoreDeadlineConfig,
  saveStoreDeadlineConfig,
  formatFriendlyDeadline
} from '../utils/deadlineHelper';

// Shim localStorage cho môi trường test node
let mockStorage = {};
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (k) => mockStorage[k] ?? null,
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; },
    clear: () => { mockStorage = {}; }
  };
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    dispatchEvent: () => true,
    CustomEvent: class {}
  };
}

describe('deadlineHelper', () => {
  beforeEach(() => {
    mockStorage = {};
    if (globalThis.localStorage?.clear) {
      globalThis.localStorage.clear();
    }
  });

  describe('calculateWeekDeadline', () => {
    const mondayStr = '2026-09-21'; // Thứ 2, 21/09/2026

    it('tính đúng hạn chót mặc định: Thứ 5 tuần trước lúc 18:00 (17/09/2026)', () => {
      // Giả lập hiện tại là sáng Thứ 4: 16/09/2026 10:00
      const mockNow = new Date(2026, 8, 16, 10, 0, 0); // Month 8 is September
      const result = calculateWeekDeadline(mondayStr, DEFAULT_DEADLINE_CONFIG, mockNow);

      expect(result.enabled).toBe(true);
      expect(result.isExpired).toBe(false);
      expect(result.isNearDeadline).toBe(false);
      expect(result.status).toBe('open');
      expect(result.deadlineDate.getFullYear()).toBe(2026);
      expect(result.deadlineDate.getMonth()).toBe(8);
      expect(result.deadlineDate.getDate()).toBe(17);
      expect(result.deadlineDate.getHours()).toBe(18);
      expect(result.deadlineDate.getMinutes()).toBe(0);
      expect(result.formattedDeadline).toContain('18:00');
      expect(result.formattedDeadline).toContain('Thứ Năm');
      expect(result.formattedDeadline).toContain('17/09/2026');
    });

    it('phát hiện trạng thái cảnh báo sắp hết hạn khi còn dưới 24h', () => {
      // Giả lập trưa Thứ 5: 17/09/2026 12:00 (còn 6 tiếng)
      const mockNow = new Date(2026, 8, 17, 12, 0, 0);
      const result = calculateWeekDeadline(mondayStr, DEFAULT_DEADLINE_CONFIG, mockNow);

      expect(result.isExpired).toBe(false);
      expect(result.isNearDeadline).toBe(true);
      expect(result.status).toBe('warning');
      expect(result.remainingText).toContain('Còn 6 giờ');
    });

    it('phát hiện trạng thái đã hết hạn khi qua giờ chót', () => {
      // Giả lập tối Thứ 5: 17/09/2026 19:30 (quá hạn 1h30m)
      const mockNow = new Date(2026, 8, 17, 19, 30, 0);
      const result = calculateWeekDeadline(mondayStr, DEFAULT_DEADLINE_CONFIG, mockNow);

      expect(result.isExpired).toBe(true);
      expect(result.status).toBe('expired');
      expect(result.remainingText).toContain('Đã hết hạn 1 giờ trước');
    });

    it('hỗ trợ cấu hình ngày khác (VD: Thứ Sáu 12:00)', () => {
      const config = {
        enabled: true,
        dayKey: 'T6',
        time: '12:00'
      };
      // Thứ 6 trước 21/09/2026 là ngày 18/09/2026
      const mockNow = new Date(2026, 8, 17, 10, 0, 0);
      const result = calculateWeekDeadline(mondayStr, config, mockNow);

      expect(result.deadlineDate.getDate()).toBe(18);
      expect(result.deadlineDate.getHours()).toBe(12);
      expect(result.formattedDeadline).toContain('Thứ Sáu');
      expect(result.formattedDeadline).toContain('18/09/2026');
    });

    it('hỗ trợ tắt hạn chót (enabled: false)', () => {
      const config = { enabled: false };
      const mockNow = new Date(2026, 8, 25, 10, 0, 0);
      const result = calculateWeekDeadline(mondayStr, config, mockNow);

      expect(result.enabled).toBe(false);
      expect(result.isExpired).toBe(false);
      expect(result.status).toBe('disabled');
    });

    it('hỗ trợ Quản lý chủ động khóa sớm (isForceClosed: true)', () => {
      const config = { enabled: true, isForceClosed: true };
      const mockNow = new Date(2026, 8, 15, 10, 0, 0);
      const result = calculateWeekDeadline(mondayStr, config, mockNow);

      expect(result.isExpired).toBe(true);
      expect(result.status).toBe('force_closed');
    });

    it('hỗ trợ Quản lý chủ động mở lại đăng ký (isForceOpen: true)', () => {
      const config = { enabled: true, isForceOpen: true };
      const mockNow = new Date(2026, 8, 20, 10, 0, 0);
      const result = calculateWeekDeadline(mondayStr, config, mockNow);

      expect(result.isExpired).toBe(false);
      expect(result.status).toBe('force_open');
    });
  });

  describe('extendDeadlineHours', () => {
    it('gia hạn thêm 24 giờ chính xác', () => {
      const mondayStr = '2026-09-21';
      const mockNow = new Date(2026, 8, 17, 19, 0, 0); // Đã qua hạn 1h
      const initial = calculateWeekDeadline(mondayStr, DEFAULT_DEADLINE_CONFIG, mockNow);
      expect(initial.isExpired).toBe(true);

      // Gia hạn thêm 24h
      const extendedConfig = extendDeadlineHours(initial, 24);
      expect(extendedConfig.customDeadline).toBeTruthy();

      // Kiểm tra lại trạng thái sau khi gia hạn
      const reevaluated = calculateWeekDeadline(mondayStr, extendedConfig, mockNow);
      expect(reevaluated.isExpired).toBe(false);
      expect(reevaluated.deadlineDate.getDate()).toBe(18); // Từ 17 nhảy sang 18
      expect(reevaluated.deadlineDate.getHours()).toBe(18);
    });
  });

  describe('Store Config Persistence & Fallback', () => {
    const storeId = 'VN0485';
    const weekDate = '2026-09-21';

    it('trả về mặc định khi chưa có cấu hình', () => {
      const cfg = getStoreDeadlineConfig(storeId, weekDate, []);
      expect(cfg.enabled).toBe(true);
      expect(cfg.dayKey).toBe('T5');
      expect(cfg.time).toBe('18:00');
    });

    it('lấy cấu hình từ store object trong Zustand', () => {
      const mockStores = [
        {
          id: storeId,
          name: 'GS25 Landmark',
          registration_deadline: { enabled: true, dayKey: 'T6', time: '20:00' }
        }
      ];
      const cfg = getStoreDeadlineConfig(storeId, weekDate, mockStores);
      expect(cfg.dayKey).toBe('T6');
      expect(cfg.time).toBe('20:00');
    });

    it('lưu và đọc cấu hình riêng cho tuần (week override)', async () => {
      const weekSpecificConfig = { enabled: true, dayKey: 'T7', time: '22:00' };
      await saveStoreDeadlineConfig({
        storeId,
        weekDate,
        config: weekSpecificConfig,
        applyToAllWeeks: false
      });

      const cfg = getStoreDeadlineConfig(storeId, weekDate, []);
      expect(cfg.dayKey).toBe('T7');
      expect(cfg.time).toBe('22:00');

      // Tuần khác không bị ảnh hưởng
      const otherWeekCfg = getStoreDeadlineConfig(storeId, '2026-09-28', []);
      expect(otherWeekCfg.dayKey).toBe('T5');
    });

    it('lưu cấu hình chung cho toàn cửa hàng và gọi updateStore nếu có', async () => {
      let updatedStorePayload = null;
      const mockUpdateStore = async (id, payload) => {
        updatedStorePayload = payload;
      };

      const allWeeksConfig = { enabled: true, dayKey: 'T4', time: '17:00' };
      await saveStoreDeadlineConfig({
        storeId,
        weekDate,
        config: allWeeksConfig,
        applyToAllWeeks: true,
        updateStore: mockUpdateStore
      });

      expect(updatedStorePayload).toEqual({
        registration_deadline: expect.objectContaining({ dayKey: 'T4', time: '17:00' })
      });

      const cfg = getStoreDeadlineConfig(storeId, '2026-10-05', []);
      expect(cfg.dayKey).toBe('T4');
      expect(cfg.time).toBe('17:00');
    });
  });

  describe('formatFriendlyDeadline', () => {
    it('định dạng đúng ngày giờ tiếng Việt', () => {
      const d = new Date(2026, 8, 17, 18, 0, 0);
      const str = formatFriendlyDeadline(d);
      expect(str).toBe('18:00 Thứ Năm, 17/09/2026');
    });
  });
});
