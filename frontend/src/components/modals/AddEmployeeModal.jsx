import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';
import { MA_RE, STANDARD_ROLES } from '../../data/constants';
import { canPickStore, getUserDepts } from '../../lib/authSession';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '../../components/ui/toastStore';
import { employeeSchema } from '../../schemas/validationSchemas';

export default function AddEmployeeModal({ isOpen, onClose }) {
  const { stores, addEmployee, user } = useStore(useShallow((s) => ({ stores: s.stores, addEmployee: s.addEmployee, user: s.user })));
  const pickStore = canPickStore(user);
  const [formData, setFormData] = useState({ 
    id: '', 
    name: '', 
    dept: pickStore ? (stores[0]?.id || '') : (getUserDepts(user)[0] || ''), 
    role: 'STFT',
    type: 'STFT', 
    maxH: 48 
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ 
        ...prev, 
        dept: pickStore ? (stores[0]?.id || '') : (getUserDepts(user)[0] || '') 
      }));
    }
  }, [isOpen, pickStore, user, stores]);

  const handleRoleChange = (selectedRole) => {
    const roleInfo = STANDARD_ROLES.find(r => r.id === selectedRole) || { type: 'STFT', defaultMaxH: 48 };
    setFormData(prev => ({
      ...prev,
      role: selectedRole,
      type: roleInfo.type,
      maxH: roleInfo.defaultMaxH
    }));
  };

  const handleSave = async () => {
    const trimmedId = formData.id.trim();
    const trimmedName = formData.name.trim();

    const payload = {
      ...formData,
      id: trimmedId,
      name: trimmedName
    };

    const validation = employeeSchema.safeParse(payload);
    if (!validation.success) {
      return toast.error(validation.error.issues[0].message);
    }

    setLoading(true);
    try {
      const result = await addEmployee(validation.data);
      if (result?.provisionWarning) {
        toast.info(result.provisionWarning);
      }
      onClose();
      setFormData({ 
        id: '', 
        name: '', 
        dept: pickStore ? (stores[0]?.id || '') : (getUserDepts(user)[0] || ''), 
        role: 'STFT',
        type: 'STFT', 
        maxH: 48 
      });
    } catch (e) {
      toast.error('Lỗi khi thêm nhân sự: ' + e.message);
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
            disabled={!pickStore}
            className="w-full p-2 border border-slate-300 rounded-lg disabled:bg-slate-100" 
            value={formData.dept} 
            onChange={e => setFormData({ ...formData, dept: e.target.value })}
          >
            {stores.map(st => <option key={st.id} value={st.id}>{st.id} - {st.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Vị trí / Chức vụ</label>
          <select 
            className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-800" 
            value={formData.role} 
            onChange={e => handleRoleChange(e.target.value)}
          >
            {STANDARD_ROLES.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Định mức giờ tối đa/tuần</label>
          <input 
            type="number" 
            className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold" 
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
