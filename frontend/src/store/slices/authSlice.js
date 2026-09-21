import * as api from '../../services/api';
import { ensureAuthSession, signOutAuth, isManagerFromEmp, isAreaManagerFromEmp, isOpsManager, toAuthEmail } from '../../lib/authSession';
import { checkLocked, recordFailure, resetFailures } from '../../lib/loginThrottle';
import { checkDeviceTrusted } from '../../lib/adminOtp';
import { rememberClientIp, clientMeta, redact } from '../../utils/appLogs';
import { notifyTelegram, telegramConfigured } from '../../utils/telegram';
import { supabase } from '../../lib/supabase';
import { verifyAdminPassword } from '../../lib/adminCredential';


export function sessionUserFromEmp(emp) {
  return {
    ...emp,
    id: emp.id,
    role: 'employee',
    jobTitle: emp.jobTitle || emp.role,
    isManager: isManagerFromEmp(emp),
    isAreaManager: isAreaManagerFromEmp(emp)
  };
}

export async function bindAuthSession(user) {
  const result = await ensureAuthSession(user, { allowSignUp: true, password: user.authPassword });
  if (result.ok) {
    try { await api.ensureAppProfile(); } catch (err) { console.warn('[auth] ensureAppProfile failed (non-critical):', err?.message); }
    return null;
  }
  if (result.reason === 'no-client' || result.reason === 'no-user') return null;
  console.warn('Supabase Auth chưa sẵn sàng:', result.reason);
  return result.reason;
}

export const createAuthSlice = (set, get) => ({
  user: null, 
  authWarning: null,
  login: async (userId, password) => {
    rememberClientIp();
    try {
      let nextUser = null;

      if (userId === 'admin') {
        const lock = checkLocked('admin');
        if (!lock.allowed) {
          const mins = Math.max(1, Math.ceil(lock.retryAfterSec / 60));
          throw new Error('Đã thử sai quá nhiều lần. Thử lại sau khoảng ' + mins + ' phút.');
        }

        // Thử 1: Đăng nhập trực tiếp bằng mật khẩu đã lưu trên Supabase Auth
        let pwCheck = await supabase.auth.signInWithPassword({
          email: 'admin@ofc.app',
          password,
        });

        // Thử 2: Nếu thất bại, kiểm tra mật khẩu đã đổi trên thiết bị (localStorage) hoặc mật khẩu mặc định (1)
        let usedFallback = false;
        if (pwCheck.error || !pwCheck.data?.session) {
          const localOk = await verifyAdminPassword(password);
          if (password === '1' || localOk) {
            const fallback = await supabase.auth.signInWithPassword({
              email: 'admin@ofc.app',
              password: 'ofc-admin-1',
            });
            if (fallback.data?.session) {
              pwCheck = fallback;
              usedFallback = true;
              // Nếu người dùng nhập mật khẩu riêng hợp lệ (>= 6 ký tự), tự động đồng bộ lên Supabase
              if (localOk && password && password !== '1' && password.length >= 6) {
                await supabase.auth.updateUser({ password }).catch(() => {});
              }
            }
          }
        }

        if (pwCheck.error || !pwCheck.data?.session) {
          recordFailure('admin');
          console.warn('[auth] Admin signIn lỗi:', redact(pwCheck.error));
          throw new Error('Mật khẩu không chính xác');
        }

        if (!(await checkDeviceTrusted())) {
          const otpErr = new Error('Cần xác thực 2 bước qua Telegram');
          otpErr.code = 'OTP_REQUIRED';
          throw otpErr;
        }

        const mustChange = (usedFallback && password === '1') || pwCheck.data.user?.user_metadata?.must_change_password === true;
        
        nextUser = {
          id: 'admin',
          role: 'admin',
          name: 'Quản trị viên',
          jobTitle: 'Quản trị viên',
          isManager: true,
          mustSetupPassword: mustChange,
          loginAt: Date.now()
        };
      } else {
        let emp = await api.getEmployeeById(userId);
        if (!emp) {
          const emps = await api.getEmployees();
          if (emps.length) set({ employees: emps });
          emp = (emps.length ? emps : get().employees).find(e => e.id === userId);
        }
        if (!emp) throw new Error('Không tìm thấy mã nhân viên');
        if (emp.isActive === false) throw new Error('Mã này đã bị vô hiệu hóa (nghỉ việc). Liên hệ quản lý để mở lại.');
        const empLock = checkLocked(userId);
        if (!empLock.allowed) {
          const mins = Math.max(1, Math.ceil(empLock.retryAfterSec / 60));
          throw new Error('Đã thử sai quá nhiều lần. Thử lại sau khoảng ' + mins + ' phút.');
        }
        const pwCheck = await supabase.auth.signInWithPassword({
          email: toAuthEmail(emp.id),
          password,
        });
        if (pwCheck.error || !pwCheck.data?.session) {
          recordFailure(userId);
          console.warn('[auth] signInWithPassword lỗi:', redact(pwCheck.error));
          throw new Error('Mật khẩu không chính xác');
        }
        
        // Cờ mustChangePassword: buộc đổi mật khẩu nếu password === '1' hoặc chưa có passwordChangedAt hoặc metadata chưa xác nhận đã đổi
        const hasChangedPw = Boolean(emp.passwordChangedAt);
        const isDefaultPassword = password === '1';
        const mustChange = isDefaultPassword || !hasChangedPw || pwCheck.data.user?.user_metadata?.must_change_password !== false;

        // Kiểm tra quá hạn dùng mật khẩu mặc định (mặc định 7 ngày từ khi tạo tài khoản)
        const DEFAULT_PASSWORD_EXPIRY_DAYS = 7;
        let isPasswordExpired = false;
        if (!hasChangedPw && emp.createdAt) {
          const createdDate = new Date(emp.createdAt);
          const diffDays = (Date.now() - createdDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > DEFAULT_PASSWORD_EXPIRY_DAYS) {
            isPasswordExpired = true;
          }
        }

        nextUser = { 
          ...sessionUserFromEmp(emp), 
          mustChangePassword: mustChange, 
          isPasswordExpired,
          passwordChangedAt: emp.passwordChangedAt, 
          loginAt: Date.now() 
        };
      }

      resetFailures(userId);

      set({ user: nextUser, syncStatus: 'loading' });
      const roleLabel = isOpsManager(nextUser) ? (nextUser.isAreaManager ? 'OFC' : 'SM') : 'Nhân viên';
      
      // Ghi log đăng nhập thành công
      get().appendAdminLog('LOGIN_SUCCESS', nextUser.id, roleLabel, {
        category: 'security',
        entityType: 'session',
        entityId: nextUser.id,
        storeId: nextUser.dept || '',
        description: `Đăng nhập thành công · ${nextUser.name || nextUser.id}`
      });

      // Cảnh báo bảo mật nếu đăng nhập bằng mật khẩu mặc định
      if (nextUser.mustChangePassword && nextUser.id !== 'admin') {
        get().appendAdminLog('LOGIN_DEFAULT_PASSWORD', nextUser.id, roleLabel, {
          category: 'security',
          entityType: 'session',
          entityId: nextUser.id,
          storeId: nextUser.dept || '',
          description: `⚠️ [CẢNH BÁO BẢO MẬT] ${nextUser.name} (${nextUser.id}) đăng nhập bằng MẬT KHẨU MẶC ĐỊNH chưa đổi${nextUser.isPasswordExpired ? ' (ĐÃ QUÁ HẠN > 7 NGÀY)' : ''}`
        });
      }

      try {
        if (telegramConfigured()) {
          const when = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
          const extraAlert = nextUser.mustChangePassword ? ' ⚠️ (Dùng MK mặc định)' : '';
          notifyTelegram('🔑 ' + (nextUser.name || nextUser.id) + ' (' + nextUser.id + ') đăng nhập · ' + roleLabel + extraAlert + ' · ' + when)
            .catch((err) => { console.warn('[auth] Telegram notify failed:', err?.message); });
        }
      } catch (err) { console.warn('[auth] Telegram setup error:', err?.message); }
      bindAuthSession(nextUser).then((authWarning) => {
        if (get().user?.id === nextUser.id && authWarning !== get().authWarning) {
          set({ authWarning });
        }
      }).catch(() => {});
      return nextUser;
    } catch (err) {
      const meta = clientMeta();
      const lock = checkLocked(userId);
      const isSuspicious = !lock.allowed || (lock.retryAfterSec && lock.retryAfterSec > 0);
      api.addActivityLog({
        userId: String(userId || ''),
        action: isSuspicious ? 'SUSPICIOUS_LOGIN_ATTEMPT' : 'LOGIN_FAILED',
        category: 'security',
        entityType: 'session',
        entityId: String(userId || ''),
        description: isSuspicious 
          ? `🚨 [NGHI VẤN DÒ MẬT KHẨU] Thử đăng nhập sai liên tiếp cho tài khoản ${userId}`
          : (err.message || 'Đăng nhập thất bại'),
        ...meta
      });
      throw err;
    }
  },
  logout: async () => {
    const user = get().user;
    if (user) {
      get().appendAdminLog('LOGOUT', user.id, 'Đăng xuất', {
        category: 'security',
        entityType: 'session',
        entityId: user.id,
        storeId: user.dept || ''
      });
    }
    // Dọn dẹp Realtime subscription trước khi đăng xuất
    get()._cleanupRealtimeTimers?.();
    const channel = get()._realtimeChannel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ _realtimeChannel: null, realtimeStatus: 'disconnected' });
    }
    await signOutAuth();
    set({ user: null, authWarning: null });
  }
});
