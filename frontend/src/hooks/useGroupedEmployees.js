import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { WEEK_DAYS } from '../data/constants';
import { getCoveringStore } from '../utils/shiftHelper';
import { canPickStore } from '../lib/authSession';
import { visibleDeptIds } from '../utils/dataScope';
import { useShallow } from 'zustand/react/shallow';

export function useGroupedEmployees(search, filterDept, filterRole, weekSchedule = null) {
  const { employees, user, stores } = useStore(useShallow((s) => ({ employees: s.employees, user: s.user, stores: s.stores })));
  const pickStore = canPickStore(user);

  const groupedEmps = useMemo(() => {
    let filtered = employees;
    
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(e => e.name.toLowerCase().includes(s) || e.id.toLowerCase().includes(s));
    }
    
    if (filterRole !== 'ALL') {
      filtered = filtered.filter(e => (e.role || e.type) === filterRole);
    }
    
    // SM nhieu cua hang: cho phep chuyen trong pham vi sm_id; mac dinh ve CH cua minh
    const allowed = new Set(visibleDeptIds(user, stores));
    const requested = filterDept && allowed.has(filterDept) ? filterDept : user?.dept;
    const effectiveFilterDept = pickStore ? filterDept : (requested || 'ALL');
    
    const groups = {};
    filtered.forEach(emp => {
      // 1. Thêm nhân viên vào cửa hàng gốc
      if (!groups[emp.dept]) groups[emp.dept] = [];
      groups[emp.dept].push({ ...emp, isBorrowedTo: null });

      // 2. Kiểm tra lịch xem có chi viện đến cửa hàng khác không
      if (weekSchedule) {
        const empSched = weekSchedule[emp.id] || {};
        const borrowedStores = new Set();

        WEEK_DAYS.forEach(d => {
          const s = empSched[d];
          const coveringStore = getCoveringStore(s);
          if (coveringStore && coveringStore !== emp.dept) {
            borrowedStores.add(coveringStore);
          }
        });
        
        // 3. Nhân bản nhân viên sang danh sách cửa hàng mượn (được đánh dấu isBorrowedTo)
        borrowedStores.forEach(st => {
          if (!groups[st]) groups[st] = [];
          groups[st].push({ ...emp, isBorrowedTo: st });
        });
      }
    });

    if (effectiveFilterDept && effectiveFilterDept !== 'ALL') {
      const filteredGroups = {};
      if (groups[effectiveFilterDept]) {
        filteredGroups[effectiveFilterDept] = groups[effectiveFilterDept];
      }
      return filteredGroups;
    }
    
    if (!pickStore) {
      const scoped = {};
      Object.keys(groups).forEach(k => { if (allowed.has(k)) scoped[k] = groups[k]; });
      return scoped;
    }
    return groups;
  }, [employees, search, filterDept, filterRole, pickStore, user?.dept, user, weekSchedule, stores]);

  return groupedEmps;
}