import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';
import { MA_RE, EMPLOYEE_TYPES } from '../../data/constants';

export default function AddEmployeeModal({ isOpen, onClose }) {
  const { stores, addEmployee, user } = useStore();
  const isAdmin = user?.role === 'admin';
  const [formData, setFormData] = useState({ 
    id: '', 
    name: '', 
    dept: isAdmin ? (stores[0]?.id || '') : (user?.dept || ''), 
    type: EMPLOYEE_TYPES.STFT, 
    role: 'STFT', 
    maxH: 48 
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ 
        ...prev, 
        dept: isAdmin ? (stores[0]?.id || '') : (user?.dept || '') 
      }));
    }
  }, [isOpen, isAdmin, user?.dept, stores]);

  const handleSave = async () => {
    const trimmedId = formData.id.trim();
    const trimmedName = formData.name.trim();

    if (!trimmedId || !trimmedName || !formData.dept) {
      return alert('Vui lòng nhập đủ thông tin bắt buộc (*)');
    }

    // Validate mã nhân viên đúng 9 chữ số theo regex MA_RE
    if (!MA_RE.test(trimmedId)) {
      return alert('Mã nhân viên không hợp lệ! Mã phải bao gồm đúng 9 chữ số (Ví dụ: 260512008).');
    }

    setLoading(true);
    try {
      await addEmployee({
        ...formData,
        id: trimmedId,
        name: trimmedName
      });
      onClose();
      setFormData({ 
        id: '', 
        name: '', 
        dept: isAdmin ? (stores[0]?.id || '') : (user?.dept || ''), 
        type: EMPLOYEE_TYPES.STFT, 
        role: 'STFT', 
        maxH: 48 
      });
    } catch (e) {
      alert('Lỗi khi thêm nhân sự: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Thêm Nhân Sự Mới" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Mã Nhân viên (9 chữ số) *</label>
          <input 
            type="text" 
            maxLength={9}
            className="w-full p-2 border border-slate-300 rounded-lg font-mono" 
            placeholder="Ví dụ: 260512008" 
            value={formData.id} 
            onChange={e => setFormData({ ...formData, id: e.target.value.replace(/\D/g, '') })} 
          />
          <span className="text-[11px] text-slate-400 mt-0.5 block">Định dạng chuẩn: 9 chữ số liên tiếp</span>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Họ và tên *</label>
          <input 
            type="text" 
            className="w-full p-2 border border-slate-300 rounded-lg" 
            placeholder="NGUYỄN VĂN A" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })} 
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Cửa hàng làm việc *</label>
          <select 
            disabled={!isAdmin}
            className="w-full p-2 border border-slate-300 rounded-lg disabled:bg-slate-100" 
            value={formData.dept} 
            onChange={e => setFormData({ ...formData, dept: e.target.value })}
          >
            {stores.map(st => <option key={st.id} value={st.id}>{st.id} - {st.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Loại hình & Vị trí làm việc</label>
          <select 
            className="w-full p-2 border border-slate-300 rounded-lg" 
            value={formData.type} 
            onChange={e => {
              const selectedType = e.target.value;
              let defaultRole = selectedType;
              let defaultMaxH = 48;
              if (selectedType === EMPLOYEE_TYPES.STPT) defaultMaxH = 23;
              setFormData({ ...formData, type: selectedType, role: defaultRole, maxH: defaultMaxH });
            }}
          >
            <option value={EMPLOYEE_TYPES.STFT}>STFT (Nhân viên Full-time)</option>
            <option value={EMPLOYEE_TYPES.STPT}>STPT (Nhân viên Part-time)</option>
            <option value={EMPLOYEE_TYPES.CSR_NEW}>CSR_NEW (Chăm sóc khách hàng mới)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Định mức giờ tối đa/tuần</label>
          <input 
            type="number" 
            className="w-full p-2 border border-slate-300 rounded-lg" 
            value={formData.maxH} 
            onChange={e => setFormData({ ...formData, maxH: Number(e.target.value) })} 
          />
        </div>
        
        <div className="pt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-outline cursor-pointer">Hủy</button>
          <button onClick={handleSave} disabled={loading} className="btn btn-primary cursor-pointer">
            {loading ? 'Đang lưu...' : 'Lưu nhân sự'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
