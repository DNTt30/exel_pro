import { supabase, supabaseAnonKey } from '../../lib/supabase';
import { toAuthEmail, toAuthPassword } from '../../lib/authSession';
import { verifyAdminPassword } from '../../lib/adminCredential';
import { validateNewPassword } from '../../utils/passwordPolicy';

function assertNewPassword(password) {
  const error = validateNewPassword(password);
  if (error) throw new Error(error);
}

/** Adapter for the existing admin credential form; UI never calls Supabase. */
export async function verifyAdminSessionPassword(current) {
  if (typeof current !== 'string' || !current) return false;
  const checked = await supabase.auth.signInWithPassword({ email: 'admin@ofc.app', password: current });
  if (!checked.error && checked.data?.session) return true;
  const localMatch = await verifyAdminPassword(current);
  if (current !== '1' && current !== 'ofc-admin-1' && !localMatch) return false;
  const fallback = await supabase.auth.signInWithPassword({ email: 'admin@ofc.app', password: 'ofc-admin-1' });
  return !fallback.error && !!fallback.data?.session;
}

export async function updateAdminSessionPassword(password) {
  assertNewPassword(password);
  const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false, password_changed_at: new Date().toISOString() } });
  if (error) throw error;
  try { await supabase.rpc('mark_credential_set'); } catch { /* Legacy RPC is optional. */ }
}

/** Đổi mật khẩu của CHÍNH MÌNH: xác thực lại mật khẩu cũ rồi updateUser. */
export async function changeMyPassword(oldPassword, newPassword, opts = {}) {
  assertNewPassword(newPassword);
  const { isFirstTime = false, userId } = opts;
  const { data: sess } = await supabase.auth.getSession();
  const email = sess?.session?.user?.email;
  if (!email) throw new Error('Chưa có phiên đăng nhập. Vui lòng tải lại trang.');
  if (userId && email !== toAuthEmail(userId)) throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.');
  if (oldPassword && oldPassword === newPassword) throw new Error('Mật khẩu mới không được trùng mật khẩu cũ');

  // Chỉ xác thực mật khẩu cũ nếu KHÔNG phải lần đầu đổi mật khẩu mặc định
  if (!isFirstTime) {
    if (typeof oldPassword !== 'string' || !oldPassword) throw new Error('Vui lòng nhập mật khẩu hiện tại');
    const password = oldPassword === '1' ? toAuthPassword(email.split('@')[0]) : oldPassword;
    const check = await supabase.auth.signInWithPassword({ email, password });
    if (check.error || !check.data?.session) throw new Error('Mật khẩu hiện tại không đúng');
  }

  const nowIso = new Date().toISOString();
  const upd = await supabase.auth.updateUser({ 
    password: newPassword,
    data: { must_change_password: false, password_changed_at: nowIso }
  });
  if (upd.error) throw new Error(upd.error.message || 'Không thể cập nhật mật khẩu');

  // Đánh dấu đã tự đặt mật khẩu (RPC definer & cập nhật bảng employees)
  try {
    await supabase.rpc('mark_my_password_changed');
  } catch {
    // bỏ qua nếu RPC chưa khởi tạo
  }
  try {
    await supabase.rpc('mark_credential_set');
  } catch {
    // bỏ qua nếu RPC chưa khởi tạo
  }

  // Cập nhật trường password_changed_at trực tiếp trên bảng employees
  const targetId = userId || (email ? email.split('@')[0] : null);
  if (targetId && targetId !== 'admin') {
    try {
      await supabase.from('employees').update({ password_changed_at: nowIso }).eq('id', targetId);
    } catch {
      // bỏ qua nếu RLS không cho phép
    }
  }
  return true;
}

/** Trạng thái mật khẩu của bản thân: null credential_set_at = còn mặc định. */
export async function getMyCredentialState() {
  try {
    const { data } = await supabase.rpc('get_credential_state');
    const row = Array.isArray(data) ? data[0] : data;
    return { setAt: row?.credential_set_at || null };
  } catch {
    return { setAt: null };
  }
}

/**
 * ADMIN đặt lại mật khẩu cho NV qua Edge Function reset-password (service_role).
 * Trả true nếu thành công; ném lỗi với message thân thiện.
 */
export async function adminResetPassword(targetEmpId, newPassword) {
  assertNewPassword(newPassword);
  const fnUrl = String(import.meta.env?.VITE_ADMIN_OTP_URL || '').replace(/admin-otp$/, 'reset-password');
  if (!fnUrl || !/reset-password$/.test(fnUrl)) throw new Error('Tính năng đặt lại mật khẩu chưa được kích hoạt. Vui lòng liên hệ quản trị viên hệ thống.');
  const { data: sess } = await supabase.auth.getSession();
  const jwt = sess?.session?.access_token;
  if (!jwt) throw new Error('Chưa có phiên đăng nhập. Vui lòng đăng nhập lại.');
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || supabaseAnonKey;
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: 'Bearer ' + jwt },
    body: JSON.stringify({ target_emp_id: targetEmpId, new_password: newPassword }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || out.ok === false) throw new Error(out.error || 'Không đặt lại được mật khẩu');

  // Đặt lại cờ chưa đổi mật khẩu cho nhân viên vừa được reset
  try {
    await supabase.rpc('admin_reset_employee_password_flag', { p_emp_id: targetEmpId });
  } catch {
    // fallback cập nhật trực tiếp nếu RPC chưa áp dụng
    try {
      await supabase.from('employees').update({ password_changed_at: null }).eq('id', targetEmpId);
    } catch { /* ignore */ }
  }
  return true;
}
