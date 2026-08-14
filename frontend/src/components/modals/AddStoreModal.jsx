import React, { useState } from 'react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';

export default function AddStoreModal({ isOpen, onClose }) {
  const { addStore } = useStore();
  const [formData, setFormData] = useState({ id: '', name: '', region: 'Miền Bắc' });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!formData.id || !formData.name) return alert('Vui lòng nhập đủ Mã và Tên cửa hàng');
    setLoading(true);
    try {
      await addStore(formData);
      onClose();
      setFormData({ id: '', name: '', region: 'Miền Bắc' });
    } catch (e) {
      alert('Lỗi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Thêm Cửa hàng mới" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Mã Cửa hàng *</label>
          <input type="text" className="w-full p-2 border border-slate-300 rounded-lg" placeholder="VD: VN0485" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Tên Cửa hàng hiển thị *</label>
          <input type="text" className="w-full p-2 border border-slate-300 rounded-lg" placeholder="Nhập tên..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Khu vực</label>
          <select className="w-full p-2 border border-slate-300 rounded-lg" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})}>
            <option>Miền Bắc</option>
            <option>Miền Trung</option>
            <option>Miền Nam</option>
          </select>
        </div>
        
        <div className="pt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-outline">Hủy</button>
          <button onClick={handleSave} disabled={loading} className="btn btn-primary">{loading ? 'Đang lưu...' : 'Lưu cửa hàng'}</button>
        </div>
      </div>
    </Modal>
  );
}
