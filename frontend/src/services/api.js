import { supabase } from '../lib/supabase';
import { normalizeStaffingConfig, normalizeStoreDemand } from '../data/constants';

function db() {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase URL/Key trong file .env');
  }
  return supabase;
}

// --- STORES API ---
export async function getStores() {
  const { data, error } = await db().from('stores').select('*').order('id', { ascending: true });
  if (error) {
    console.error('Lỗi lấy danh sách cửa hàng:', error);
    return [];
  }
  try {
    return (data || []).map(mapStore);
  } catch (err) {
    console.error('Lỗi map cửa hàng:', err);
    return data || [];
  }
}

function mapStore(row) {
  if (!row) return row;
  return {
    ...row,
    staffing: normalizeStaffingConfig(row.staffing),
    demand: normalizeStoreDemand(row.demand)
  };
}

function storeWritePayload(store) {
  const payload = { ...store };
  if (payload.staffing) payload.staffing = normalizeStaffingConfig(payload.staffing);
  if (payload.demand) payload.demand = normalizeStoreDemand(payload.demand);
  return payload;
}

function isOptionalStoreColumnError(message) {
  return /staffing|demand|schema cache|column/i.test(message || '');
}

function stripOptionalStoreCols(payload) {
  const { staffing, demand, ...rest } = payload;
  return rest;
}

export async function addStore(store) {
  const payload = storeWritePayload(store);
  const { error } = await db().from('stores').insert([payload]);
  if (error) {
    if (isOptionalStoreColumnError(error.message)) {
      const retry = await db().from('stores').insert([stripOptionalStoreCols(payload)]);
      if (retry.error) throw retry.error;
      return { extraFieldsLocalOnly: true };
    }
    throw error;
  }
}

export async function updateStore(id, updates) {
  const payload = storeWritePayload(updates);
  const { error } = await db().from('stores').update(payload).eq('id', id);
  if (error) {
    if (isOptionalStoreColumnError(error.message)) {
      const rest = stripOptionalStoreCols(payload);
      if (Object.keys(rest).length === 0) return { extraFieldsLocalOnly: true };
      const retry = await db().from('stores').update(rest).eq('id', id);
      if (retry.error) throw retry.error;
      return { extraFieldsLocalOnly: true };
    }
    throw error;
  }
}

export async function deleteStore(id) {
  const { error } = await db().from('stores').delete().eq('id', id);
  if (error) throw error;
}

// --- EMPLOYEES API ---
export async function getEmployees() {
  const { data, error } = await db().from('employees').select('*').order('dept', { ascending: true });
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
  
  const { error } = await db().from('employees').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteEmployeeData(id) {
  const { error } = await db().from('employees').delete().eq('id', id);
  if (error) throw error;
}

// Lấy lịch làm việc của 1 tuần
export async function getSchedulesByWeek(weekDate) {
  const { data, error } = await db().from('schedules').select('*').eq('week_date', weekDate);
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
  const { error } = await db().from('schedules').upsert({
    week_date: weekDate,
    emp_id: empId,
    shifts: shifts
  }, { onConflict: 'week_date,emp_id' });
  
  if (error) {
    console.error('Lỗi lưu lịch làm việc:', error);
    throw error;
  }
}

// Lưu HÀNG LOẠT lịch của nhiều nhân viên (giải quyết lỗi N+1 query)
export async function saveBulkEmployeeSchedules(weekDate, scheduleMap) {
  const payload = Object.entries(scheduleMap).map(([empId, shifts]) => ({
    week_date: weekDate,
    emp_id: empId,
    shifts: shifts
  }));

  if (payload.length === 0) return;

  const { error } = await db().from('schedules').upsert(payload, { onConflict: 'week_date,emp_id' });
  
  if (error) {
    console.error('Lỗi lưu lịch làm việc hàng loạt:', error);
    throw error;
  }
}

// Lấy danh sách Feedback
export async function getFeedbacks() {
  const { data, error } = await db().from('feedbacks').select('*').order('created_at', { ascending: false });
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
    resolutionNote: f.resolution_note || f.resolutionNote || '',
    imageUrl: f.image_url || f.imageUrl || '',
    status: f.status || 'pending',
    createdAt: f.created_at
  }));
}

// Thêm Feedback mới vào Supabase
export async function addFeedback(payload) {
  const row = {
    emp_id: payload.empId,
    emp_name: payload.empName || payload.name || '',
    dept: payload.dept,
    emp_role: payload.empRole || payload.role || 'STPT',
    emp_type: payload.empType || payload.type || 'STPT',
    date: payload.date,
    shift: payload.shift || '',
    hours: payload.hours || 0,
    reason: payload.reason || payload.issue || '',
    note: payload.note || '',
    image_url: payload.imageUrl || '',
    status: payload.status || 'pending'
  };

  const { data, error } = await db().from('feedbacks').insert([row]).select().single();
  if (error) {
    console.error('Lỗi lưu feedback vào Supabase:', error);
    throw error;
  }

  return {
    id: data.id,
    empId: data.emp_id,
    empName: data.emp_name,
    name: data.emp_name,
    dept: data.dept,
    empRole: data.emp_role,
    empType: data.emp_type,
    date: data.date,
    shift: data.shift,
    hours: data.hours,
    reason: data.reason,
    issue: data.reason,
    note: data.note,
    resolutionNote: data.resolution_note || '',
    imageUrl: data.image_url,
    status: data.status,
    createdAt: data.created_at
  };
}

// Cập nhật trạng thái Feedback
export async function getAdminLogs() {
  try {
    const { data, error } = await db().from('admin_logs').select('*').order('created_at', { ascending: false }).limit(300);
    if (error) {
      console.error('Lỗi lấy nhật ký quản lý:', error);
      return [];
    }
    return (data || []).map(row => ({
      id: row.id,
      actorId: row.actor_id,
      actorName: row.actor_name,
      action: row.action,
      target: row.target || '',
      detail: row.detail || '',
      createdAt: row.created_at
    }));
  } catch (err) {
    console.error('Lỗi lấy nhật ký quản lý:', err);
    return [];
  }
}

export async function addAdminLog(entry) {
  const { data, error } = await db().from('admin_logs').insert([{
    actor_id: entry.actorId,
    actor_name: entry.actorName,
    action: entry.action,
    target: entry.target || '',
    detail: entry.detail || ''
  }]).select().single();
  if (error) throw error;
  return {
    id: data.id,
    actorId: data.actor_id,
    actorName: data.actor_name,
    action: data.action,
    target: data.target || '',
    detail: data.detail || '',
    createdAt: data.created_at
  };
}

export async function updateFeedback(id, status, resolutionNote = '') {
  const updatePayload = { status };
  if (resolutionNote) updatePayload.resolution_note = resolutionNote;
  const { error } = await db().from('feedbacks').update(updatePayload).eq('id', id);
  if (error) throw error;
}

function mapShiftSwap(row) {
  if (!row) return null;
  return {
    id: row.id,
    week: row.week_date || row.week,
    store: row.store,
    fromEmpId: row.from_emp_id,
    fromEmpName: row.from_emp_name || '',
    fromDay: row.from_day,
    fromShift: row.from_shift || '',
    toEmpId: row.to_emp_id,
    toEmpName: row.to_emp_name || '',
    toDay: row.to_day,
    toShift: row.to_shift || '',
    reason: row.reason || '',
    status: row.status || 'pending_partner',
    managerNote: row.manager_note || '',
    createdAt: row.created_at,
    resolvedAt: row.resolved_at || null
  };
}

export async function getShiftSwaps() {
  try {
    const { data, error } = await db().from('shift_swaps').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Lỗi lấy danh sách đổi ca:', error);
      return [];
    }
    return (data || []).map(mapShiftSwap);
  } catch (err) {
    console.error('Lỗi lấy danh sách đổi ca:', err);
    return [];
  }
}

export async function addShiftSwap(swap) {
  const row = {
    week_date: swap.week,
    store: swap.store || '',
    from_emp_id: swap.fromEmpId,
    from_emp_name: swap.fromEmpName || '',
    from_day: swap.fromDay,
    from_shift: swap.fromShift || '',
    to_emp_id: swap.toEmpId,
    to_emp_name: swap.toEmpName || '',
    to_day: swap.toDay,
    to_shift: swap.toShift || '',
    reason: swap.reason || '',
    status: swap.status || 'pending_partner'
  };

  const { data, error } = await db().from('shift_swaps').insert([row]).select().single();
  if (error) throw error;
  return mapShiftSwap(data);
}

export async function updateShiftSwap(id, updates) {
  const payload = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.managerNote !== undefined) payload.manager_note = updates.managerNote;
  if (updates.resolvedAt !== undefined) payload.resolved_at = updates.resolvedAt;

  const { data, error } = await db().from('shift_swaps').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return mapShiftSwap(data);
}

