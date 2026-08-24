import { db } from './client';

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

