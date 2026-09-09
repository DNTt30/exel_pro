import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStore } from 'zustand';
import { createEmployeeSlice } from '../store/slices/employeeSlice';
import { createAdminSlice } from '../store/slices/adminSlice';
import { createScheduleSlice } from '../store/slices/scheduleSlice';
import { createShelfSlice } from '../store/slices/shelfSlice';
import { createAuthSlice } from '../store/slices/authSlice';

// Mock API layer
vi.mock('../services/api', () => {
  let mockDb = {
    employees: [],
    stores: [],
    schedules: {},
    scheduleWeeks: {},
    shelves: [],
    shelfItems: [],
    feedbacks: [],
    shiftSwaps: [],
    attendance: [],
    adminLogs: []
  };

  return {
    _resetDb: () => {
      mockDb = {
        employees: [],
        stores: [],
        schedules: {},
        scheduleWeeks: {},
        shelves: [],
        shelfItems: [],
        feedbacks: [],
        shiftSwaps: [],
        attendance: [],
        adminLogs: []
      };
    },
    _getDb: () => mockDb,
    // Employees
    getEmployees: vi.fn(async () => [...mockDb.employees]),
    getEmployeeById: vi.fn(async (id) => mockDb.employees.find(e => e.id === id) || null),
    addEmployee: vi.fn(async (emp) => {
      if (mockDb.employees.some(e => e.id === emp.id)) throw new Error('Duplicate employee');
      mockDb.employees.push({ ...emp });
      return emp;
    }),
    updateEmployeeInfo: vi.fn(async (id, updates) => {
      const idx = mockDb.employees.findIndex(e => e.id === id);
      if (idx === -1) throw new Error('Employee not found');
      mockDb.employees[idx] = { ...mockDb.employees[idx], ...updates };
      return mockDb.employees[idx];
    }),
    deleteEmployeeData: vi.fn(async (id) => {
      mockDb.employees = mockDb.employees.filter(e => e.id !== id);
    }),
    // Stores
    getStores: vi.fn(async () => [...mockDb.stores]),
    addStore: vi.fn(async (st) => {
      if (mockDb.stores.some(s => s.id === st.id)) throw new Error('Duplicate store');
      mockDb.stores.push({ ...st });
      return st;
    }),
    updateStore: vi.fn(async (id, updates) => {
      const idx = mockDb.stores.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Store not found');
      mockDb.stores[idx] = { ...mockDb.stores[idx], ...updates };
      return mockDb.stores[idx];
    }),
    deleteStore: vi.fn(async (id) => {
      mockDb.stores = mockDb.stores.filter(s => s.id !== id);
    }),
    // Schedules
    getSchedulesByWeek: vi.fn(async (week) => mockDb.schedules[week] || {}),
    getSchedulesByWeeks: vi.fn(async (weeks) => {
      const res = {};
      weeks.forEach(w => { res[w] = mockDb.schedules[w] || {}; });
      return res;
    }),
    saveEmployeeSchedule: vi.fn(async (week, empId, shifts) => {
      if (!mockDb.schedules[week]) mockDb.schedules[week] = {};
      mockDb.schedules[week][empId] = { ...shifts };
    }),
    saveBulkEmployeeSchedules: vi.fn(async (week, map) => {
      if (!mockDb.schedules[week]) mockDb.schedules[week] = {};
      Object.entries(map).forEach(([empId, shifts]) => {
        mockDb.schedules[week][empId] = { ...shifts };
      });
    }),
    // Schedule Weeks
    getScheduleWeeks: vi.fn(async () => Object.values(mockDb.scheduleWeeks)),
    upsertScheduleWeek: vi.fn(async (row) => {
      const key = `${row.storeId || row.store_id}:${row.weekDate || row.week_date}`;
      mockDb.scheduleWeeks[key] = { ...row, id: key };
      return mockDb.scheduleWeeks[key];
    }),
    // Shelves
    getShelves: vi.fn(async () => [...mockDb.shelves]),
    getShelfItems: vi.fn(async () => [...mockDb.shelfItems]),
    saveShelf: vi.fn(async (shelf) => {
      const id = shelf.id || `shelf_${Date.now()}`;
      const saved = { ...shelf, id };
      const idx = mockDb.shelves.findIndex(s => s.id === id);
      if (idx >= 0) mockDb.shelves[idx] = saved;
      else mockDb.shelves.push(saved);
      return saved;
    }),
    deleteShelf: vi.fn(async (id) => {
      mockDb.shelves = mockDb.shelves.filter(s => s.id !== id);
      mockDb.shelfItems = mockDb.shelfItems.filter(i => i.shelfId !== id);
    }),
    replaceShelfItems: vi.fn(async (shelfId, storeId, rows, empId) => {
      mockDb.shelfItems = mockDb.shelfItems.filter(i => i.shelfId !== shelfId);
      const inserted = (rows || []).map((r, i) => ({
        id: `item_${shelfId}_${i}`,
        shelfId,
        storeId,
        productName: r.productName,
        sku: r.sku || '',
        qty: r.qty ?? null,
        expiryDate: r.expiryDate || '',
        note: r.note || '',
        updatedBy: empId
      }));
      mockDb.shelfItems.push(...inserted);
      return inserted;
    }),
    // Feedbacks
    getFeedbacks: vi.fn(async () => [...mockDb.feedbacks]),
    addFeedback: vi.fn(async (fb) => {
      const id = `fb_${Date.now()}_${Math.random()}`;
      const saved = { ...fb, id, status: fb.status || 'pending', createdAt: new Date().toISOString() };
      mockDb.feedbacks.unshift(saved);
      return saved;
    }),
    updateFeedback: vi.fn(async (id, status, resolutionNote = '') => {
      const fb = mockDb.feedbacks.find(f => f.id === id);
      if (fb) {
        fb.status = status;
        fb.resolutionNote = resolutionNote;
      }
    }),
    deleteFeedback: vi.fn(async (id) => {
      mockDb.feedbacks = mockDb.feedbacks.filter(f => f.id !== id);
    }),
    // Shift Swaps
    getShiftSwaps: vi.fn(async () => [...mockDb.shiftSwaps]),
    addShiftSwap: vi.fn(async (swap) => {
      const id = `swap_${Date.now()}_${Math.random()}`;
      const saved = { ...swap, id, status: swap.status || 'pending_partner' };
      mockDb.shiftSwaps.unshift(saved);
      return saved;
    }),
    updateShiftSwap: vi.fn(async (id, updates) => {
      const swap = mockDb.shiftSwaps.find(s => s.id === id);
      if (swap) Object.assign(swap, updates);
      return swap;
    }),
    deleteShiftSwap: vi.fn(async (id) => {
      mockDb.shiftSwaps = mockDb.shiftSwaps.filter(s => s.id !== id);
    }),
    // Attendance
    getAttendanceRange: vi.fn(async (_from, _to) => mockDb.attendance),
    upsertAttendanceRows: vi.fn(async (rows) => {
      rows.forEach(r => {
        const idx = mockDb.attendance.findIndex(a => a.empId === r.empId && a.workDate === r.workDate);
        if (idx >= 0) mockDb.attendance[idx] = { ...mockDb.attendance[idx], ...r };
        else mockDb.attendance.push({ ...r });
      });
    }),
    // Logs
    getActivityLogs: vi.fn(async () => []),
    getAuditLogs: vi.fn(async () => []),
    getAiConversations: vi.fn(async () => []),
    getAdminLogs: vi.fn(async () => []),
    addActivityLog: vi.fn(async (l) => ({ id: 'act_' + Date.now(), ...l })),
    addAuditLog: vi.fn(async (l) => ({ id: 'aud_' + Date.now(), ...l })),
    addAdminLog: vi.fn(async (l) => ({ id: 'adm_' + Date.now(), ...l })),
    addAiConversation: vi.fn(async (l) => ({ id: 'ai_' + Date.now(), ...l }))
  };
});

describe('COMPREHENSIVE CRUD TEST SUITE FOR GS25 SCHEDULE APP', () => {
  let store;
  let api;

  beforeEach(async () => {
    api = await import('../services/api');
    api._resetDb();

    // Create a standalone Zustand store with all slices
    store = createStore((set, get) => ({
      ...createAuthSlice(set, get),
      ...createEmployeeSlice(set, get),
      ...createAdminSlice(set, get),
      ...createScheduleSlice(set, get),
      ...createShelfSlice(set, get)
    }));
  });

  // =========================================================================
  // 1. EMPLOYEES CRUD
  // =========================================================================
  describe('1. Employees (Nhân viên) CRUD', () => {
    beforeEach(() => {
      store.setState({
        user: { id: 'admin', role: 'admin', name: 'Quản trị viên' }
      });
    });

    it('CREATE: thêm nhân viên mới thành công vào store và DB', async () => {
      const newEmp = {
        id: '260512001',
        name: 'Nguyễn Văn Test',
        dept: 'VN0485',
        role: 'STFT',
        type: 'STFT',
        maxH: 48
      };

      const res = await store.getState().addEmployee(newEmp);
      expect(res.ok).toBe(true);

      const stateEmps = store.getState().employees;
      expect(stateEmps).toHaveLength(1);
      expect(stateEmps[0].id).toBe('260512001');
      expect(stateEmps[0].name).toBe('Nguyễn Văn Test');
      expect(api._getDb().employees).toHaveLength(1);
    });

    it('READ: lấy danh sách nhân viên từ store', async () => {
      store.setState({
        employees: [
          { id: '260512001', name: 'A', dept: 'VN0485' },
          { id: '260512002', name: 'B', dept: 'VN0497' }
        ]
      });

      const emps = store.getState().employees;
      expect(emps).toHaveLength(2);
      expect(emps.find(e => e.id === '260512002').dept).toBe('VN0497');
    });

    it('UPDATE: cập nhật thông tin nhân viên', async () => {
      store.setState({
        employees: [{ id: '260512001', name: 'A', dept: 'VN0485', role: 'STFT', maxH: 48 }]
      });
      api._getDb().employees.push({ id: '260512001', name: 'A', dept: 'VN0485', role: 'STFT', maxH: 48 });

      await store.getState().updateEmployee('260512001', {
        name: 'Nguyễn Văn Đã Sửa',
        role: 'Cửa hàng phó',
        maxH: 48
      });

      const updated = store.getState().employees.find(e => e.id === '260512001');
      expect(updated.name).toBe('Nguyễn Văn Đã Sửa');
      expect(updated.role).toBe('Cửa hàng phó');
      expect(api._getDb().employees[0].name).toBe('Nguyễn Văn Đã Sửa');
    });

    it('DELETE: xóa nhân viên khỏi hệ thống', async () => {
      store.setState({
        employees: [{ id: '260512001', name: 'A', dept: 'VN0485' }]
      });
      api._getDb().employees.push({ id: '260512001', name: 'A', dept: 'VN0485' });

      await store.getState().deleteEmployee('260512001');

      expect(store.getState().employees).toHaveLength(0);
      expect(api._getDb().employees).toHaveLength(0);
    });

    it('GUARD: SM không được thêm/sửa/xóa nhân viên cửa hàng khác', async () => {
      store.setState({
        user: { id: 'sm_01', role: 'Cửa hàng trưởng', dept: 'VN0485', name: 'SM 485' },
        employees: [{ id: '260512009', name: 'NV Store Khác', dept: 'VN0497' }]
      });

      await expect(store.getState().addEmployee({
        id: '260512010',
        name: 'NV Mới',
        dept: 'VN0497',
        role: 'STFT',
        type: 'STFT',
        maxH: 48
      })).rejects.toThrow(/Nhân viên không thuộc cửa hàng quản lý/);

      await expect(store.getState().updateEmployee('260512009', {
        name: 'Hacker Name'
      })).rejects.toThrow(/Nhân viên không thuộc cửa hàng quản lý/);

      await expect(store.getState().deleteEmployee('260512009')).rejects.toThrow(/Nhân viên không thuộc cửa hàng quản lý/);
    });
  });

  // =========================================================================
  // 2. STORES CRUD
  // =========================================================================
  describe('2. Stores (Cửa hàng) CRUD', () => {
    beforeEach(() => {
      store.setState({
        user: { id: 'admin', role: 'admin', name: 'Quản trị viên' }
      });
    });

    it('CREATE: thêm cửa hàng mới thành công', async () => {
      const newStore = {
        id: 'VN0999',
        name: 'GS25 Test Store',
        region: 'Miền Bắc'
      };

      await store.getState().addStore(newStore);

      expect(store.getState().stores).toHaveLength(1);
      expect(store.getState().stores[0].id).toBe('VN0999');
      expect(api._getDb().stores).toHaveLength(1);
    });

    it('READ: lấy danh sách cửa hàng', async () => {
      store.setState({
        stores: [
          { id: 'VN0485', name: 'GS25 Trần Duy Hưng' },
          { id: 'VN0497', name: 'GS25 Láng Hạ' }
        ]
      });

      expect(store.getState().stores).toHaveLength(2);
    });

    it('UPDATE: cập nhật thông tin cửa hàng', async () => {
      store.setState({
        stores: [{ id: 'VN0485', name: 'GS25 Cũ', region: 'Miền Bắc' }]
      });
      api._getDb().stores.push({ id: 'VN0485', name: 'GS25 Cũ', region: 'Miền Bắc' });

      await store.getState().updateStore('VN0485', {
        name: 'GS25 Mới Siêu Đẹp'
      });

      expect(store.getState().stores[0].name).toBe('GS25 Mới Siêu Đẹp');
      expect(api._getDb().stores[0].name).toBe('GS25 Mới Siêu Đẹp');
    });

    it('DELETE: xóa cửa hàng thành công', async () => {
      store.setState({
        stores: [{ id: 'VN0999', name: 'Cần Xóa' }]
      });
      api._getDb().stores.push({ id: 'VN0999', name: 'Cần Xóa' });

      await store.getState().deleteStore('VN0999');

      expect(store.getState().stores).toHaveLength(0);
      expect(api._getDb().stores).toHaveLength(0);
    });

    it('GUARD: SM không được phép thêm hoặc xóa cửa hàng', async () => {
      store.setState({
        user: { id: 'sm_01', role: 'Cửa hàng trưởng', dept: 'VN0485' },
        stores: [{ id: 'VN0485', name: 'CH 485' }]
      });

      await expect(store.getState().addStore({ id: 'VN0111', name: 'CH Lậu' }))
        .rejects.toThrow(/Chỉ Admin mới được thêm hoặc xóa cửa hàng/);

      await expect(store.getState().deleteStore('VN0485'))
        .rejects.toThrow(/Chỉ Admin mới được thêm hoặc xóa cửa hàng/);
    });
  });

  // =========================================================================
  // 3. SCHEDULES & SHIFTS CRUD
  // =========================================================================
  describe('3. Schedules & Shifts (Lịch xếp ca) CRUD', () => {
    const WEEK = '2026-03-09';

    beforeEach(() => {
      store.setState({
        user: { id: 'admin', role: 'admin', name: 'Quản trị viên' },
        employees: [{ id: '260512001', dept: 'VN0485', name: 'NV 1' }],
        currentWeek: WEEK
      });
    });

    it('CREATE/UPDATE: xếp ca trực cho 1 ô lịch của nhân viên', async () => {
      await store.getState().updateShift(WEEK, '260512001', 'T2', '6-14');

      const sched = store.getState().schedule[WEEK];
      expect(sched['260512001']['T2']).toBe('6-14');
      expect(api._getDb().schedules[WEEK]['260512001']['T2']).toBe('6-14');
    });

    it('UPDATE WEEKLY: cập nhật trọn gói cả tuần cho nhân viên', async () => {
      const weeklyShifts = { T2: '6-14', T3: '14-22', T4: 'off', T5: '6-14', T6: '14-22', T7: 'off', CN: '6-14' };
      await store.getState().updateEmployeeWeeklyShifts(WEEK, '260512001', weeklyShifts);

      const saved = store.getState().schedule[WEEK]['260512001'];
      expect(saved.T2).toBe('6-14');
      expect(saved.T3).toBe('14-22');
      expect(saved.T4).toBe('off');
    });

    it('BULK UPDATE: nạp lịch hàng loạt cho nhiều nhân viên', async () => {
      const bulk = {
        '260512001': { T2: '6-14', T3: '6-14' },
        '260512002': { T2: '14-22', T3: '14-22' }
      };

      await store.getState().applyBulkSchedule(WEEK, bulk, 'VN0485');

      const sched = store.getState().schedule[WEEK];
      expect(sched['260512001'].T2).toBe('6-14');
      expect(sched['260512002'].T2).toBe('14-22');
    });

    it('DELETE/CLEAR: xóa ca làm việc bằng cách đặt ô thành trống hoặc off', async () => {
      await store.getState().updateShift(WEEK, '260512001', 'T2', '6-14');
      expect(store.getState().schedule[WEEK]['260512001']['T2']).toBe('6-14');

      // Clear ca
      await store.getState().updateShift(WEEK, '260512001', 'T2', '');
      expect(store.getState().schedule[WEEK]['260512001']['T2']).toBe('');
    });

    it('GUARD: không được sửa ca khi tuần đã được duyệt (approved) hoặc chờ duyệt (pending)', async () => {
      store.setState({
        scheduleWeeks: {
          'VN0485::2026-03-09': { status: 'approved' }
        }
      });

      await expect(store.getState().updateShift(WEEK, '260512001', 'T2', '6-14'))
        .rejects.toThrow(/Tuần đã duyệt/);
    });
  });

  // =========================================================================
  // 4. SCHEDULE WEEKS STATUS CRUD
  // =========================================================================
  describe('4. Schedule Weeks Status (Trạng thái duyệt tuần) CRUD', () => {
    const WEEK = '2026-03-09';
    const STORE = 'VN0485';

    it('CREATE & TRANSITION: SM gửi duyệt (pending) -> Admin duyệt (approved)', async () => {
      // SM gửi duyệt
      store.setState({
        user: { id: 'sm_01', role: 'Cửa hàng trưởng', dept: STORE, name: 'SM 485' }
      });

      const pendingWeek = await store.getState().saveWeekStatus({
        storeId: STORE,
        weekDate: WEEK,
        status: 'pending'
      });
      expect(pendingWeek.status).toBe('pending');

      // Admin duyệt
      store.setState({
        user: { id: 'admin', role: 'admin', name: 'Quản trị viên' }
      });

      const approvedWeek = await store.getState().saveWeekStatus({
        storeId: STORE,
        weekDate: WEEK,
        status: 'approved',
        reviewNote: 'Đã duyệt toàn bộ ca'
      });
      expect(approvedWeek.status).toBe('approved');
      expect(approvedWeek.reviewNote).toBe('Đã duyệt toàn bộ ca');
    });

    it('GUARD: Nhân viên thường không được gửi duyệt hoặc phê duyệt tuần', async () => {
      store.setState({
        user: { id: 'emp_01', role: 'STFT', dept: STORE }
      });

      await expect(store.getState().saveWeekStatus({
        storeId: STORE,
        weekDate: WEEK,
        status: 'pending'
      })).rejects.toThrow(/Chỉ SM gửi duyệt/);

      await expect(store.getState().saveWeekStatus({
        storeId: STORE,
        weekDate: WEEK,
        status: 'approved'
      })).rejects.toThrow(/Chỉ AM \/ Admin duyệt lịch/);
    });
  });

  // =========================================================================
  // 5. SHELF DATE / KỆ HÀNG CRUD
  // =========================================================================
  describe('5. Shelf Expiry (Quản lý hạn sử dụng - Kệ hàng) CRUD', () => {
    beforeEach(() => {
      store.setState({
        user: { id: 'admin', role: 'admin', name: 'Admin' }
      });
    });

    it('CREATE: tạo kệ hàng mới và giao cho nhân viên', async () => {
      const shelf = await store.getState().saveShelf({
        storeId: 'VN0485',
        code: 'KE-SNACK-01',
        name: 'Kệ Snack & Bánh kẹo',
        assigneeId: '260512001',
        dueDate: '2026-03-15',
        notifyDays: 3
      });

      expect(shelf.id).toBeDefined();
      expect(store.getState().shelves).toHaveLength(1);
      expect(store.getState().shelves[0].code).toBe('KE-SNACK-01');
    });

    it('UPDATE SHELF: sửa thông tin kệ hàng', async () => {
      store.setState({
        shelves: [{ id: 'shelf_1', storeId: 'VN0485', code: 'KE-01', name: 'Kệ Cũ', assigneeId: '260512001' }]
      });

      const updated = await store.getState().saveShelf({
        id: 'shelf_1',
        storeId: 'VN0485',
        code: 'KE-01',
        name: 'Kệ Đã Sửa',
        assigneeId: '260512002',
        dueDate: '2026-03-20'
      });

      expect(updated.name).toBe('Kệ Đã Sửa');
      expect(store.getState().shelves[0].name).toBe('Kệ Đã Sửa');
    });

    it('CREATE/UPDATE ITEMS: lưu danh sách sản phẩm và date hàng hóa trên kệ', async () => {
      store.setState({
        shelves: [{ id: 'shelf_1', storeId: 'VN0485', code: 'KE-01', name: 'Kệ 01', assigneeId: '260512001' }]
      });

      const items = [
        { productName: 'Bánh mì sandwich', qty: 10, expiryDate: '2026-03-12', note: 'Ca sáng' },
        { productName: 'Sữa chua Vinamilk', qty: 24, expiryDate: '2026-03-20', note: 'Ngăn mát' }
      ];

      const saved = await store.getState().saveShelfItems('shelf_1', items);
      expect(saved).toHaveLength(2);
      expect(store.getState().shelfItems).toHaveLength(2);
      expect(store.getState().shelfItems[0].productName).toBe('Bánh mì sandwich');
    });

    it('DELETE: xóa kệ hàng và toàn bộ sản phẩm của kệ đó', async () => {
      store.setState({
        shelves: [{ id: 'shelf_1', storeId: 'VN0485', code: 'KE-01' }],
        shelfItems: [{ id: 'item_1', shelfId: 'shelf_1', productName: 'Mì ly' }]
      });
      api._getDb().shelves.push({ id: 'shelf_1' });
      api._getDb().shelfItems.push({ id: 'item_1', shelfId: 'shelf_1' });

      await store.getState().deleteShelf('shelf_1');

      expect(store.getState().shelves).toHaveLength(0);
      expect(store.getState().shelfItems).toHaveLength(0);
    });

    it('GUARD: nhân viên không được tự ý xóa kệ', async () => {
      store.setState({
        user: { id: 'emp_01', role: 'STFT', dept: 'VN0485' },
        shelves: [{ id: 'shelf_1', storeId: 'VN0485' }]
      });

      await expect(store.getState().deleteShelf('shelf_1')).rejects.toThrow(/Chỉ SM\/admin được xóa kệ/);
    });
  });

  // =========================================================================
  // 6. FEEDBACKS / CÔNG BÙ CRUD
  // =========================================================================
  describe('6. Feedbacks / Bù công & Khiếu nại CRUD', () => {
    it('CREATE: nhân viên gửi đơn khiếu nại bù công', async () => {
      const fbData = {
        empId: '260512001',
        empName: 'Trần Văn A',
        dept: 'VN0485',
        date: '2026-03-09',
        shift: '6-14',
        hours: 8,
        reason: 'Quên quẹt vân tay vào ca sáng'
      };

      const created = await store.getState().addFeedback(fbData);
      expect(created.id).toBeDefined();
      expect(created.status).toBe('pending');
      expect(store.getState().feedbacks).toHaveLength(1);
    });

    it('READ: danh sách feedbacks trong store', () => {
      store.setState({
        feedbacks: [
          { id: 'fb_1', empId: '260512001', dept: 'VN0485', status: 'pending' },
          { id: 'fb_2', empId: '260512002', dept: 'VN0497', status: 'approved' }
        ]
      });

      expect(store.getState().feedbacks).toHaveLength(2);
    });

    it('UPDATE / RESOLVE: SM duyệt đơn bù công và tự động thêm ca vào lịch', async () => {
      store.setState({
        user: { id: 'sm_01', role: 'Cửa hàng trưởng', dept: 'VN0485', name: 'SM 485' },
        employees: [{ id: '260512001', dept: 'VN0485', name: 'NV 1' }],
        feedbacks: [{
          id: 'fb_1',
          empId: '260512001',
          empName: 'NV 1',
          dept: 'VN0485',
          date: '2026-03-09',
          status: 'pending'
        }]
      });

      await store.getState().resolveFeedback('fb_1', 'approved', 'Đồng ý bù công', {
        week: '2026-03-09',
        empId: '260512001',
        day: 'T2',
        shiftCode: '6-14'
      });

      const fb = store.getState().feedbacks.find(f => f.id === 'fb_1');
      expect(fb.status).toBe('approved');
      expect(fb.resolutionNote).toBe('Đồng ý bù công');

      // Tự động nạp ca vào lịch làm việc
      expect(store.getState().schedule['2026-03-09']['260512001']['T2']).toBe('6-14');
    });

    it('GUARD: nhân viên không được tự duyệt đơn của chính mình', async () => {
      store.setState({
        user: { id: '260512001', role: 'STFT', dept: 'VN0485' },
        feedbacks: [{
          id: 'fb_1',
          empId: '260512001',
          dept: 'VN0485',
          status: 'pending'
        }]
      });

      await expect(store.getState().resolveFeedback('fb_1', 'approved', 'Tự duyệt'))
        .rejects.toThrow(/Không có quyền quản lý nhân sự/);
    });

    it('DELETE: SM/Admin xóa đơn khiếu nại bù công', async () => {
      store.setState({
        user: { id: 'admin', role: 'admin', name: 'Admin' },
        feedbacks: [{
          id: 'fb_spam',
          empId: '260512001',
          dept: 'VN0485',
          status: 'pending'
        }]
      });
      api._getDb().feedbacks.push({ id: 'fb_spam' });

      await store.getState().deleteFeedback('fb_spam');

      expect(store.getState().feedbacks).toHaveLength(0);
      expect(api._getDb().feedbacks).toHaveLength(0);
    });
  });

  // =========================================================================
  // 7. SHIFT SWAPS (ĐỔI CA) CRUD
  // =========================================================================
  describe('7. Shift Swaps (Đổi ca) CRUD', () => {
    it('CREATE: nhân viên tạo yêu cầu đổi ca', async () => {
      const swapData = {
        week: '2026-03-09',
        store: 'VN0485',
        fromEmpId: '260512001',
        fromEmpName: 'NV 1',
        fromDay: 'T2',
        fromShift: '6-14',
        toEmpId: '260512002',
        toEmpName: 'NV 2',
        toDay: 'T3',
        toShift: '14-22',
        reason: 'Bận việc gia đình'
      };

      const created = await store.getState().addShiftSwap(swapData);
      expect(created.id).toBeDefined();
      expect(created.status).toBe('pending_partner');
      expect(store.getState().shiftSwaps).toHaveLength(1);
    });

    it('UPDATE (Partner agree -> pending_manager): Đồng nghiệp đồng ý đổi ca', async () => {
      store.setState({
        user: { id: '260512002', role: 'STFT', dept: 'VN0485' },
        shiftSwaps: [{
          id: 'swap_1',
          store: 'VN0485',
          fromEmpId: '260512001',
          toEmpId: '260512002',
          status: 'pending_partner'
        }]
      });

      await store.getState().respondShiftSwap('swap_1', 'pending_manager', 'Tôi đồng ý đổi');

      const swap = store.getState().shiftSwaps.find(s => s.id === 'swap_1');
      expect(swap.status).toBe('pending_manager');
    });

    it('UPDATE (Manager approve -> auto swap schedule): SM duyệt và tự động đổi 2 ca', async () => {
      const WEEK = '2026-03-09';
      store.setState({
        user: { id: 'sm_01', role: 'Cửa hàng trưởng', dept: 'VN0485', name: 'SM 485' },
        schedule: {
          [WEEK]: {
            '260512001': { T2: '6-14', T3: 'off' },
            '260512002': { T2: 'off', T3: '14-22' }
          }
        },
        shiftSwaps: [{
          id: 'swap_1',
          week: WEEK,
          store: 'VN0485',
          fromEmpId: '260512001',
          fromDay: 'T2',
          fromShift: '6-14',
          toEmpId: '260512002',
          toDay: 'T3',
          toShift: '14-22',
          status: 'pending_manager'
        }]
      });

      await store.getState().respondShiftSwap('swap_1', 'approved', 'SM đồng ý cho đổi ca');

      const swap = store.getState().shiftSwaps.find(s => s.id === 'swap_1');
      expect(swap.status).toBe('approved');

      // Ca làm việc đã được tự động hoán đổi!
      const sched = store.getState().schedule[WEEK];
      expect(sched['260512001'].T2).toBe('off');
      expect(sched['260512001'].T3).toBe('14-22');
      expect(sched['260512002'].T2).toBe('6-14');
      expect(sched['260512002'].T3).toBe('off');
    });

    it('UPDATE (Cancel by creator): Người tạo hủy đơn đổi ca', async () => {
      store.setState({
        user: { id: '260512001', role: 'STFT', dept: 'VN0485' },
        shiftSwaps: [{
          id: 'swap_c',
          fromEmpId: '260512001',
          toEmpId: '260512002',
          status: 'pending_partner'
        }]
      });

      await store.getState().respondShiftSwap('swap_c', 'cancelled', 'Người tạo hủy');
      const swap = store.getState().shiftSwaps.find(s => s.id === 'swap_c');
      expect(swap.status).toBe('cancelled');
    });

    it('GUARD: người ngoài không được hủy đơn đổi ca của người khác', async () => {
      store.setState({
        user: { id: '260512999', role: 'STFT', dept: 'VN0485' },
        shiftSwaps: [{
          id: 'swap_c',
          fromEmpId: '260512001',
          toEmpId: '260512002',
          status: 'pending_partner'
        }]
      });

      await expect(store.getState().respondShiftSwap('swap_c', 'cancelled', 'Hacker hủy'))
        .rejects.toThrow(/Chỉ người tạo yêu cầu hoặc Quản lý mới có quyền hủy đơn đổi ca/);
    });

    it('DELETE: xóa vĩnh viễn đơn đổi ca', async () => {
      store.setState({
        user: { id: '260512001', role: 'STFT', dept: 'VN0485' },
        shiftSwaps: [{
          id: 'swap_to_del',
          fromEmpId: '260512001',
          toEmpId: '260512002',
          status: 'cancelled'
        }]
      });
      api._getDb().shiftSwaps.push({ id: 'swap_to_del' });

      await store.getState().deleteShiftSwap('swap_to_del');

      expect(store.getState().shiftSwaps).toHaveLength(0);
      expect(api._getDb().shiftSwaps).toHaveLength(0);
    });
  });

  // =========================================================================
  // 8. TIMESHEET / ATTENDANCE CRUD
  // =========================================================================
  describe('8. Timesheet / Attendance (Bảng công ezHR9) CRUD', () => {
    it('CREATE / BULK IMPORT: nạp hàng loạt công thực tế từ file Excel ezHR9', async () => {
      const records = [
        { empId: '260512001', workDate: '2026-03-01', actualHours: 7.84, note: '6-14' },
        { empId: '260512001', workDate: '2026-03-02', actualHours: 8.00, note: '6-14' },
        { empId: '260512002', workDate: '2026-03-01', actualHours: 4.12, note: '18-22' }
      ];

      const count = await store.getState().applyBulkAttendance(records, 'SM 485');
      expect(count).toBe(3);

      const attendance = store.getState().attendance;
      expect(attendance['260512001|2026-03-01'].actualHours).toBe(7.84);
      expect(attendance['260512002|2026-03-01'].actualHours).toBe(4.12);
    });

    it('UPDATE: sửa thủ công 1 ô công thực tế', async () => {
      await store.getState().saveAttendanceCell('260512001', '2026-03-01', 8.0, 'SM 485', 'Đã điều chỉnh');

      const cell = store.getState().attendance['260512001|2026-03-01'];
      expect(cell.actualHours).toBe(8.0);
      expect(cell.note).toBe('Đã điều chỉnh');
    });

    it('DELETE / CLEAR: xóa công thực tế của một ô', async () => {
      // Đầu tiên lưu công
      await store.getState().saveAttendanceCell('260512001', '2026-03-01', 8.0, 'SM 485', 'Có công');
      expect(store.getState().attendance['260512001|2026-03-01']).toBeDefined();

      // Sau đó xóa (hours: null, note: '')
      await store.getState().saveAttendanceCell('260512001', '2026-03-01', null, 'SM 485', '');
      expect(store.getState().attendance['260512001|2026-03-01']).toBeUndefined();
    });
  });
});
