import * as api from '../../services/api';
import { userIsManager } from '../guards';
import { describeDiff } from '../../utils/appLogs';

export const createShelfSlice = (set, get) => ({
  shelves: [],
  shelfItems: [],

  saveShelf: async (shelf) => {
    const user = get().user;
    if (!userIsManager(user) && user?.role !== 'admin') {
      throw new Error('Chỉ SM/admin được tạo hoặc giao kệ');
    }
    if (user?.role !== 'admin' && user?.dept && shelf.storeId && shelf.storeId !== user.dept) {
      throw new Error('Chỉ giao kệ cửa hàng mình');
    }
    const saved = await api.saveShelf(shelf);
    set((state) => {
      const exists = state.shelves.some(s => s.id === saved.id);
      return {
        shelves: exists
          ? state.shelves.map(s => s.id === saved.id ? saved : s)
          : [...state.shelves, saved]
      };
    });
    get().appendAdminLog(shelf.id ? 'UPDATE_SHELF' : 'CREATE_SHELF', saved.id, saved.code, {
      resourceType: 'shelf',
      resourceId: saved.id,
      storeId: saved.storeId || shelf.storeId || '',
      oldData: shelf.id ? { name: shelf.name, assigneeId: shelf.assigneeId, dueDate: shelf.dueDate } : null,
      newData: { name: saved.name, code: saved.code, assigneeId: saved.assigneeId, dueDate: saved.dueDate },
      description: shelf.id
        ? describeDiff({ name: shelf.name, assigneeId: shelf.assigneeId, dueDate: shelf.dueDate }, { name: saved.name, assigneeId: saved.assigneeId, dueDate: saved.dueDate })
        : `Giao kệ ${saved.name || saved.code} cho ${saved.assigneeId || '—'}`
    });
    return saved;
  },
  deleteShelf: async (id) => {
    if (!userIsManager(get().user) && get().user?.role !== 'admin') {
      throw new Error('Chỉ SM/admin được xóa kệ');
    }
    const prev = get().shelves.find(s => s.id === id);
    await api.deleteShelf(id);
    set((state) => ({
      shelves: state.shelves.filter(s => s.id !== id),
      shelfItems: state.shelfItems.filter(i => i.shelfId !== id)
    }));
    get().appendAdminLog('DELETE_SHELF', id, prev?.code || id, {
      resourceType: 'shelf',
      resourceId: id,
      storeId: prev?.storeId || get().user?.dept || '',
      oldData: prev ? { name: prev.name, code: prev.code, assigneeId: prev.assigneeId } : { id },
      newData: null,
      description: `Xóa kệ ${prev?.name || prev?.code || id}`
    });
  },
  saveShelfItems: async (shelfId, rows) => {
    const user = get().user;
    const shelf = get().shelves.find(s => s.id === shelfId);
    if (!shelf) throw new Error('Không tìm thấy kệ');
    const assigneeIds = (shelf.assigneeId || '').split(',').map(s => s.trim()).filter(Boolean);
    if (user?.role !== 'admin' && !userIsManager(user) && !assigneeIds.includes(user?.id)) {
      throw new Error('Bạn chỉ ghi date kệ được giao');
    }
    if (user?.role !== 'admin' && user?.dept && shelf.storeId !== user.dept) {
      throw new Error('Sai cửa hàng');
    }
    const prevItems = get().shelfItems.filter(i => i.shelfId === shelfId).map(i => ({
      productName: i.productName, sku: i.sku, qty: i.qty, expiryDate: i.expiryDate, expiryDate2: i.expiryDate2
    }));
    const saved = await api.replaceShelfItems(shelfId, shelf.storeId, rows, user?.id);
    set((state) => ({
      shelfItems: [
        ...state.shelfItems.filter(i => i.shelfId !== shelfId),
        ...saved
      ]
    }));
    const nextItems = saved.map(i => ({
      productName: i.productName, sku: i.sku, qty: i.qty, expiryDate: i.expiryDate, expiryDate2: i.expiryDate2
    }));
    get().appendAdminLog('UPDATE_SHELF_ITEMS', shelfId, `${saved.length} dòng`, {
      resourceType: 'inventory',
      resourceId: shelfId,
      storeId: shelf.storeId || '',
      oldData: { items: prevItems },
      newData: { items: nextItems },
      description: `Kệ ${shelf.name || shelf.code}: ${prevItems.length} dòng → ${nextItems.length} dòng`
    });
    return saved;
  }
});
