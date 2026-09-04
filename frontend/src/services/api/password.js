import { supabase } from '../../lib/supabase';
import { toAuthEmail, toAuthPassword } from '../../lib/authSession';

/** Đổi mật khẩu của CHÍNH MÌNH: xác thực lại mật khẩu cũ rồi updateUser. */
export async function changeMyPassword(oldPassword, newPassword, opts = {}) {
  const { isFirstTime = false, userId } = opts;
  let { data: sess } = await supabase.auth.getSession();
  let email = sess?.session?.user?.email;

  // Nếu chưa có session nhưng có userId, thử thiết lập phiên bằng default password
  if (!email && userId) {
    email = toAuthEmail(userId);
    const defPw = toAuthPassword(userId);
    const signRes = await supabase.auth.signInWithPassword({ email, password: defPw });
    if (signRes.data?.session) {
      sess = signRes.data;
    }
  }

  if (!email) throw new Error('Chưa có phiên đăng nhập. Vui lòng tải lại trang.');

  // Chỉ xác thực mật khẩu cũ nếu KHÔNG phải lần đầu đổi mật khẩu mặc định
  if (!isFirstTime) {
    let check = await supabase.auth.signInWithPassword({ email, password: oldPassword });
    // Nếu thất bại và mật khẩu cũ là '1' (hoặc người dùng đang dùng mặc định), thử mật khẩu mặc định của hệ thống
    if (check.error && (oldPassword === '1' || !oldPassword)) {
      const uId = userId || email.split('@')[0];
      check = await supabase.auth.signInWithPassword({ email, password: toAuthPassword(uId) });
    }
    if (check.error) throw new Error('Mật khẩu hiện tại không đúng');
  }

  const upd = await supabase.auth.updateUser({ password: newPassword });
  if (upd.error) throw new Error(upd.error.message || 'Không thể cập nhật mật khẩu');

  // Đánh dấu đã tự đặt mật khẩu (RPC definer — vượt RLS app_profiles)
  try {
    await supabase.rpc('mark_credential_set');
  } catch {
    // bỏ qua nếu RPC chưa khởi tạo
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
  const fnUrl = String(import.meta.env?.VITE_ADMIN_OTP_URL || '').replace(/admin-otp$/, 'reset-password');
  if (!fnUrl || !/reset-password$/.test(fnUrl)) throw new Error('Tính năng đặt lại mật khẩu chưa được kích hoạt. Vui lòng liên hệ quản trị viên hệ thống.');
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