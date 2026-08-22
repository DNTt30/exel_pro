export const DEFAULT_NOTIFY_DAYS = 3;

export function daysUntil(dateStr, today = new Date()) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

/** HSD sớm nhất trong các date đã ghi (HSD 1 / HSD 2). */
export function nearestExpiryDate(...dates) {
  const valid = dates
    .map(d => (d == null ? '' : String(d).trim()))
    .filter(d => d && daysUntil(d) !== null);
  if (!valid.length) return '';
  return valid.sort((a, b) => a.localeCompare(b))[0];
}

export function itemNearestExpiry(item) {
  if (!item) return '';
  return nearestExpiryDate(item.expiryDate, item.expiryDate2);
}

export function expiryStatus(dateStr, notifyDays = DEFAULT_NOTIFY_DAYS, today) {
  const days = daysUntil(dateStr, today);
  if (days === null) return { key: 'none', days: null, label: 'Chưa ghi date' };
  if (days < 0) return { key: 'expired', days, label: `Quá hạn ${-days} ngày` };
  if (days === 0) return { key: 'today', days, label: 'Hết hạn hôm nay' };
  if (days <= notifyDays) return { key: 'soon', days, label: `Còn ${days} ngày` };
  return { key: 'ok', days, label: `Còn ${days} ngày` };
}

export function itemExpiryStatus(item, notifyDays = DEFAULT_NOTIFY_DAYS, today) {
  return expiryStatus(itemNearestExpiry(item), notifyDays, today);
}

export function isExpiryAlert(dateStr, notifyDays = DEFAULT_NOTIFY_DAYS, today) {
  const st = expiryStatus(dateStr, notifyDays, today);
  return st.key === 'expired' || st.key === 'today' || st.key === 'soon';
}

export function isItemExpiryAlert(item, notifyDays = DEFAULT_NOTIFY_DAYS, today) {
  return isExpiryAlert(itemNearestExpiry(item), notifyDays, today);
}

export function todayIso(today = new Date()) {
  const d = today instanceof Date ? today : new Date(today);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dueStatus(dueDate, hasItems, lastSaved, today = new Date()) {
  if (!dueDate) return { key: 'none', label: 'Chưa đặt hạn nộp' };
  const todayStr = todayIso(today);
  const days = Math.round((new Date(`${dueDate}T00:00:00`) - new Date(`${todayStr}T00:00:00`)) / 86400000);
  if (hasItems && lastSaved) {
    const savedDay = String(lastSaved).slice(0, 10);
    if (savedDay <= dueDate) return { key: 'done', label: `Đã nộp ${savedDay}` };
  }
  if (days < 0 && !hasItems) return { key: 'late', label: `Trễ hạn ${-days} ngày` };
  if (days < 0) return { key: 'late', label: 'Nộp sau hạn' };
  if (days === 0) return { key: 'today', label: 'Nộp hôm nay' };
  return { key: 'open', label: `Còn ${days} ngày để nộp` };
}

export function dueToneClass(key) {
  if (key === 'late') return 'text-red-700';
  if (key === 'done') return 'text-emerald-700';
  return 'text-slate-700';
}

export function expiryToneClass(key) {
  if (key === 'expired' || key === 'today') return 'bg-red-50 text-red-700 border-red-200';
  if (key === 'soon') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (key === 'ok') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-50 text-slate-500 border-slate-200';
}

export function emptyShelfItemRow() {
  return {
    key: 'n' + Date.now() + Math.random(),
    productName: '',
    sku: '',
    qty: '',
    expiryDate: '',
    expiryDate2: '',
    note: ''
  };
}

export function toShelfItemRow(item) {
  return {
    key: item.id,
    productName: item.productName,
    sku: item.sku || '',
    qty: item.qty,
    expiryDate: item.expiryDate || '',
    expiryDate2: item.expiryDate2 || '',
    note: item.note || ''
  };
}

export function itemsOfShelf(shelfItems, shelfId) {
  return (shelfItems || []).filter(i => i.shelfId === shelfId);
}

export function shelfCheckMeta(shelf, shelfItems, today) {
  const items = itemsOfShelf(shelfItems, shelf.id);
  const warn = items.filter(i => isItemExpiryAlert(i, shelf.notifyDays, today)).length;
  const lastSaved = items.reduce((m, i) => (!m || (i.updatedAt && i.updatedAt > m) ? i.updatedAt : m), '');
  return { items, warn, lastSaved, due: dueStatus(shelf.dueDate, items.length > 0, lastSaved, today) };
}

export function collectExpiryAlerts(shelves, shelfItems, today) {
  const list = [];
  (shelves || []).forEach(shelf => {
    itemsOfShelf(shelfItems, shelf.id).forEach(item => {
      if (isItemExpiryAlert(item, shelf.notifyDays, today)) {
        list.push({ shelf, item, st: itemExpiryStatus(item, shelf.notifyDays, today) });
      }
    });
  });
  list.sort((a, b) => (a.st.days ?? 99) - (b.st.days ?? 99));
  return list;
}
