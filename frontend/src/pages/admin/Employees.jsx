import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Plus, Edit2, Trash2, Save, X, Search } from 'lucide-react';

export default function Employees() {
  const { employees, stores, addEmployee, updateEmployee, deleteEmployee } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState({ id: '', name: '', dept: '', type: 'FULLTIME', role: 'STFT', maxH: 48 });

  const filteredEmps = useMemo(() => {
    if (!search) return employees;
    const s = search.toLowerCase();
    return employees.filter(e => e.name.toLowerCase().includes(s) || e.id.toLowerCase().includes(s));
  }, [employees, search]);

  const handleSaveAdd = async () => {
    if (!formData.id || !formData.name || !formData.dept) return alert('Vui lòng nhập đủ Mã, Tên và Chọn Cửa hàng');
    try {
      await addEmployee(formData);
      setIsAdding(false);
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateEmployee(editingId, formData);
      setEditingId(null);
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa nhân sự này?')) {
      try {
        await deleteEmployee(id);
      } catch (e) {
        alert('Lỗi: ' + e.message);
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Quản lý Nhân sự</h2>
          <p className="text-sm text-slate-500 mt-1">Thêm, sửa, điều chuyển nhân sự giữa các cửa hàng</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Tìm nhân viên..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button 
            onClick={() => { setIsAdding(true); setFormData({ id: '', name: '', dept: stores[0]?.id || '', type: 'FULLTIME', role: 'STFT', maxH: 48 }); }}
            className="btn btn-primary text-sm"
          >
            <Plus size={16} /> Thêm nhân sự
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 text-left border-y border-slate-200">
              <th className="p-3 text-sm font-semibold text-slate-600">Mã NV</th>
              <th className="p-3 text-sm font-semibold text-slate-600">Họ và tên</th>
              <th className="p-3 text-sm font-semibold text-slate-600">Cửa hàng (Phòng ban)</th>
              <th className="p-3 text-sm font-semibold text-slate-600">Loại/Vị trí</th>
              <th className="p-3 text-sm font-semibold text-slate-600">Max Giờ</th>
              <th className="p-3 text-sm font-semibold text-slate-600 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isAdding && (
              <tr className="border-b border-slate-100 bg-blue-50/50">
                <td className="p-2"><input type="text" className="w-full p-2 border rounded" placeholder="Mã NV" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} /></td>
                <td className="p-2"><input type="text" className="w-full p-2 border rounded" placeholder="Tên NV" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></td>
                <td className="p-2">
                  <select className="w-full p-2 border rounded" value={formData.dept} onChange={e => setFormData({...formData, dept: e.target.value})}>
                    <option value="">-- Chọn --</option>
                    {stores.map(st => <option key={st.id} value={st.id}>{st.id} - {st.name}</option>)}
                  </select>
                </td>
                <td className="p-2 flex gap-1">
                  <select className="w-1/2 p-2 border rounded" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="FULLTIME">FT</option>
                    <option value="PARTTIME">PT</option>
                  </select>
                  <input type="text" className="w-1/2 p-2 border rounded" placeholder="STFT, CSR..." value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                </td>
                <td className="p-2"><input type="number" className="w-16 p-2 border rounded" value={formData.maxH} onChange={e => setFormData({...formData, maxH: Number(e.target.value)})} /></td>
                <td className="p-2 text-right">
                  <button onClick={handleSaveAdd} className="text-emerald-600 p-2 hover:bg-emerald-50 rounded"><Save size={18} /></button>
                  <button onClick={() => setIsAdding(false)} className="text-slate-400 p-2 hover:bg-slate-100 rounded ml-1"><X size={18} /></button>
                </td>
              </tr>
            )}
            
            {filteredEmps.map(emp => (
              <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-3 font-mono font-bold text-slate-700">{emp.id}</td>
                <td className="p-3">
                  {editingId === emp.id ? (
                    <input type="text" className="w-full p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  ) : <span className="font-semibold text-slate-800">{emp.name}</span>}
                </td>
                <td className="p-3">
                  {editingId === emp.id ? (
                    <select className="w-full p-2 border rounded bg-yellow-50 border-yellow-300" value={formData.dept} onChange={e => setFormData({...formData, dept: e.target.value})}>
                      {stores.length === 0 && <option value={emp.dept}>{emp.dept}</option>}
                      {stores.map(st => <option key={st.id} value={st.id}>{st.id} - {st.name}</option>)}
                    </select>
                  ) : <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">{emp.dept}</span>}
                </td>
                <td className="p-3">
                  {editingId === emp.id ? (
                    <div className="flex gap-1">
                      <select className="w-1/2 p-2 border rounded" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                        <option value="FULLTIME">FT</option>
                        <option value="PARTTIME">PT</option>
                      </select>
                      <input type="text" className="w-1/2 p-2 border rounded" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                    </div>
                  ) : (
                    <div className="text-sm">
                      <span className="text-slate-500 mr-2">{emp.type === 'FULLTIME' ? 'FT' : 'PT'}</span>
                      <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-xs font-bold">{emp.role}</span>
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {editingId === emp.id ? (
                    <input type="number" className="w-16 p-2 border rounded" value={formData.maxH} onChange={e => setFormData({...formData, maxH: Number(e.target.value)})} />
                  ) : <span className="text-slate-500">{emp.maxH || 48}h</span>}
                </td>
                <td className="p-3 text-right">
                  {editingId === emp.id ? (
                    <>
                      <button onClick={handleSaveEdit} className="text-emerald-600 p-2 hover:bg-emerald-50 rounded" title="Lưu"><Save size={18} /></button>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 p-2 hover:bg-slate-100 rounded ml-1" title="Hủy"><X size={18} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(emp.id); setFormData(emp); }} className="text-orange-500 p-2 hover:bg-orange-50 rounded font-semibold text-xs border border-orange-200 mr-2" title="Điều chuyển cửa hàng">
                        Điều chuyển
                      </button>
                      <button onClick={() => { setEditingId(emp.id); setFormData(emp); }} className="text-blue-600 p-2 hover:bg-blue-50 rounded" title="Sửa thông tin"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(emp.id)} className="text-red-500 p-2 hover:bg-red-50 rounded ml-1" title="Xóa"><Trash2 size={16} /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
