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
    
    // SM nhiều cửa hàng & Nhân viên cùng SM: cho phép chuyển hoặc xem 'ALL' trong phạm vi allowed; mặc định về CH của mình
    const allowed = new Set(visibleDeptIds(user, stores, employees));
    const requested = (filterDept === 'ALL' || (filterDept && allowed.has(filterDept))) ? filterDept : (user?.dept || 'ALL');
    const effectiveFilterDept = pickStore ? filterDept : (requested || 'ALL');
    
    const groups = {};
    filtered.forEach(emp => {
      // 1. Thêm nhân viên vào cửa hàng gốc
      if (!groups[emp.dept]) groups[emp.dept] = [];
      groups[emp.dept].push({ ...emp, isBorrowedTo: null });

      // 2. Chỉ kiểm tra mượn nhân sự KHI đang lọc một cửa hàng cụ thể (effectiveFilterDept !== 'ALL')
      // Khi đang xem 'Tất cả' (ALL), KHÔNG nhân bản nhân viên sang cửa hàng khác để tránh 1 nhân viên bị lặp lại ở 2-3 cửa hàng!
      if (weekSchedule && effectiveFilterDept && effectiveFilterDept !== 'ALL') {
        const empSched = weekSchedule[emp.id] || {};
        WEEK_DAYS.forEach(d => {
          const s = empSched[d];
          const coveringStore = getCoveringStore(s);
          if (coveringStore === effectiveFilterDept && emp.dept !== effectiveFilterDept) {
            if (!groups[effectiveFilterDept]) groups[effectiveFilterDept] = [];
            if (!groups[effectiveFilterDept].some(e => e.id === emp.id && e.isBorrowedTo === effectiveFilterDept)) {
              groups[effectiveFilterDept].push({ ...emp, isBorrowedTo: effectiveFilterDept });
            }
          }
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
  }, [employees, search, filterDept, filterRole, pickStore, user, weekSchedule, stores]);

  return groupedEmps;
}