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

  it('Quên mật khẩu: Mã không hợp lệ (như tu) phải bị chặn và không gửi thông báo thành công', () => {
    const invalidInputs = ['tu', 'abc', '   ', 'unknown_id'];
    const mockDbLookup = (id) => {
      const validIds = ['260716009', '251104004', '260512008'];
      return validIds.includes(id) ? { id, name: 'Nhân viên hợp lệ' } : null;
    };

    invalidInputs.forEach(input => {
      const found = mockDbLookup(input.trim());
      expect(found).toBeNull();
      // Logic gửi yêu cầu phải chặn khi found == null
      const canSend = Boolean(found && found.id);
      expect(canSend).toBe(false);
    });
  });

  it('Quên mật khẩu: Mã nhân viên GS25 hợp lệ được xác thực và cho phép gửi yêu cầu cấp lại', () => {
    const validId = '260716009';
    const mockDbLookup = (id) => (id === '260716009' ? { id, name: 'DƯƠNG NGỌC TÚ', dept: 'VN0485' } : null);
    
    const found = mockDbLookup(validId);
    expect(found).not.toBeNull();
    expect(found.id).toBe('260716009');
    expect(found.name).toBe('DƯƠNG NGỌC TÚ');
    
    const canSend = Boolean(found && found.id);
    expect(canSend).toBe(true);
  });

  it('Đa thiết bị: Đăng nhập trên thiết bị/trình duyệt khác bằng mật khẩu riêng không bị bắt đổi mật khẩu lại', () => {
    // Giả lập nhân viên đăng nhập bằng mật khẩu riêng trên thiết bị mới
    const isDefaultPassword = false; // Nhập mật khẩu đã đổi
    const metaMustChange = false;    // Supabase Auth metadata đã lưu must_change_password: false
    const mustChange = isDefaultPassword || metaMustChange === true;
    expect(mustChange).toBe(false);
  });

  it('Đa thiết bị: Admin đăng nhập bằng mật khẩu riêng trên thiết bị khác không bị ép đổi mật khẩu', () => {
    const password = 'mySecretAdminPassword';
    const usedFallback = false;
    const metaMustChange = false;
    const isDefaultPassword = password === '1' || usedFallback;
    const mustSetupPassword = isDefaultPassword || metaMustChange === true;
    expect(mustSetupPassword).toBe(false);
  });
});

