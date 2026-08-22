import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import StaffingMatrixFields from '../../components/StaffingMatrixFields';
import StoreDemandFields from '../../components/StoreDemandFields';
import { normalizeStaffingConfig, normalizeStoreDemand } from '../../data/constants';
import { canPickStore } from '../../lib/authSession';

export default function Stores() {
  const { stores, addStore, updateStore, deleteStore, user } = useStore();
  const pickStore = canPickStore(user);
  const visibleStores = pickStore ? stores : stores.filter(s => s.id === user?.dept);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const emptyStoreForm = () => ({
    id: '',
    name: '',
    region: 'Miền Bắc',
    staffing: normalizeStaffingConfig(),
    demand: normalizeStoreDemand()
  });

  const [formData, setFormData] = useState(emptyStoreForm());

  const handleSaveAdd = async () => {
    if (!formData.id || !formData.name) return alert('Vui lòng nhập đủ Mã và Tên');
    try {
      await addStore({
        ...formData,
        staffing: normalizeStaffingConfig(formData.staffing),
        demand: normalizeStoreDemand(formData.demand)
      });
      setIsAdding(false);
      setFormData(emptyStoreForm());
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateStore(editingId, {
        name: formData.name,
        region: formData.region,
        staffing: normalizeStaffingConfig(formData.staffing),
        demand: normalizeStoreDemand(formData.demand)
      });
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

  const getRegionBadge = (region) => {
    switch (region) {
      case 'Miền Bắc':
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-bold">Miền Bắc</span>;
      case 'Miền Trung':
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[11px] font-bold">Miền Trung</span>;
      case 'Miền Nam':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold">Miền Nam</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-bold">{region}</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Quản lý Cửa hàng</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {pickStore
              ? `Danh sách các chi nhánh / cửa hàng trong chuỗi (${visibleStores.length} cửa hàng)`
              : 'Cửa hàng bạn đang quản lý — sửa định biên và Direct.'}
          </p>
        </div>
        {pickStore && (
          <button 
            onClick={() => { setIsAdding(true); setFormData(emptyStoreForm()); }}
            className="btn btn-primary text-xs py-2 px-3.5 rounded-lg shadow-2xs font-bold whitespace-nowrap"
          >
            <Plus size={15} /> Thêm cửa hàng
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-100/80 text-left border-b border-slate-200 sticky top-0 z-10 text-xs font-bold text-slate-600">
              <th className="p-3">Mã Cửa hàng</th>
              <th className="p-3">Tên Cửa hàng</th>
              <th className="p-3">Khu vực</th>
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {isAdding && (
              <tr className="bg-blue-50/70 border-b border-blue-100 animate-in fade-in duration-150">
                <td className="p-2.5"><input type="text" className="w-full p-1.5 border border-blue-300 rounded bg-white font-mono text-xs outline-none" placeholder="VD: VN0485" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} /></td>
                <td className="p-2.5"><input type="text" className="w-full p-1.5 border border-blue-300 rounded bg-white text-xs font-semibold outline-none" placeholder="Tên hiển thị" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></td>
                <td className="p-2.5">
                  <select className="w-full p-1.5 border border-blue-300 rounded bg-white text-xs outline-none font-medium" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})}>
                    <option>Miền Bắc</option>
                    <option>Miền Trung</option>
                    <option>Miền Nam</option>
                  </select>
                </td>
                <td className="p-2.5 text-right whitespace-nowrap">
                  <button onClick={handleSaveAdd} className="text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded font-bold mr-1" title="Lưu"><Save size={15} /></button>
                  <button onClick={() => setIsAdding(false)} className="text-slate-600 bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded font-bold" title="Hủy"><X size={15} /></button>
                </td>
              </tr>
            )}
            {isAdding && (
              <tr className="bg-blue-50/40">
                <td colSpan={4} className="p-3 space-y-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">GS25 Direct — lượt khách / doanh số TB ngày</div>
                    <StoreDemandFields
                      demand={formData.demand}
                      onChange={demand => setFormData({ ...formData, demand })}
                      onSuggest={staffing => setFormData({ ...formData, staffing })}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Định biên ca (số NV tối thiểu)</div>
                    <StaffingMatrixFields
                      staffing={formData.staffing}
                      onChange={staffing => setFormData({ ...formData, staffing })}
                    />
                  </div>
                </td>
              </tr>
            )}
            
            {visibleStores.map(st => (
              <React.Fragment key={st.id}>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-mono font-bold text-slate-800">{st.id}</td>
                <td className="p-3 font-semibold text-slate-800">
                  {editingId === st.id ? (
                    <input type="text" className="w-full p-1.5 border border-blue-400 rounded bg-white text-xs font-bold outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  ) : st.name}
                </td>
                <td className="p-3">
                  {editingId === st.id ? (
                    <select className="w-full p-1.5 border border-blue-400 rounded bg-white text-xs" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})}>
                      <option>Miền Bắc</option>
                      <option>Miền Trung</option>
                      <option>Miền Nam</option>
                    </select>
                  ) : getRegionBadge(st.region)}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  {editingId === st.id ? (
                    <>
                      <button onClick={handleSaveEdit} className="text-emerald-700 bg-emerald-100 hover:bg-emerald-200 p-1.5 rounded mr-1" title="Lưu"><Save size={15} /></button>
                      <button onClick={() => setEditingId(null)} className="text-slate-500 bg-slate-100 hover:bg-slate-200 p-1.5 rounded" title="Hủy"><X size={15} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(st.id); setFormData({ ...st, staffing: normalizeStaffingConfig(st.staffing), demand: normalizeStoreDemand(st.demand) }); }} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors mr-1" title="Sửa"><Edit2 size={15} /></button>
                      {pickStore && <button onClick={() => handleDelete(st.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="Xóa"><Trash2 size={15} /></button>}
                    </>
                  )}
                </td>
              </tr>
              {editingId === st.id && (
                <tr className="bg-blue-50/40">
                  <td colSpan={4} className="p-3 space-y-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">GS25 Direct — lượt khách / doanh số TB ngày</div>
                      <StoreDemandFields
                        demand={formData.demand}
                        onChange={demand => setFormData({ ...formData, demand })}
                        onSuggest={staffing => setFormData({ ...formData, staffing })}
                      />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Định biên ca (số NV tối thiểu)</div>
                      <StaffingMatrixFields
                        staffing={formData.staffing}
                        onChange={staffing => setFormData({ ...formData, staffing })}
                      />
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
            {stores.length === 0 && !isAdding && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl">🏬</span>
                    <span className="font-medium text-xs">Chưa có cửa hàng nào trong hệ thống.</span>
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
