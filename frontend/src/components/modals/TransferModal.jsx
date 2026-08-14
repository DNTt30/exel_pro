import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';
import { SHIFTS } from '../../data/initialData';

export default function TransferModal({ isOpen, onClose }) {
  const { employees, stores, updateShift, currentWeek, user } = useStore();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.isManager;
  
  const [sourceStore, setSourceStore] = useState(isAdmin ? '' : user?.dept);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [targetStore, setTargetStore] = useState('');
  
  // Ca làm việc & Ngày
  const [targetDay, setTargetDay] = useState('T2');
  const [targetShift, setTargetShift] = useState('');
  
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

  const handleTransfer = async () => {
    if (!selectedEmpId || !targetStore) return alert('Vui lòng chọn nhân viên và cửa hàng đích');
    setLoading(true);
    try {
      if (targetShift) {
        // Lưu ca làm việc kèm mã cửa hàng đích, VD: "6-14_VN0485"
        const shiftCode = `${targetShift}_${targetStore}`;
        await updateShift(currentWeek, selectedEmpId, targetDay, shiftCode);
      } else {
        // Mặc định lưu ca "mượn" rỗng nếu không nhập ca
        await updateShift(currentWeek, selectedEmpId, targetDay, `off_${targetStore}`);
      }
      
      onClose();
      // Reset state
      if (isAdmin) setSourceStore('');
      setSelectedEmpId('');
      setTargetStore('');
      setTargetShift('');
    } catch (e) {
      alert('Lỗi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Điều chuyển / Mượn nhân sự" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        {/* 1. Chọn cửa hàng nguồn */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">1. Từ Cửa hàng</label>
          <select 
            className="w-full p-2 border border-slate-300 rounded-lg bg-white" 
            value={sourceStore} 
            onChange={e => {
              setSourceStore(e.target.value);
              setSelectedEmpId(''); // reset nhân viên khi đổi cửa hàng
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
            {sourceEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>)}
          </select>
        </div>

        {/* 3. Chọn Cửa hàng đích */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-sm font-semibold text-slate-700 mb-1">3. Đến Cửa hàng (Đích)</label>
          <select 
            className="w-full p-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100" 
            value={targetStore} 
            onChange={e => setTargetStore(e.target.value)}
            disabled={!selectedEmpId}
          >
            <option value="">-- Chọn cửa hàng đích --</option>
            {stores.map(st => <option key={st.id} value={st.id}>{st.id} - {st.name}</option>)}
          </select>
        </div>

        {/* 4. Chọn Ca làm việc (Optional) */}
        <div className="flex gap-2">
          <div className="w-1/3">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Ngày làm</label>
            <select 
              className="w-full p-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100" 
              value={targetDay} 
              onChange={e => setTargetDay(e.target.value)}
              disabled={!selectedEmpId}
            >
              {['T2','T3','T4','T5','T6','T7','CN'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="w-2/3">
            <label className="block text-sm font-semibold text-slate-700 mb-1">4. Gán Ca làm việc</label>
            <input 
              type="text"
              list="shift-options"
              className="w-full p-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100" 
              placeholder="VD: 6-14, 14-22 (Bỏ trống nếu chưa xếp)"
              value={targetShift} 
              onChange={e => setTargetShift(e.target.value)}
              disabled={!selectedEmpId}
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-outline">Hủy</button>
          <button 
            onClick={handleTransfer} 
            disabled={!selectedEmpId || !targetStore || loading} 
            className="btn bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang xử lý...' : 'Xác nhận Điều chuyển'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
