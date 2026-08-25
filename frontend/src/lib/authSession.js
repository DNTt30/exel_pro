import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';

export const AUTH_PASSWORD = '1';

/** Supabase yêu cầu ≥ 6 ký tự; form Hướng B vẫn là `1`. */
export function toAuthPassword(userId) {
  return `ofc-${String(userId || 'user').trim()}-1`;
}

export function toAuthEmail(userId) {
  const id = String(userId || '').trim();
  if (!id) return '';
  if (id === 'admin') return 'admin@ofc.app';
  return `${id}@ofc.app`;
}

function jobTitleOf(emp) {
  const jt = String(emp?.jobTitle || '').trim();
  const r = String(emp?.role || '').trim();
  if (r === 'employee' || r === 'admin') return jt || r;
  // Gop ca hai de nhan dien chuc danh du cho (role co the la STFT/STPT hoac chuc danh cu)
  return [jt, r].filter(Boolean).join(' ');
}

export function isAreaManagerFromEmp(emp) {
  const r = jobTitleOf(emp);
  const t = String(emp?.type || '').trim();
  return r === 'OFC' || r === 'SM' || /khu vực/i.test(r) || t === 'OFC';
}

export function isStoreManagerFromEmp(emp) {
  const r = jobTitleOf(emp).toLowerCase();
  return r.includes('cửa hàng trưởng') && !isAreaManagerFromEmp(emp);
}

export function isManagerFromEmp(emp) {
  const title = jobTitleOf(emp).toLowerCase();
  const typeName = emp?.type || '';
  return isStoreManagerFromEmp(emp) ||
    isAreaManagerFromEmp(emp) ||
    title.includes('quản lý') ||
    typeName === 'SM';
}

/** Tài khoản form `admin` = SM cửa hàng (không còn super-admin tách biệt). */
export function isBuiltinStoreManager(user) {
  return user?.id === 'admin' || user?.role === 'admin';
}

/** SM / OFC / admin — vào menu quản lý cửa hàng. */
export function isOpsManager(user) {
  if (!user) return false;
  return isBuiltinStoreManager(user) || !!(user.isManager || isManagerFromEmp(user));
}

/** Được chọn nhiều cửa hàng: OFC khu vực, hoặc SM chưa gắn CH (login admin). */
export function canPickStore(user) {
  if (!user) return false;
  if (isAreaManagerFromEmp(user)) return true;
  // ADMIN builtin: luon toan quyen, bo qua dept stale trong phien luu
  if (user.id === 'admin' || user.role === 'admin') return true;
  return isBuiltinStoreManager(user) && !user.dept;
}

/** Staff / SM / AM / Admin — map từ tài khoản hiện tại (Hướng B). */
export function appRoleOf(user) {
  if (!user) return 'staff';
  if (isAreaManagerFromEmp(user)) return 'am';
  if (user.role === 'admin' || user.id === 'admin') return 'admin';
  if (isOpsManager(user)) return 'sm';
  return 'staff';
}

export function appRoleLabel(user) {
  const r = appRoleOf(user);
  if (r === 'admin') return user?.dept ? `Admin (${user.dept})` : 'Admin';
  if (r === 'am') return 'AM';
  if (r === 'sm') return user?.dept ? `SM (${user.dept})` : 'SM';
  return user?.dept ? `Staff (${user.dept})` : 'Staff';
}

export function canApproveSchedule(user) {
  const r = appRoleOf(user);
  return r === 'admin' || r === 'am';
}

export function authMetadata(user) {
  return {
    emp_id: user.id,
    role: user.role || 'employee',
    is_manager: !!user.isManager,
    dept: user.dept || ''
  };
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Tạo user Auth khi admin thêm NV.
 * Dùng client riêng (không persist) để không đá phiên admin đang đăng nhập.
 */
export async function provisionAuthUser(emp) {
  if (!supabaseUrl || !supabaseAnonKey || !emp?.id) {
    return { ok: false, reason: 'no-client' };
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: `ofc-provision-${emp.id}`
    }
  });

  const email = toAuthEmail(emp.id);
  const password = toAuthPassword(emp.id);
  const meta = authMetadata({
    id: emp.id,
    role: 'employee',
    isManager: isManagerFromEmp(emp),
    dept: emp.dept || ''
  });

  try {
    const { error } = await withTimeout(
      client.auth.signUp({ email, password, options: { data: meta } }),
      12000,
      'timeout-provision'
    );
    if (!error) return { ok: true };
    if (/already|registered|exists/i.test(error.message)) return { ok: true, already: true };
    return { ok: false, reason: error.message };
  } catch (err) {
    return { ok: false, reason: err.message || 'provision-failed' };
  }
}

export async function ensureAuthSession(user, { allowSignUp = false } = {}) {
  if (!supabase) return { ok: false, reason: 'no-client' };
  if (!user?.id) return { ok: false, reason: 'no-user' };

  const email = toAuthEmail(user.id);
  const meta = authMetadata(user);

  const { data: current } = await withTimeout(
    supabase.auth.getSession(),
    8000,
    'timeout-get-session'
  );
  const currentEmail = current?.session?.user?.email;
  if (current?.session && currentEmail === email) {
    await supabase.auth.updateUser({ data: meta }).catch(() => {});
    return { ok: true, session: current.session };
  }
  if (current?.session && currentEmail !== email) {
    await supabase.auth.signOut();
  }

  try {
    const signedIn = await withTimeout(
      supabase.auth.signInWithPassword({ email, password: toAuthPassword(user.id) }),
      10000,
      'timeout-sign-in'
    );
    if (signedIn.data?.session) {
      await supabase.auth.updateUser({ data: meta }).catch(() => {});
      return { ok: true, session: signedIn.data.session };
    }

    if (!allowSignUp) {
      return {
        ok: false,
        reason: signedIn.error?.message || 'Chưa có tài khoản Auth. Nhờ admin thêm lại nhân viên để tạo user.'
      };
    }

    const signedUp = await withTimeout(
      supabase.auth.signUp({
        email,
        password: toAuthPassword(user.id),
        options: { data: meta }
      }),
      10000,
      'timeout-sign-up'
    );
    if (signedUp.data?.session) {
      return { ok: true, session: signedUp.data.session };
    }

    const retry = await withTimeout(
      supabase.auth.signInWithPassword({ email, password: toAuthPassword(user.id) }),
      10000,
      'timeout-sign-in-retry'
    );
    if (retry.data?.session) {
      await supabase.auth.updateUser({ data: meta }).catch(() => {});
      return { ok: true, session: retry.data.session };
    }

    return {
      ok: false,
      reason: signedUp.error?.message || signedIn.error?.message || retry.error?.message || 'no-session'
    };
  } catch (err) {
    return { ok: false, reason: err.message || 'auth-failed' };
  }
}

export async function signOutAuth() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
