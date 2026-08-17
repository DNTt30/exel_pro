import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';
import { SHIFTS } from '../../data/initialData';
import { WEEK_DAYS } from '../../data/constants';
import { isShiftsOverlapping, normalizeShift } from '../../utils/shiftHelper';

export default function TransferModal({ isOpen, onClose }) {
  const { employees, stores, schedule, updateShift, currentWeek, user } = useStore();
  const weekSched = schedule[currentWeek] || {};
  const isAdmin = user?.role === 'admin';
  const isManager = user?.isManager;
  
  const [sourceStore, setSourceStore] = useState(isAdmin ? '' : user?.dept);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [targetStore, setTargetStore] = useState('');
  
  // Ca làm việc & Ngày
  const [targetDay, setTargetDay] = useState('T2');
  const [targetShift, setTargetShift] = useState('6-14');
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !isAdmin && isManager) {
      setSourceStore(user.dept);
    }
  }, [isOpen, isAdmin, isManager, user?.dept]);

  // Lấy danh sách nhân viên của cửa hàng nguồn
  const sourceEmployees = useMemo(() => {
    if (!sourceStore) return [];
    return employees.filter(e => e.dept === sourceStore);
  }, [employees, sourceStore]);

  const selectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId);
  }, [employees, selectedEmpId]);

  const handleTransfer = async () => {
    if (!selectedEmpId || !targetStore) {
      return alert('Vui lòng chọn nhân viên và cửa hàng đích');
    }
    if (targetStore === sourceStore) {
      return alert('Cửa hàng đích phải khác cửa hàng gốc của nhân viên');
    }

    // 1. Kiểm tra chống trùng ca chéo cửa hàng (LOGIC-01)
    const existingRaw = weekSched[selectedEmpId]?.[targetDay];
    if (existingRaw) {
      const { shift: existingShift } = normalizeShift(existingRaw);
      if (existingShift && existingShift !== 'off') {
        if (isShiftsOverlapping(existingShift, targetShift)) {
          return alert(
            `❌ Xung đột giờ làm: Nhân viên "${selectedEmp?.name || selectedEmpId}" đã được xếp ca "${existingShift}" vào ngày ${targetDay}. Ca chi viện "${targetShift}" bị trùng khung thời gian!`
          );
        }
      }
    }

    setLoading(true);
    try {
      // Lưu object ca chi viện có trường covering_store riêng biệt
      const shiftPayload = {
        shift: targetShift || '6-14',
        covering_store: targetStore
      };

      await updateShift(currentWeek, selectedEmpId, targetDay, shiftPayload);
      
      onClose();
      // Reset state
      if (isAdmin) setSourceStore('');
      setSelectedEmpId('');
      setTargetStore('');
      setTargetShift('6-14');
    } catch (e) {
      alert('Lỗi khi điều chuyển nhân sự: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Điều chuyển / Mượn nhân sự" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        {/* 1. Chọn cửa hàng nguồn */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">1. Từ Cửa hàng (Nguồn)</label>
          <select 
            className="w-full p-2 border border-slate-300 rounded-lg bg-white" 
            value={sourceStore} 
            onChange={e => {
              setSourceStore(e.target.value);
              setSelectedEmpId('');
            }}
            disabled={!isAdmin}
          >
            <option value="">-- Chọn cửa hàng nguồn --</option>
            {stores.map(st => <option key={st.id} value={st.id}>{st.id} - {st.name}</option>)}
          </select>
        </div>

        {/* 2. Chọn Nhân viên */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">2. Chọn Nhân viên</label>
          <select 
            className="w-full p-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100" 
            value={selectedEmpId} 
            onChange={e => setSelectedEmpId(e.target.value)}
            disabled={!sourceStore}
          >
            <option value="">-- Chọn nhân viên --</option>
            {sourceEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.id}) - {emp.type}</option>)}
          </select>
        </div>

        {/* 3. Chọn Cửa hàng đích */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-sm font-semibold text-slate-700 mb-1">3. Đến Cửa hàng (Chi viện / Đích)</label>
          <select 
            className="w-full p-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100" 
            value={targetStore} 
            onChange={e => setTargetStore(e.target.value)}
            disabled={!selectedEmpId}
          >
            <option value="">-- Chọn cửa hàng đích --</option>
            {stores.filter(st => st.id !== sourceStore).map(st => (
              <option key={st.id} value={st.id}>{st.id} - {st.name}</option>
            ))}
          </select>
        </div>

        {/* 4. Chọn Ngày & Ca làm việc */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Ngày làm</label>
            <select 
              className="w-full p-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100" 
              value={targetDay} 
              onChange={e => setTargetDay(e.target.value)}
              disabled={!selectedEmpId}
            >
              {WEEK_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Ca chi viện</label>
            <select 
              className="w-full p-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100" 
              value={targetShift} 
              onChange={e => setTargetShift(e.target.value)}
              disabled={!selectedEmpId}
            >
              {Object.entries(SHIFTS).filter(([code]) => code !== 'off').map(([code, info]) => (
                <option key={code} value={code}>
                  {code} ({info.hours}h)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-outline cursor-pointer">Hủy</button>
          <button 
            onClick={handleTransfer} 
            disabled={!selectedEmpId || !targetStore || loading} 
            className="btn bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Đang xử lý...' : 'Xác nhận Điều chuyển'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
