import { supabase } from '../../lib/supabase';

/** Đổi mật khẩu của CHÍNH MÌNH: xác thực lại mật khẩu cũ rồi updateUser. */
export async function changeMyPassword(oldPassword, newPassword) {
  const { data: sess } = await supabase.auth.getSession();
  const email = sess?.session?.user?.email;
  if (!email) throw new Error('Chưa có phiên đăng nhập');

  // Xác thực mật khẩu cũ bằng cách sign-in lại
  const check = await supabase.auth.signInWithPassword({ email, password: oldPassword });
  if (check.error) throw new Error('Mật khẩu hiện tại không đúng');

  const upd = await supabase.auth.updateUser({ password: newPassword });
  if (upd.error) throw new Error(upd.error.message);

  // Đánh dấu đã tự đặt mật khẩu (RPC definer — vượt RLS app_profiles)
  await supabase.rpc('mark_credential_set');
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
  const fnUrl = String(import.meta.env?.VITE_ADMIN_OTP_URL || '').replace(/admin-otp$/, 'reset-password');
  if (!fnUrl || !/reset-password$/.test(fnUrl)) throw new Error('RESET_FN_NOT_CONFIGURED');
  const { data: sess } = await supabase.auth.getSession();
  const jwt = sess?.session?.access_token;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: 'Bearer ' + jwt },
    body: JSON.stringify({ target_emp_id: targetEmpId, new_password: newPassword }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || out.ok === false) throw new Error(out.error || 'Không đặt lại được mật khẩu');
  return true;
}