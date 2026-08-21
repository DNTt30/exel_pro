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

export function isManagerFromEmp(emp) {
  const roleName = (emp?.role || '').toLowerCase();
  const typeName = emp?.type || '';
  return roleName.includes('quản lý') ||
    roleName.includes('cửa hàng trưởng') ||
    emp?.role === 'SM' ||
    typeName === 'SM';
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
