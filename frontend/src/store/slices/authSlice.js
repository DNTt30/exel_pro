import * as api from '../../services/api';
import { ensureAuthSession, signOutAuth, isManagerFromEmp, isAreaManagerFromEmp, isOpsManager, toAuthEmail } from '../../lib/authSession';
import { checkLocked, recordFailure, resetFailures } from '../../lib/loginThrottle';
import { checkDeviceTrusted } from '../../lib/adminOtp';
import { rememberClientIp, clientMeta, redact } from '../../utils/appLogs';
import { notifyTelegram, telegramConfigured } from '../../utils/telegram';
import { supabase } from '../../lib/supabase';


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

        const pwCheck = await supabase.auth.signInWithPassword({
          email: 'admin@ofc.app',
          password,
        });

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

        const mustChange = pwCheck.data.user?.user_metadata?.must_change_password === true;
        
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
        
        // Cờ mustChangePassword dựa trên metadata thay vì hardcode password === '1'
        const mustChange = pwCheck.data.user?.user_metadata?.must_change_password === true;
        nextUser = { ...sessionUserFromEmp(emp), mustChangePassword: mustChange, loginAt: Date.now() };
      }

      resetFailures(userId);

      set({ user: nextUser, syncStatus: 'loading' });
      const roleLabel = isOpsManager(nextUser) ? (nextUser.isAreaManager ? 'OFC' : 'SM') : 'Nhân viên';
      get().appendAdminLog('LOGIN_SUCCESS', nextUser.id, roleLabel, {
        category: 'security',
        entityType: 'session',
        entityId: nextUser.id,
        storeId: nextUser.dept || '',
        description: `Đăng nhập thành công · ${nextUser.name || nextUser.id}`
      });
      try {
        if (telegramConfigured()) {
          const when = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
          notifyTelegram('🔑 ' + (nextUser.name || nextUser.id) + ' (' + nextUser.id + ') đăng nhập · ' + roleLabel + ' · ' + when)
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
      api.addActivityLog({
        userId: String(userId || ''),
        action: 'LOGIN_FAILED',
        category: 'security',
        entityType: 'session',
        entityId: String(userId || ''),
        description: err.message || 'Đăng nhập thất bại',
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
