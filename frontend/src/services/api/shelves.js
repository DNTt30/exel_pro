import { db } from './client';

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

