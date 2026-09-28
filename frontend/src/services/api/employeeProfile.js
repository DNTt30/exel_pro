import { db } from './client';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../lib/supabase';
import { validateEmployeeProfile } from '../../utils/employeeProfile';
import { normalizeRecoveryEmail } from '../../utils/recoveryEmail';
const messages = {
  AUTH_REQUIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  INVALID_PASSWORD: 'Mật khẩu hiện tại không đúng.', PASSWORD_REQUIRED: 'Vui lòng nhập mật khẩu hiện tại.',
  RATE_LIMITED: 'Đã thử xác nhận 5 lần. Vui lòng chờ 15 phút.',
  INVALID_EMAIL: 'Email khôi phục không hợp lệ.', EMAIL_CHANGED: 'Email đã thay đổi ở phiên khác. Vui lòng tải lại hồ sơ.',
  RESET_IN_PROGRESS: 'Đang có yêu cầu đổi mật khẩu được xử lý. Vui lòng thử lại sau.',
  PROFILE_NOT_FOUND: 'Không tìm thấy hồ sơ nhân viên đang hoạt động.',
};
function mapProfile(row) {
  return { id: row.id, name: row.name, dept: row.dept, role: row.role, type: row.type, jobTitle: row.job_title,
    recoveryEmail: row.recovery_email || '', dob: row.dob || '', university: row.university || '',
    major: row.major || '', workPlanUntil: row.work_plan_until || '' };
}
export async function getEmployeeProfiles(empId = null) {
  const { data, error } = await db().rpc('get_employee_profiles', { p_emp_id: empId });
  if (error) throw error;
  return (data || []).map(mapProfile);
}
async function profileSessionToken(expectedEmpId) {
  const { data, error } = await supabase.auth.getSession();
  const session = data?.session;
  if (error || !session?.access_token || !expectedEmpId || session.user?.email !== `${expectedEmpId}@ofc.app`) {
    throw new Error(messages.AUTH_REQUIRED);
  }
  return session.access_token;
}
export async function saveMyEmployeeProfile(profile, expectedEmpId) {
  const invalid = validateEmployeeProfile(profile);
  if (invalid) throw new Error(invalid);
  const token = await profileSessionToken(expectedEmpId);
  const { error } = await db().rpc('update_my_employee_profile', { p_dob: profile.dob || null,
    p_university: profile.university.trim() || null, p_major: profile.major.trim() || null,
    p_work_plan_until: profile.workPlanUntil.trim() || null }).setHeader('Authorization', `Bearer ${token}`);
  if (error) throw error;
}
export async function changeMyRecoveryEmail(newEmail, currentPassword, expectedEmpId) {
  const email = normalizeRecoveryEmail(newEmail);
  if (!email) throw new Error(messages.INVALID_EMAIL);
  if (!currentPassword) throw new Error(messages.PASSWORD_REQUIRED);
  const token = await profileSessionToken(expectedEmpId);
  const response = await fetch(`${supabaseUrl}/functions/v1/employee-profile`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}` },
    body: JSON.stringify({ new_email: email, current_password: currentPassword }), signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(messages[result.code] || 'Không đổi được email. Vui lòng thử lại sau.');
  return email;
}
