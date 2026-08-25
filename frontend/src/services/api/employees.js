import { db } from './client';

// --- EMPLOYEES API ---
function mapEmployee(e) {
  if (!e) return null;
  return {
    id: e.id,
    name: e.name,
    dept: e.dept,
    type: e.type,
    role: e.role,
    jobTitle: e.job_title || '',
    maxH: e.max_h,
    isActive: e.is_active !== false
  };
}

export async function getEmployeeById(id) {
  if (!id) return null;
  // Ưu tiên RPC login_lookup (chạy được cả khi CHƯA có phiên — phục vụ màn hình đăng nhập
  // sau khi RLS Phase 1 khoá SELECT employees cho anon). Fallback: đọc thẳng bảng.
  try {
    const { data: rpcRow, error: rpcErr } = await db().rpc('login_lookup', { p_ma: id }).maybeSingle();
    if (!rpcErr && rpcRow) return mapEmployee(rpcRow);
  } catch { /* bỏ qua, thử đường cũ */ }
  const { data, error } = await db().from('employees').select('id,name,dept,type,role,job_title,max_h,is_active').eq('id', id).maybeSingle();
  if (error) {
    console.error('Lỗi lấy nhân viên:', error);
    return null;
  }
  return mapEmployee(data);
}

export async function getEmployees(opts = {}) {
  let q = db().from('employees').select('id,name,dept,type,role,job_title,max_h,is_active').order('dept', { ascending: true });
  if (opts.dept) q = q.eq('dept', opts.dept);
  const { data, error } = await q;
  if (error) {
    console.error('Lỗi lấy danh sách nhân viên:', error);
    return [];
  }
  return (data || []).map(mapEmployee);
}

export async function addEmployee(emp) {
  const { error } = await db().from('employees').insert([{
    id: emp.id,
    name: emp.name,
    dept: emp.dept,
    type: emp.type,
    role: emp.role,
    max_h: emp.maxH
  }]);
  if (error) throw error;
}

export async function updateEmployeeInfo(id, updates) {
  const payload = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.dept !== undefined) payload.dept = updates.dept;
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.role !== undefined) payload.role = updates.role;
  if (updates.maxH !== undefined) payload.max_h = updates.maxH;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  if (updates.jobTitle !== undefined) payload.job_title = updates.jobTitle;
  
  // .select('id') để phát hiện RLS chặn ngầm: PostgREST trả 200 + 0 dòng
  // khi phiên chưa xác thực — không có lỗi, chỉ âm thầm bỏ qua.
  const { data, error } = await db().from('employees').update(payload).eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Không ghi được vào DB (bị RLS chặn). Đăng xuất → đăng nhập lại để nhận phiên xác thực.');
  }
}

export async function deleteEmployeeData(id) {
  const { error } = await db().from('employees').delete().eq('id', id);
  if (error) throw error;
}

