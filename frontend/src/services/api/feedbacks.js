import { db } from './client';

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
export async function updateFeedback(id, status, resolutionNote = '') {
  const updatePayload = { status };
  if (resolutionNote) updatePayload.resolution_note = resolutionNote;
  const { error } = await db().from('feedbacks').update(updatePayload).eq('id', id);
  if (error) throw error;
}

