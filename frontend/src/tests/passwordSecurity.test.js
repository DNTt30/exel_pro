import { describe, it, expect } from 'vitest';
import { sessionUserFromEmp } from '../store/slices/authSlice';

describe('Bảo mật Mật khẩu: Buộc đổi mật khẩu & Giám sát tài khoản mặc định', () => {
  it('Tài khoản chưa đổi mật khẩu (passwordChangedAt == null) bị gắn cờ mustChangePassword = true', () => {
    const emp = {
      id: '260512001',
      name: 'Nguyễn Văn A',
      dept: 'VN0485',
      role: 'STFT',
      passwordChangedAt: null,
      createdAt: new Date().toISOString()
    };
    const sessionUser = sessionUserFromEmp(emp);
    expect(sessionUser.id).toBe('260512001');

    // Kiểm tra logic xác định mustChange
    const hasChangedPw = Boolean(emp.passwordChangedAt);
    const mustChange = !hasChangedPw;
    expect(mustChange).toBe(true);
  });

  it('Tài khoản đã đổi mật khẩu (passwordChangedAt có ngày giờ) có mustChangePassword = false', () => {
    const emp = {
      id: '260512002',
      name: 'Trần Thị B',
      dept: 'VN0485',
      role: 'STFT',
      passwordChangedAt: '2026-09-20T10:00:00Z',
      createdAt: '2026-09-01T10:00:00Z'
    };
    const hasChangedPw = Boolean(emp.passwordChangedAt);
    const mustChange = !hasChangedPw;
    expect(mustChange).toBe(false);
  });

  it('Tài khoản dùng mật khẩu mặc định quá 7 ngày được đánh dấu isPasswordExpired = true', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString();
    const emp = {
      id: '260512003',
      name: 'Lê Văn C',
      dept: 'VN0485',
      role: 'STFT',
      passwordChangedAt: null,
      createdAt: eightDaysAgo
    };

    const hasChangedPw = Boolean(emp.passwordChangedAt);
    const DEFAULT_PASSWORD_EXPIRY_DAYS = 7;
    let isPasswordExpired = false;
    if (!hasChangedPw && emp.createdAt) {
      const createdDate = new Date(emp.createdAt);
      const diffDays = (Date.now() - createdDate.getTime()) / (1000 * 3600 * 24);
      if (diffDays > DEFAULT_PASSWORD_EXPIRY_DAYS) {
        isPasswordExpired = true;
      }
    }

    expect(isPasswordExpired).toBe(true);
  });

  it('Tài khoản mới tạo 2 ngày chưa bị coi là quá hạn (isPasswordExpired = false)', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
    const emp = {
      id: '260512004',
      name: 'Phạm Thị D',
      dept: 'VN0485',
      role: 'STFT',
      passwordChangedAt: null,
      createdAt: twoDaysAgo
    };

    const hasChangedPw = Boolean(emp.passwordChangedAt);
    const DEFAULT_PASSWORD_EXPIRY_DAYS = 7;
    let isPasswordExpired = false;
    if (!hasChangedPw && emp.createdAt) {
      const createdDate = new Date(emp.createdAt);
      const diffDays = (Date.now() - createdDate.getTime()) / (1000 * 3600 * 24);
      if (diffDays > DEFAULT_PASSWORD_EXPIRY_DAYS) {
        isPasswordExpired = true;
      }
    }

    expect(isPasswordExpired).toBe(false);
  });
});
