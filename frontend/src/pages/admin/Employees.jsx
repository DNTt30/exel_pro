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
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Quản lý Nhân sự</h2>
          <p className="text-xs text-slate-500 mt-0.5">Danh sách toàn bộ nhân viên ({filteredEmps.length} nhân sự)</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
            <input 
              type="text" 
              placeholder="Tìm theo tên hoặc mã..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs w-48 sm:w-64 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <button 
            onClick={() => { setIsAdding(true); setFormData({ id: '', name: '', dept: stores[0]?.id || '', type: 'FULLTIME', role: 'STFT', maxH: 48 }); }}
            className="btn btn-primary text-xs py-2 px-3 rounded-lg shadow-2xs font-bold whitespace-nowrap"
          >
            <Plus size={15} /> Thêm nhân sự
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-100/80 text-left border-b border-slate-200 sticky top-0 z-10 text-xs font-bold text-slate-600">
              <th className="p-3">Mã NV</th>
              <th className="p-3">Họ và tên</th>
              <th className="p-3">Cửa hàng (Phòng ban)</th>
              <th className="p-3">Loại / Vị trí</th>
              <th className="p-3">Max Giờ</th>
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {isAdding && (
              <tr className="bg-blue-50/70 border-b border-blue-100 animate-in fade-in duration-150">
                <td className="p-2.5"><input type="text" className="w-full p-1.5 border border-blue-300 rounded bg-white font-mono text-xs outline-none" placeholder="Mã NV" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} /></td>
                <td className="p-2.5"><input type="text" className="w-full p-1.5 border border-blue-300 rounded bg-white text-xs font-semibold outline-none" placeholder="Họ và tên" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></td>
                <td className="p-2.5">
                  <select className="w-full p-1.5 border border-blue-300 rounded bg-white text-xs outline-none font-medium" value={formData.dept} onChange={e => setFormData({...formData, dept: e.target.value})}>
                    <option value="">-- Chọn Cửa hàng --</option>
                    {stores.map(st => <option key={st.id} value={st.id}>{st.id} - {st.name}</option>)}
                  </select>
                </td>
                <td className="p-2.5 flex gap-1">
                  <select className="w-1/2 p-1.5 border border-blue-300 rounded bg-white text-xs outline-none font-medium" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="FULLTIME">FT</option>
                    <option value="PARTTIME">PT</option>
                  </select>
                  <input type="text" className="w-1/2 p-1.5 border border-blue-300 rounded bg-white text-xs outline-none" placeholder="STFT, CSR..." value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                </td>
                <td className="p-2.5"><input type="number" className="w-16 p-1.5 border border-blue-300 rounded bg-white text-xs outline-none" value={formData.maxH} onChange={e => setFormData({...formData, maxH: Number(e.target.value)})} /></td>
                <td className="p-2.5 text-right whitespace-nowrap">
                  <button onClick={handleSaveAdd} className="text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded font-bold mr-1" title="Lưu"><Save size={15} /></button>
                  <button onClick={() => setIsAdding(false)} className="text-slate-600 bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded font-bold" title="Hủy"><X size={15} /></button>
                </td>
              </tr>
            )}
            
            {filteredEmps.map(emp => (
              <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-mono font-bold text-slate-700">{emp.id}</td>
                <td className="p-3">
                  {editingId === emp.id ? (
                    <input type="text" className="w-full p-1.5 border border-blue-400 rounded bg-white text-xs font-bold outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  ) : <span className="font-bold text-slate-800">{emp.name}</span>}
                </td>
                <td className="p-3">
                  {editingId === emp.id ? (
                    <select className="w-full p-1.5 border border-blue-400 rounded bg-yellow-50 text-xs font-semibold outline-none" value={formData.dept} onChange={e => setFormData({...formData, dept: e.target.value})}>
                      {stores.length === 0 && <option value={emp.dept}>{emp.dept}</option>}
                      {stores.map(st => <option key={st.id} value={st.id}>{st.id} - {st.name}</option>)}
                    </select>
                  ) : <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-bold">{emp.dept}</span>}
                </td>
                <td className="p-3">
                  {editingId === emp.id ? (
                    <div className="flex gap-1">
                      <select className="w-1/2 p-1.5 border border-blue-400 rounded bg-white text-xs" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                        <option value="FULLTIME">FT</option>
                        <option value="PARTTIME">PT</option>
                      </select>
                      <input type="text" className="w-1/2 p-1.5 border border-blue-400 rounded bg-white text-xs" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${emp.type === 'FULLTIME' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                        {emp.type === 'FULLTIME' ? 'FT' : 'PT'}
                      </span>
                      <span className="font-semibold text-slate-600">{emp.role}</span>
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {editingId === emp.id ? (
                    <input type="number" className="w-16 p-1.5 border border-blue-400 rounded bg-white text-xs" value={formData.maxH} onChange={e => setFormData({...formData, maxH: Number(e.target.value)})} />
                  ) : <span className="text-slate-600 font-mono font-medium">{emp.maxH || 48}h</span>}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  {editingId === emp.id ? (
                    <>
                      <button onClick={handleSaveEdit} className="text-emerald-700 bg-emerald-100 hover:bg-emerald-200 p-1.5 rounded mr-1" title="Lưu"><Save size={15} /></button>
                      <button onClick={() => setEditingId(null)} className="text-slate-500 bg-slate-100 hover:bg-slate-200 p-1.5 rounded" title="Hủy"><X size={15} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(emp.id); setFormData(emp); }} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors mr-1" title="Sửa thông tin"><Edit2 size={15} /></button>
                      <button onClick={() => handleDelete(emp.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="Xóa"><Trash2 size={15} /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filteredEmps.length === 0 && !isAdding && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl">🔍</span>
                    <span className="font-medium text-xs">Không tìm thấy nhân viên nào phù hợp với từ khóa "{search}".</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
