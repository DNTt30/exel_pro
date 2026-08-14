import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';

export default function AddEmployeeModal({ isOpen, onClose }) {
  const { stores, addEmployee, user } = useStore();
  const isAdmin = user?.role === 'admin';
  const [formData, setFormData] = useState({ 
    id: '', 
    name: '', 
    dept: isAdmin ? (stores[0]?.id || '') : (user?.dept || ''), 
    type: 'FULLTIME', 
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
    if (!formData.id || !formData.name || !formData.dept) return alert('Vui lòng nhập đủ thông tin bắt buộc');
    setLoading(true);
    try {
      await addEmployee(formData);
      onClose();
      setFormData({ id: '', name: '', dept: isAdmin ? (stores[0]?.id || '') : (user?.dept || ''), type: 'FULLTIME', role: 'STFT', maxH: 48 });
    } catch (e) {
      alert('Lỗi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Thêm Nhân sự mới" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Mã Nhân viên *</label>
          <input type="text" className="w-full p-2 border border-slate-300 rounded-lg" placeholder="Nhập mã nhân viên..." value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Họ và tên *</label>
          <input type="text" className="w-full p-2 border border-slate-300 rounded-lg" placeholder="Nguyễn Văn A" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Cửa hàng làm việc *</label>
          <select 
            disabled={!isAdmin}
            className="w-full p-2 border border-slate-300 rounded-lg disabled:bg-slate-100" 
            value={formData.dept} 
            onChange={e => setFormData({...formData, dept: e.target.value})}
          >
            {stores.map(st => <option key={st.id} value={st.id}>{st.id} - {st.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Vị trí / Chức vụ</label>
          <select 
            className="w-full p-2 border border-slate-300 rounded-lg" 
            value={formData.role} 
            onChange={e => {
              const role = e.target.value;
              const type = role.includes('PT') ? 'PARTTIME' : 'FULLTIME';
              setFormData({...formData, role, type});
            }}
          >
            <option value="STFT">STFT (Nhân viên Full-time)</option>
            <option value="PT">PT (Nhân viên Part-time)</option>
            <option value="CSR">CSR (Chăm sóc khách hàng)</option>
            <option value="Cửa hàng trưởng">Cửa hàng trưởng</option>
            <option value="SM">SM (Quản lý khu vực)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Giờ tối đa/tuần</label>
          <input type="number" className="w-full p-2 border border-slate-300 rounded-lg" value={formData.maxH} onChange={e => setFormData({...formData, maxH: Number(e.target.value)})} />
        </div>
        
        <div className="pt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-outline">Hủy</button>
          <button onClick={handleSave} disabled={loading} className="btn btn-primary">{loading ? 'Đang lưu...' : 'Lưu nhân sự'}</button>
        </div>
      </div>
    </Modal>
  );
}
