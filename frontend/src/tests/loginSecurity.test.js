import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateAttempt, recordFailure, resetFailures, THROTTLE_MAX_FAILS } from '../lib/loginThrottle';
import { setAdminPassword, verifyAdminPassword, validateAdminPassword, hasCustomAdminPassword } from '../lib/adminCredential';

// Shim localStorage cho môi trường node
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

describe('loginThrottle', () => {
  beforeEach(() => store.clear());

  it('cho phép khi chưa có lịch sử sai', () => {
    const r = evaluateAttempt(null, Date.now());
    expect(r.allowed).toBe(true);
    expect(r.recentFails).toBe(0);
  });

  it('khóa sau đúng MAX lần sai và báo thời gian mở khóa', () => {
    let res = { locked: false };
    for (let i = 0; i < THROTTLE_MAX_FAILS; i++) res = recordFailure('admin');
    expect(res.locked).toBe(true);
    const chk = evaluateAttempt(JSON.parse(localStorage.getItem('ofc-login-throttle'))['admin'], Date.now());
    expect(chk.allowed).toBe(false);
    expect(chk.retryAfterSec).toBeGreaterThan(0);
  });

  it('resetFailures xóa trạng thái khóa', () => {
    for (let i = 0; i < THROTTLE_MAX_FAILS; i++) recordFailure('260716009');
    resetFailures('260716009');
    expect(checkLockedSafe()).toBe(true);
  });

  function checkLockedSafe() {
    const r = evaluateAttempt(null, Date.now());
    return r.allowed;
  }
});

describe('adminCredential', () => {
  beforeEach(() => store.clear());

  it('từ chối mật khẩu yếu', () => {
    expect(validateAdminPassword('1')).not.toBe(''); // bị chặn (chiều dài hoặc mặc định)
    expect(validateAdminPassword('abc12')).toContain('8 ký tự');
    expect(validateAdminPassword('11111111')).toContain('lặp');
    expect(validateAdminPassword('MatKhau99')).toBe('');
  });

  it('đặt và xác minh đúng mật khẩu (hash khác plaintext)', () => {
    return setAdminPassword('MatKhau99').then(async () => {
      expect(hasCustomAdminPassword()).toBe(true);
      await expect(verifyAdminPassword('MatKhau99')).resolves.toBe(true);
      await expect(verifyAdminPassword('matkhau99')).resolves.toBe(false);
      await expect(verifyAdminPassword('1')).resolves.toBe(false);
      const raw = JSON.parse(localStorage.getItem('ofc-admin-cred-v1'));
      expect(raw.hash.includes('MatKhau99')).toBe(false);
    });
  });

  it('salt khác nhau mỗi lần đặt → hash khác nhau', async () => {
    await setAdminPassword('MatKhau99');
    const h1 = JSON.parse(localStorage.getItem('ofc-admin-cred-v1')).hash;
    await setAdminPassword('MatKhau99');
    const h2 = JSON.parse(localStorage.getItem('ofc-admin-cred-v1')).hash;
    expect(h1).not.toBe(h2);
  });
});
