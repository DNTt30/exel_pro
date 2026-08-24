import { db } from './client';
import { normalizeStaffingConfig, normalizeStoreDemand } from '../../data/constants';

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
