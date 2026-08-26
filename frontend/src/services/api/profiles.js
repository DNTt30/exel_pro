import { db } from './client';

// --- APP PROFILES (RLS Phase 1) ---
// Đồng bộ dòng app_profiles cho phiên hiện tại (RPC SECURITY DEFINER).
// Policy employees/stores tra current_emp_id() từ bảng này — thiếu là mất dữ liệu.
export async function ensureAppProfile() {
  const { data, error } = await db().rpc('ensure_app_profile');
  if (error) throw error;
  return data;
}
