import * as api from '../../services/api';
import { ensureAuthSession, signOutAuth, isManagerFromEmp, isAreaManagerFromEmp, isOpsManager, toAuthEmail } from '../../lib/authSession';
import { hasCustomAdminPassword, verifyAdminPassword } from '../../lib/adminCredential';
import { checkLocked, recordFailure, resetFailures, THROTTLE_MAX_FAILS } from '../../lib/loginThrottle';
import { checkDeviceTrusted } from '../../lib/adminOtp';
import { rememberClientIp, clientMeta } from '../../utils/appLogs';
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
    try { await api.ensureAppProfile(); } catch { /* bỏ qua */ }
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
          throw new Error('Đã thử sai quá ' + THROTTLE_MAX_FAILS + ' lần. Thử lại sau khoảng ' + mins + ' phút.');
        }
        const customOk = await verifyAdminPassword(password);
        const usingDefault = password === '1' && !hasCustomAdminPassword();
        if (!customOk && !usingDefault) {
          const fail = recordFailure('admin');
          throw new Error(fail.locked ? 'Sai mật khẩu. Tài khoản tạm khóa 5 phút.' : 'Mật khẩu không chính xác');
        }
        if (!(await checkDeviceTrusted())) {
          const otpErr = new Error('Cần xác thực 2 bước qua Telegram');
          otpErr.code = 'OTP_REQUIRED';
          throw otpErr;
        }
        nextUser = {
          id: 'admin',
          role: 'admin',
          name: 'Quản trị viên',
          jobTitle: 'Quản trị viên',
          isManager: true,
          mustSetupPassword: usingDefault,
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
        if (password === '1') {
          nextUser = { ...sessionUserFromEmp(emp), mustChangePassword: true, loginAt: Date.now() };
        } else {
          const pwCheck = await supabase.auth.signInWithPassword({
            email: toAuthEmail(emp.id),
            password,
          });
          if (pwCheck.error || !pwCheck.data?.session) {
            recordFailure(userId);
            throw new Error('Mật khẩu không chính xác');
          }
          nextUser = { ...sessionUserFromEmp(emp), authPassword: password, mustChangePassword: false, loginAt: Date.now() };
        }
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
          notifyTelegram('🔑 ' + (nextUser.name || nextUser.id) + ' (' + nextUser.id + ') đăng nhập · ' + roleLabel + ' · ' + when).catch(() => {});
        }
      } catch { /* ignore */ }
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
    await signOutAuth();
    set({ user: null, authWarning: null });
  }
});
