import { describe, it, expect, beforeEach } from 'vitest';
import {
  isOtpEnabled, hasTrustedDeviceLocal, saveDeviceToken, getDeviceToken,
  checkDeviceTrusted, requestAdminOtp,
} from '../lib/adminOtp';

// Shim localStorage cho môi trường node
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

describe('adminOtp (client lib)', () => {
  beforeEach(() => store.clear());

  it('2FA tắt khi chưa cấu hình VITE_ADMIN_OTP_URL', () => {
    expect(isOtpEnabled()).toBe(false);
  });

  it('checkDeviceTrusted trả true ngay khi 2FA tắt (không chặn đăng nhập)', async () => {
    await expect(checkDeviceTrusted()).resolves.toBe(true);
  });

  it('lưu/đọc device token theo thiết bị', () => {
    expect(hasTrustedDeviceLocal()).toBe(false);
    saveDeviceToken('tok-abc-123');
    expect(getDeviceToken()).toBe('tok-abc-123');
    expect(hasTrustedDeviceLocal()).toBe(true);
  });

  it('request khi 2FA tắt trả not-configured thay vì lỗi mạng', async () => {
    const r = await requestAdminOtp();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('not-configured');
  });
});
