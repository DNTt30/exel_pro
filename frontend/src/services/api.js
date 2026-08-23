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
  // Bỏ chủ đích 2 cột tùy chọn — tiền tố _ để lint hiểu là cố ý
  const { staffing: _staffing, demand: _demand, ...rest } = payload;
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
function mapEmployee(e) {
  if (!e) return null;
  return {
    id: e.id,
    name: e.name,
    dept: e.dept,
    type: e.type,
    role: e.role,
    maxH: e.max_h
  };
}

export async function getEmployeeById(id) {
  if (!id) return null;
  const { data, error } = await db().from('employees').select('id,name,dept,type,role,max_h').eq('id', id).maybeSingle();
  if (error) {
    console.error('Lỗi lấy nhân viên:', error);
    return null;
  }
  return mapEmployee(data);
}

export async function getEmployees(opts = {}) {
  let q = db().from('employees').select('id,name,dept,type,role,max_h').order('dept', { ascending: true });
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
  
  const { error } = await db().from('employees').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteEmployeeData(id) {
  const { error } = await db().from('employees').delete().eq('id', id);
  if (error) throw error;
}

// Lấy lịch làm việc của 1 tuần
export async function getSchedulesByWeek(weekDate, opts = {}) {
  if (opts.empIds && opts.empIds.length === 0) return {};
  let q = db().from('schedules').select('emp_id,shifts').eq('week_date', weekDate);
  if (opts.empId) q = q.eq('emp_id', opts.empId);
  else if (opts.empIds?.length) q = q.in('emp_id', opts.empIds);
  const { data, error } = await q;
  if (error) {
    console.error('Lỗi lấy lịch làm việc:', error);
    return {};
  }
  
  const scheduleMap = {};
  (data || []).forEach(row => {
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
export async function getFeedbacks(opts = {}) {
  let q = db().from('feedbacks').select('*').order('created_at', { ascending: false }).limit(opts.limit || 200);
  if (opts.empId) q = q.eq('emp_id', opts.empId);
  else if (opts.dept) q = q.eq('dept', opts.dept);
  const { data, error } = await q;
  if (error) {
    console.error('Lỗi lấy danh sách feedback:', error);
    return [];
  }
  return (data || []).map(f => ({
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

function mapActivityLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    storeId: row.store_id || '',
    userId: row.user_id || '',
    action: row.action,
    category: row.category || 'activity',
    entityType: row.entity_type || '',
    entityId: row.entity_id || '',
    description: row.description || '',
    ipAddress: row.ip_address || '',
    userAgent: row.user_agent || '',
    metadata: row.metadata || null,
    createdAt: row.created_at
  };
}

function mapAuditLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    storeId: row.store_id || '',
    actorId: row.actor_id || '',
    action: row.action,
    resourceType: row.resource_type || '',
    resourceId: row.resource_id || '',
    oldData: row.old_data || null,
    newData: row.new_data || null,
    metadata: row.metadata || null,
    ipAddress: row.ip_address || '',
    userAgent: row.user_agent || '',
    createdAt: row.created_at
  };
}

function mapAiConversation(row) {
  if (!row) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    storeId: row.store_id || '',
    userId: row.user_id || '',
    userMessage: row.user_message || '',
    assistantResponse: row.assistant_response || '',
    intent: row.intent || '',
    model: row.model || '',
    tokensUsed: row.tokens_used,
    latencyMs: row.latency_ms,
    contextUsed: row.context_used || null,
    error: row.error || '',
    createdAt: row.created_at
  };
}

export async function addActivityLog(entry) {
  try {
    const { data, error } = await db().from('activity_logs').insert([{
      store_id: entry.storeId || null,
      user_id: entry.userId || null,
      action: entry.action,
      category: entry.category || 'activity',
      entity_type: entry.entityType || null,
      entity_id: entry.entityId || null,
      description: entry.description || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
      metadata: entry.metadata || null
    }]).select().single();
    if (error) {
      if (/does not exist|schema cache|relation/i.test(error.message || '')) return null;
      console.warn('activity_logs:', error.message);
      return null;
    }
    return mapActivityLog(data);
  } catch {
    return null;
  }
}

export async function addAuditLog(entry) {
  try {
    const { data, error } = await db().from('audit_logs').insert([{
      store_id: entry.storeId || null,
      actor_id: entry.actorId || null,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId || null,
      old_data: entry.oldData ?? null,
      new_data: entry.newData ?? null,
      metadata: entry.metadata || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null
    }]).select().single();
    if (error) {
      if (/does not exist|schema cache|relation/i.test(error.message || '')) return null;
      console.warn('audit_logs:', error.message);
      return null;
    }
    return mapAuditLog(data);
  } catch {
    return null;
  }
}

export async function addAiConversation(entry) {
  try {
    const { data, error } = await db().from('ai_conversations').insert([{
      conversation_id: entry.conversationId,
      store_id: entry.storeId || null,
      user_id: entry.userId || null,
      user_message: entry.userMessage || null,
      assistant_response: entry.assistantResponse || null,
      intent: entry.intent || null,
      model: entry.model || null,
      tokens_used: entry.tokensUsed ?? null,
      latency_ms: entry.latencyMs ?? null,
      context_used: entry.contextUsed || null,
      error: entry.error || null
    }]).select().single();
    if (error) {
      if (/does not exist|schema cache|relation/i.test(error.message || '')) return null;
      console.warn('ai_conversations:', error.message);
      return null;
    }
    return mapAiConversation(data);
  } catch {
    return null;
  }
}

export async function getActivityLogs(opts = {}) {
  try {
    let q = db().from('activity_logs').select('*').order('created_at', { ascending: false }).limit(opts.limit || 300);
    if (opts.storeId) q = q.eq('store_id', opts.storeId);
    if (opts.category) q = q.eq('category', opts.category);
    const { data, error } = await q;
    if (error) return [];
    return (data || []).map(mapActivityLog);
  } catch {
    return [];
  }
}

export async function getAuditLogs(opts = {}) {
  try {
    let q = db().from('audit_logs').select('*').order('created_at', { ascending: false }).limit(opts.limit || 300);
    if (opts.storeId) q = q.eq('store_id', opts.storeId);
    const { data, error } = await q;
    if (error) return [];
    return (data || []).map(mapAuditLog);
  } catch {
    return [];
  }
}

export async function getAiConversations(opts = {}) {
  try {
    let q = db().from('ai_conversations').select('*').order('created_at', { ascending: false }).limit(opts.limit || 200);
    if (opts.storeId) q = q.eq('store_id', opts.storeId);
    if (opts.userId) q = q.eq('user_id', opts.userId);
    const { data, error } = await q;
    if (error) return [];
    return (data || []).map(mapAiConversation);
  } catch {
    return [];
  }
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

export async function getShiftSwaps(opts = {}) {
  try {
    let q = db().from('shift_swaps').select('*').order('created_at', { ascending: false }).limit(opts.limit || 150);
    if (opts.empId) q = q.or(`from_emp_id.eq.${opts.empId},to_emp_id.eq.${opts.empId}`);
    else if (opts.store) q = q.eq('store', opts.store);
    const { data, error } = await q;
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

function isMissingTable(message) {
  return /does not exist|schema cache|relation/i.test(message || '');
}

function mapShelf(row) {
  if (!row) return null;
  return {
    id: row.id,
    storeId: row.store_id,
    code: row.code,
    name: row.name || '',
    assigneeId: row.assignee_id || '',
    notifyDays: row.notify_days == null ? 3 : Number(row.notify_days),
    dueDate: row.due_date || '',
    createdAt: row.created_at
  };
}

function mapShelfItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    shelfId: row.shelf_id,
    storeId: row.store_id,
    productName: row.product_name,
    sku: row.sku || '',
    qty: row.qty == null ? '' : row.qty,
    expiryDate: row.expiry_date || '',
    expiryDate2: row.expiry_date_2 || '',
    note: row.note || '',
    updatedBy: row.updated_by || '',
    updatedAt: row.updated_at
  };
}

export async function getShelves(opts = {}) {
  try {
    let q = db().from('store_shelves').select('*').order('code', { ascending: true });
    if (opts.assigneeId) q = q.eq('assignee_id', opts.assigneeId);
    else if (opts.storeId) q = q.eq('store_id', opts.storeId);
    const { data, error } = await q;
    if (error) {
      if (isMissingTable(error.message)) return [];
      console.error('Lỗi lấy kệ:', error);
      return [];
    }
    return (data || []).map(mapShelf);
  } catch (err) {
    console.error('Lỗi lấy kệ:', err);
    return [];
  }
}

export async function getShelfItems(opts = {}) {
  try {
    if (opts.shelfIds && opts.shelfIds.length === 0) return [];
    let q = db().from('shelf_items').select('*').order('product_name', { ascending: true });
    if (opts.storeId) q = q.eq('store_id', opts.storeId);
    else if (opts.shelfIds?.length) q = q.in('shelf_id', opts.shelfIds);
    const { data, error } = await q;
    if (error) {
      if (isMissingTable(error.message)) return [];
      console.error('Lỗi lấy hàng kệ:', error);
      return [];
    }
    return (data || []).map(mapShelfItem);
  } catch (err) {
    console.error('Lỗi lấy hàng kệ:', err);
    return [];
  }
}

export async function saveShelf(shelf) {
  const row = {
    store_id: shelf.storeId,
    code: shelf.code,
    name: shelf.name || '',
    assignee_id: shelf.assigneeId || null,
    notify_days: shelf.notifyDays == null ? 3 : Number(shelf.notifyDays),
    due_date: shelf.dueDate || null
  };
  if (shelf.id) {
    const { data, error } = await db().from('store_shelves').update(row).eq('id', shelf.id).select().single();
    if (error) {
      if (/due_date|schema cache|column/i.test(error.message || '')) {
        const { due_date: _due_date, ...rest } = row;
        const retry = await db().from('store_shelves').update(rest).eq('id', shelf.id).select().single();
        if (retry.error) throw retry.error;
        return mapShelf({ ...retry.data, due_date: shelf.dueDate || '' });
      }
      throw error;
    }
    return mapShelf(data);
  }
  const { data, error } = await db().from('store_shelves').insert([row]).select().single();
  if (error) {
    if (/due_date|schema cache|column/i.test(error.message || '')) {
      const { due_date: _due_date, ...rest } = row;
      const retry = await db().from('store_shelves').insert([rest]).select().single();
      if (retry.error) throw retry.error;
      return mapShelf({ ...retry.data, due_date: shelf.dueDate || '' });
    }
    throw error;
  }
  return mapShelf(data);
}

export async function deleteShelf(id) {
  const { error } = await db().from('store_shelves').delete().eq('id', id);
  if (error) throw error;
}

export async function replaceShelfItems(shelfId, storeId, rows, empId) {
  // BUG-02 fix: backup dữ liệu cũ trước khi xóa để có thể phục hồi nếu insert thất bại
  const { data: backup } = await db().from('shelf_items').select('*').eq('shelf_id', shelfId);

  const { error: delErr } = await db().from('shelf_items').delete().eq('shelf_id', shelfId);
  if (delErr) throw delErr;

  const payload = (rows || [])
    .filter(r => String(r.productName || '').trim())
    .map(r => ({
      shelf_id: shelfId,
      store_id: storeId,
      product_name: String(r.productName).trim(),
      sku: String(r.sku || '').trim() || null,
      qty: r.qty === '' || r.qty == null ? null : Number(r.qty),
      expiry_date: r.expiryDate || null,
      expiry_date_2: r.expiryDate2 || null,
      note: r.note || '',
      updated_by: empId || null
    }));
  if (!payload.length) return [];

  const { data, error } = await db().from('shelf_items').insert(payload).select();
  if (error) {
    // Cố phục hồi dữ liệu cũ nếu insert thất bại
    if (backup?.length) {
      const restorePayload = backup.map(({ id: _id, ...rest }) => rest);
      await db().from('shelf_items').insert(restorePayload).select();
    }
    if (/sku|expiry_date_2|schema cache|column/i.test(error.message || '')) {
      const slim = payload.map(({ sku: _sku, expiry_date_2: _expiry_date2, ...rest }) => rest);
      const retry = await db().from('shelf_items').insert(slim).select();
      if (retry.error) throw retry.error;
      return (retry.data || []).map((row, i) => mapShelfItem({
        ...row,
        sku: payload[i]?.sku || row.sku,
        expiry_date_2: payload[i]?.expiry_date_2 || row.expiry_date_2
      }));
    }
    throw error;
  }
  return (data || []).map(mapShelfItem);
}

function mapScheduleWeek(row) {
  if (!row) return null;
  return {
    id: row.id,
    storeId: row.store_id,
    weekDate: row.week_date,
    status: row.status || 'draft',
    submittedBy: row.submitted_by || '',
    submittedAt: row.submitted_at || '',
    reviewedBy: row.reviewed_by || '',
    reviewedAt: row.reviewed_at || '',
    reviewNote: row.review_note || ''
  };
}

export async function getScheduleWeeks() {
  try {
    const { data, error } = await db().from('schedule_weeks').select('*').order('week_date', { ascending: false }).limit(250);
    if (error) {
      if (/does not exist|schema cache|relation/i.test(error.message || '')) return [];
      console.error('Lỗi lấy trạng thái tuần:', error);
      return [];
    }
    return (data || []).map(mapScheduleWeek);
  } catch {
    return [];
  }
}

export async function upsertScheduleWeek(row) {
  const payload = {
    store_id: row.storeId,
    week_date: row.weekDate,
    status: row.status || 'draft',
    submitted_by: row.submittedBy || null,
    submitted_at: row.submittedAt || null,
    reviewed_by: row.reviewedBy || null,
    reviewed_at: row.reviewedAt || null,
    review_note: row.reviewNote || null
  };
  const { data, error } = await db()
    .from('schedule_weeks')
    .upsert(payload, { onConflict: 'store_id,week_date' })
    .select()
    .single();
  if (error) throw error;
  return mapScheduleWeek(data);
}

