import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

export default function Stores() {
  const { stores, addStore, updateStore, deleteStore } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({ id: '', name: '', region: 'Miền Bắc' });

  const handleSaveAdd = async () => {
    if (!formData.id || !formData.name) return alert('Vui lòng nhập đủ Mã và Tên');
    try {
      await addStore(formData);
      setIsAdding(false);
      setFormData({ id: '', name: '', region: 'Miền Bắc' });
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateStore(editingId, { name: formData.name, region: formData.region });
      setEditingId(null);
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa cửa hàng này?')) {
      try {
        await deleteStore(id);
      } catch (e) {
        alert('Lỗi: ' + e.message);
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Quản lý Cửa hàng</h2>
          <p className="text-sm text-slate-500 mt-1">Quản lý danh sách các cửa hàng trong hệ thống</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setFormData({ id: '', name: '', region: 'Miền Bắc' }); }}
          className="btn btn-primary text-sm"
        >
          <Plus size={16} /> Thêm cửa hàng
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 text-left border-y border-slate-200">
              <th className="p-3 text-sm font-semibold text-slate-600">Mã Cửa hàng</th>
              <th className="p-3 text-sm font-semibold text-slate-600">Tên Cửa hàng</th>
              <th className="p-3 text-sm font-semibold text-slate-600">Khu vực</th>
              <th className="p-3 text-sm font-semibold text-slate-600 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isAdding && (
              <tr className="border-b border-slate-100 bg-blue-50/50">
                <td className="p-2"><input type="text" className="w-full p-2 border rounded" placeholder="VD: VN0485" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} /></td>
                <td className="p-2"><input type="text" className="w-full p-2 border rounded" placeholder="Tên hiển thị" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></td>
                <td className="p-2">
                  <select className="w-full p-2 border rounded" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})}>
                    <option>Miền Bắc</option>
                    <option>Miền Trung</option>
                    <option>Miền Nam</option>
                  </select>
                </td>
                <td className="p-2 text-right">
                  <button onClick={handleSaveAdd} className="text-emerald-600 p-2 hover:bg-emerald-50 rounded"><Save size={18} /></button>
                  <button onClick={() => setIsAdding(false)} className="text-slate-400 p-2 hover:bg-slate-100 rounded ml-1"><X size={18} /></button>
                </td>
              </tr>
            )}
            
            {stores.map(st => (
              <tr key={st.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-3 font-mono font-bold text-slate-700">{st.id}</td>
                <td className="p-3">
                  {editingId === st.id ? (
                    <input type="text" className="w-full p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  ) : st.name}
                </td>
                <td className="p-3">
                  {editingId === st.id ? (
                    <select className="w-full p-2 border rounded" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})}>
                      <option>Miền Bắc</option>
                      <option>Miền Trung</option>
                      <option>Miền Nam</option>
                    </select>
                  ) : <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">{st.region}</span>}
                </td>
                <td className="p-3 text-right">
                  {editingId === st.id ? (
                    <>
                      <button onClick={handleSaveEdit} className="text-emerald-600 p-2 hover:bg-emerald-50 rounded"><Save size={18} /></button>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 p-2 hover:bg-slate-100 rounded ml-1"><X size={18} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(st.id); setFormData(st); }} className="text-blue-600 p-2 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(st.id)} className="text-red-500 p-2 hover:bg-red-50 rounded ml-1"><Trash2 size={16} /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {stores.length === 0 && !isAdding && (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">Chưa có cửa hàng nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
