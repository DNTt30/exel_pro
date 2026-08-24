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
    maxH: e.max_h,
    isActive: e.is_active !== false
  };
}

export async function getEmployeeById(id) {
  if (!id) return null;
  const { data, error } = await db().from('employees').select('id,name,dept,type,role,max_h,is_active').eq('id', id).maybeSingle();
  if (error) {
    console.error('Lỗi lấy nhân viên:', error);
    return null;
  }
  return mapEmployee(data);
}

export async function getEmployees(opts = {}) {
  let q = db().from('employees').select('id,name,dept,type,role,max_h,is_active').order('dept', { ascending: true });
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
  
  const { error } = await db().from('employees').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteEmployeeData(id) {
  const { error } = await db().from('employees').delete().eq('id', id);
  if (error) throw error;
}

