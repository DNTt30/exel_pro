import * as api from '../../services/api';
import { ensureAuthSession, provisionAuthUser, signOutAuth, isManagerFromEmp, isAreaManagerFromEmp, isOpsManager, toAuthEmail, toAuthPassword } from '../../lib/authSession';
import { MA_RE } from '../../data/constants';
import { checkLocked, recordFailure, resetFailures } from '../../lib/loginThrottle';
import { checkDeviceTrusted } from '../../lib/adminOtp';
import { rememberClientIp, clientMeta, redact } from '../../utils/appLogs';
import { notifyTelegram, telegramConfigured } from '../../utils/telegram';
import { supabase } from '../../lib/supabase';
import { verifyAdminPassword } from '../../lib/adminCredential';
import { setRememberSession } from '../../lib/sessionStorage';
import { emptySessionData } from '../sessionState';


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
  const result = await ensureAuthSession(user, { restoreOnly: true });
  if (result.ok) {
    try { await api.ensureAppProfile(); } catch (err) { console.warn('[auth] ensureAppProfile failed (non-critical):', err?.message); }
    return null;
  }
  if (result.reason === 'no-client' || result.reason === 'no-user') return null;
  console.warn('Supabase Auth chưa sẵn sàng:', result.reason);
  return result.reason;
}

export const createAuthSlice = (set, get) => {
  let authQueue = Promise.resolve();
  let operation = 0;
  const enqueueAuth = (task) => {
    const result = authQueue.catch(() => {}).then(task);
    authQueue = result;
    return result;
  };
  return ({
  user: null,
  _sessionEpoch: 0,
  authWarning: null,
  login: (userId, password, { rememberMe = true } = {}) => {
    const attempt = ++operation;
    return enqueueAuth(async () => {
    const assertCurrent = () => {
      if (attempt !== operation) throw new Error('Yêu cầu đăng nhập đã được thay thế.');
    };
    assertCurrent();
    userId = String(userId ?? '').trim();
    if (!userId) throw new Error('Vui lòng nhập mã nhân viên');
    if (userId !== 'admin' && !MA_RE.test(userId)) {
      throw new Error('Mã nhân viên phải gồm đúng 9 chữ số');
    }
    if (typeof password !== 'string' || !password) throw new Error('Vui lòng nhập mật khẩu');

    // Chỉ lỗi thông tin đăng nhập mới được tính là một lần sai mật khẩu.
    const isInvalidCredentials = (error) => error?.code === 'invalid_credentials'
      || /invalid login credentials/i.test(error?.message || '');
    const signIn = async (authPassword) => {
      assertCurrent();
      let result;
      try {
        result = await supabase.auth.signInWithPassword({ email: toAuthEmail(userId), password: authPassword });
      } catch (err) {
        console.warn('[auth] signIn failed:', redact(err));
        throw new Error('Không thể kết nối dịch vụ đăng nhập. Vui lòng thử lại sau.');
      }
      if ((result.error && !isInvalidCredentials(result.error)) || (!result.error && !result.data?.session)) {
        throw new Error('Không thể xác thực tài khoản lúc này. Vui lòng thử lại sau.');
      }
      return result;
    };
    const rejectPassword = () => {
      recordFailure(userId);
      throw new Error('Mật khẩu không chính xác');
    };
    try {
      let nextUser = null;
      const lock = checkLocked(userId);
      if (!lock.allowed) {
        const mins = Math.max(1, Math.ceil(lock.retryAfterSec / 60));
        throw new Error('Đã thử sai quá nhiều lần. Thử lại sau khoảng ' + mins + ' phút.');
      }
      if (!supabase) throw new Error('Chưa cấu hình dịch vụ đăng nhập. Vui lòng liên hệ quản lý.');
      setRememberSession(rememberMe);
      rememberClientIp();

      if (userId === 'admin') {
        // Mật khẩu mặc định trên form vẫn là 1, ánh xạ sang mật khẩu Auth nội bộ.
        let pwCheck = await signIn(password === '1' ? toAuthPassword(userId) : password);

        // Tương thích mật khẩu admin đã đổi trên thiết bị trước khi đồng bộ Auth.
        let usedFallback = false;
        if (pwCheck.error || !pwCheck.data?.session) {
          const localOk = await verifyAdminPassword(password);
          if (password !== '1' && localOk) {
            const fallback = await signIn(toAuthPassword(userId));
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
          rejectPassword();
        }

        if (!(await checkDeviceTrusted())) {
          // Không để lại phiên Auth có quyền admin khi bước OTP chưa hoàn tất.
          // Chỉ dọn thiết bị này, không đăng xuất admin trên các thiết bị khác.
          const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
          if (signOutError) throw new Error('Không thể hoàn tất bước xác thực. Vui lòng thử lại.');
          const otpErr = new Error('Cần xác thực 2 bước qua Telegram');
          otpErr.code = 'OTP_REQUIRED';
          throw otpErr;
        }

        const metaMustChange = pwCheck.data?.user?.user_metadata?.must_change_password;
        const isDefaultPassword = password === '1' || usedFallback;
        const mustChange = isDefaultPassword || metaMustChange === true;
        
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
        const emp = await api.getEmployeeById(userId);
        if (!emp) throw new Error('Không tìm thấy mã nhân viên');
        if (emp.isActive === false) throw new Error('Mã này đã bị vô hiệu hóa (nghỉ việc). Liên hệ quản lý để mở lại.');
        let pwCheck = null;
        const isDefaultPassword = password === '1';

        if (isDefaultPassword) {
          // Lần đầu hoặc dùng mật khẩu mặc định 1: đăng nhập bằng default auth password của nhân viên
          const defaultAuthPw = toAuthPassword(emp.id);
          pwCheck = await signIn(defaultAuthPw);

          // Nếu chưa có tài khoản Supabase Auth, tự động khởi tạo (provision)
          if (isInvalidCredentials(pwCheck.error)) {
            // Tạo bằng client riêng rồi xác thực lại mật khẩu; tuyệt đối không
            // dùng ensureAuthSession ở đây vì có thể tái sử dụng phiên cũ.
            const provision = await provisionAuthUser(emp);
            if (!provision.ok) throw new Error('Chưa thể khởi tạo tài khoản đăng nhập. Vui lòng liên hệ quản lý hoặc thử lại sau.');
            pwCheck = await signIn(defaultAuthPw);
          }
        } else {
          // Người dùng đã đổi mật khẩu riêng: đăng nhập trực tiếp Supabase Auth
          pwCheck = await signIn(password);
        }

        if (pwCheck?.error || !pwCheck?.data?.session) {
          rejectPassword();
        }
        
        // Cờ mustChangePassword:
        // - Khi đăng nhập bằng mật khẩu mặc định 1: LUÔN bắt buộc đổi mật khẩu
        // - Khi đăng nhập bằng mật khẩu riêng (!isDefaultPassword): người dùng đã đổi rồi, chỉ bắt đổi nếu admin gắn cờ must_change_password === true
        const metaMustChange = pwCheck.data?.user?.user_metadata?.must_change_password;
        const mustChange = isDefaultPassword || metaMustChange === true;

        // Kiểm tra quá hạn dùng mật khẩu mặc định (chỉ áp dụng khi còn đang dùng mật khẩu '1')
        const DEFAULT_PASSWORD_EXPIRY_DAYS = 7;
        let isPasswordExpired = false;
        if (isDefaultPassword && emp.createdAt) {
          const createdDate = new Date(emp.createdAt);
          const diffDays = (Date.now() - createdDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > DEFAULT_PASSWORD_EXPIRY_DAYS) {
            isPasswordExpired = true;
          }
        }

        const passwordChangedAt = emp.passwordChangedAt 
          || (!isDefaultPassword ? (pwCheck.data?.user?.user_metadata?.password_changed_at || new Date().toISOString()) : null);

        nextUser = { 
          ...sessionUserFromEmp(emp), 
          mustChangePassword: mustChange, 
          isPasswordExpired,
          passwordChangedAt, 
          loginAt: Date.now() 
        };
      }

      assertCurrent();
      resetFailures(userId);

      get()._cleanupRealtimeTimers?.();
      if (get()._realtimeChannel) void supabase.removeChannel(get()._realtimeChannel);
      set({ ...emptySessionData(), user: nextUser, _sessionEpoch: (get()._sessionEpoch || 0) + 1, syncStatus: 'loading' });
      const roleLabel = isOpsManager(nextUser) ? (nextUser.isAreaManager ? 'OFC' : 'SM') : 'Nhân viên';
      
      // Ghi log đăng nhập thành công
      const logLogin = (...args) => {
        Promise.resolve().then(() => get().appendAdminLog(...args))
          .catch((err) => console.warn('[auth] Login log failed:', err?.message));
      };
      logLogin('LOGIN_SUCCESS', nextUser.id, roleLabel, {
        category: 'security',
        entityType: 'session',
        entityId: nextUser.id,
        storeId: nextUser.dept || '',
        description: `Đăng nhập thành công · ${nextUser.name || nextUser.id}`
      });

      // Cảnh báo bảo mật nếu đăng nhập bằng mật khẩu mặc định
      if (nextUser.mustChangePassword && nextUser.id !== 'admin') {
        logLogin('LOGIN_DEFAULT_PASSWORD', nextUser.id, roleLabel, {
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
      try {
        Promise.resolve(get().initializeData?.()).catch((err) => {
          console.warn('[auth] initializeData trigger error:', err?.message);
        });
      } catch (err) {
        console.warn('[auth] initializeData trigger error:', err?.message);
      }
      return nextUser;
    } catch (err) {
      if (err.code === 'OTP_REQUIRED') throw err;
      const meta = clientMeta();
      const lock = checkLocked(userId);
      const isSuspicious = !lock.allowed || (lock.retryAfterSec && lock.retryAfterSec > 0);
      Promise.resolve().then(() => api.addActivityLog({
        userId: String(userId || ''),
        action: isSuspicious ? 'SUSPICIOUS_LOGIN_ATTEMPT' : 'LOGIN_FAILED',
        category: 'security',
        entityType: 'session',
        entityId: String(userId || ''),
        description: isSuspicious 
          ? `🚨 [NGHI VẤN DÒ MẬT KHẨU] Thử đăng nhập sai liên tiếp cho tài khoản ${userId}`
          : (err.message || 'Đăng nhập thất bại'),
        ...meta
      })).catch((logError) => console.warn('[auth] Login log failed:', logError?.message));
      throw err;
    }
    });
  },
  logout: async () => {
    operation++;
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
    set({ ...emptySessionData(), user: null, _sessionEpoch: (get()._sessionEpoch || 0) + 1 });
    try { await enqueueAuth(() => signOutAuth()); }
    catch (err) { console.warn('[auth] signOut failed:', err?.message); }
  }
});
};
