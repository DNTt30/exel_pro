import { supabase } from '../lib/supabase';

// --- STORES API ---
export async function getStores() {
  const { data, error } = await supabase.from('stores').select('*').order('id', { ascending: true });
  if (error) {
    console.error('Lỗi lấy danh sách cửa hàng:', error);
    return [];
  }
  return data;
}

export async function addStore(store) {
  const { error } = await supabase.from('stores').insert([store]);
  if (error) throw error;
}

export async function updateStore(id, updates) {
  const { error } = await supabase.from('stores').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteStore(id) {
  const { error } = await supabase.from('stores').delete().eq('id', id);
  if (error) throw error;
}

// --- EMPLOYEES API ---
export async function getEmployees() {
  const { data, error } = await supabase.from('employees').select('*').order('dept', { ascending: true });
  if (error) {
    console.error('Lỗi lấy danh sách nhân viên:', error);
    return [];
  }
  return data.map(e => ({
    id: e.id,
    name: e.name,
    dept: e.dept,
    type: e.type,
    role: e.role,
    maxH: e.max_h
  }));
}

export async function addEmployee(emp) {
  const { error } = await supabase.from('employees').insert([{
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
  
  const { error } = await supabase.from('employees').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteEmployeeData(id) {
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) throw error;
}

// Lấy lịch làm việc của 1 tuần
export async function getSchedulesByWeek(weekDate) {
  const { data, error } = await supabase.from('schedules').select('*').eq('week_date', weekDate);
  if (error) {
    console.error('Lỗi lấy lịch làm việc:', error);
    return {};
  }
  
  const scheduleMap = {};
  data.forEach(row => {
    scheduleMap[row.emp_id] = row.shifts || {};
  });
  return scheduleMap;
}

// Lưu/Cập nhật toàn bộ lịch của 1 nhân viên trong 1 tuần
export async function saveEmployeeSchedule(weekDate, empId, shifts) {
  const { error } = await supabase.from('schedules').upsert({
    week_date: weekDate,
    emp_id: empId,
    shifts: shifts
  }, { onConflict: 'week_date,emp_id' });
  
  if (error) {
    console.error('Lỗi lưu lịch làm việc:', error);
    throw error;
  }
}

// Lấy danh sách Feedback
export async function getFeedbacks() {
  const { data, error } = await supabase.from('feedbacks').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Lỗi lấy danh sách feedback:', error);
    return [];
  }
  return data.map(f => ({
    id: f.id,
    empId: f.emp_id || f.empId,
    empName: f.emp_name || f.empName || f.name || '',
    name: f.emp_name || f.empName || f.name || '',
    dept: f.dept,
    empRole: f.emp_role || f.empRole || f.role || 'STPT',
    empType: f.emp_type || f.empType || f.type || 'STPT',
    date: f.date,
    shift: f.shift,
    hours: f.hours,
    reason: f.reason || f.issue || '',
    issue: f.issue || f.reason || '',
    note: f.note || '',
    imageUrl: f.image_url || f.imageUrl || '',
    status: f.status || 'pending'
  }));
}

// Cập nhật trạng thái Feedback
export async function updateFeedback(id, status) {
  const { error } = await supabase.from('feedbacks').update({ status }).eq('id', id);
  if (error) throw error;
}
