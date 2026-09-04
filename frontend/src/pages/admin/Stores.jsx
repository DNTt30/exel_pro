import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Plus, Edit2, Trash2, Save, X, Lock, Unlock, Crown, UserPlus } from 'lucide-react';
import StaffingMatrixFields from '../../components/StaffingMatrixFields';
import StoreDemandFields from '../../components/StoreDemandFields';
import { normalizeStaffingConfig, normalizeStoreDemand } from '../../data/constants';
import { canPickStore, isManagerFromEmp, canAssignManager } from '../../lib/authSession';
import { visibleDeptIds } from '../../utils/dataScope';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '../../components/ui/toastStore';
import { updateStore as apiUpdateStore, updateEmployeeInfo } from '../../services/api';

export default function Stores() {
  const { stores, employees, addStore, updateStore, deleteStore, updateEmployee, user } = useStore(useShallow((s) => ({
    stores: s.stores,
    employees: s.employees,
    addStore: s.addStore,
    updateStore: s.updateStore,
    deleteStore: s.deleteStore,
    updateEmployee: s.updateEmployee,
    user: s.user
  })));
  const pickStore = canPickStore(user);
  const canAssignSM = canAssignManager(user);
  const allowedDepts = new Set(visibleDeptIds(user, stores));
  const visibleStores = pickStore ? stores : stores.filter(s => allowedDepts.has(s.id));
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // State cho Modal Bổ nhiệm / Gán Cửa hàng trưởng (SM)
  const [assignModalStore, setAssignModalStore] = useState(null);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [assignMode, setAssignMode] = useState('replace'); // 'replace' | 'append'
  const [savingSM, setSavingSM] = useState(false);

  const getStoreManagers = (storeId) => {
    return (employees || []).filter(emp => {
      if (!isManagerFromEmp(emp)) return false;
      const depts = (emp.dept || '').split(',').map(d => d.trim());
      return depts.includes(storeId);
    });
  };

  const existingManagers = useMemo(() => {
    return (employees || []).filter(e => isManagerFromEmp(e) && e.isActive !== false);
  }, [employees]);

  const regularEmployees = useMemo(() => {
    return (employees || []).filter(e => !isManagerFromEmp(e) && e.isActive !== false);
  }, [employees]);

  const handleAssignSM = async () => {
    if (!assignModalStore || !selectedEmpId) {
      return toast.error('Vui lòng chọn nhân sự để gán làm Quản lý.');
    }
    const emp = (employees || []).find(e => e.id === selectedEmpId);
    if (!emp) return toast.error('Không tìm thấy nhân sự đã chọn.');

    setSavingSM(true);
    try {
      const storeId = assignModalStore.id;
      const currentDepts = (emp.dept || '').split(',').map(d => d.trim()).filter(Boolean);
      let nextDepts;
      if (assignMode === 'append') {
        nextDepts = Array.from(new Set([...currentDepts, storeId])).join(', ');
      } else {
        nextDepts = storeId;
      }

      const payload = {
        dept: nextDepts,
        jobTitle: 'Cửa hàng trưởng',
        role: 'Cửa hàng trưởng',
        type: 'STFT'
      };

      await updateEmployeeInfo(emp.id, payload);
      updateEmployee(emp.id, payload);

      toast.success(`Đã bổ nhiệm ${emp.name} (${emp.id}) làm Quản lý cửa hàng ${assignModalStore.name}!`);
      setAssignModalStore(null);
      setSelectedEmpId('');
    } catch (err) {
      toast.error('Lỗi khi gán SM: ' + err.message);
    } finally {
      setSavingSM(false);
    }
  };

  const handleRemoveSM = async (storeId, emp) => {
    if (!confirm(`Gỡ quyền quản lý của ${emp.name} khỏi cửa hàng ${storeId}?`)) return;
    try {
      const currentDepts = (emp.dept || '').split(',').map(d => d.trim()).filter(Boolean);
      const nextDepts = currentDepts.filter(d => d !== storeId).join(', ');
      const payload = {
        dept: nextDepts
      };
      await updateEmployeeInfo(emp.id, payload);
      updateEmployee(emp.id, payload);
      toast.success(`Đã gỡ ${emp.name} khỏi cửa hàng ${storeId}`);
    } catch (err) {
      toast.error('Lỗi khi gỡ SM: ' + err.message);
    }
  };
  
  const emptyStoreForm = () => ({
    id: '',
    name: '',
    region: 'Miền Bắc',
    staffing: normalizeStaffingConfig(),
    demand: normalizeStoreDemand()
  });

  const [formData, setFormData] = useState(emptyStoreForm());

  const handleSaveAdd = async () => {
    if (!formData.id || !formData.name) return toast.error('Vui lòng nhập đủ Mã và Tên');
    try {
      await addStore({
        ...formData,
        staffing: normalizeStaffingConfig(formData.staffing),
        demand: normalizeStoreDemand(formData.demand)
      });
      setIsAdding(false);
      setFormData(emptyStoreForm());
    } catch (e) {
      toast.error('Lỗi: ' + e.message);
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
      toast.error('Lỗi: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    // Kiểm tra tính toàn vẹn: Không cho xóa nếu vẫn còn nhân viên
    const empsInStore = employees.filter(e => e.dept === id);
    if (empsInStore.length > 0) {
      return toast.error(`Không thể xóa: Cửa hàng này vẫn còn ${empsInStore.length} nhân viên trực thuộc. Vui lòng chuyển hoặc xóa nhân viên trước.`);
    }

    if (confirm('Bạn có chắc chắn muốn xóa cửa hàng này?')) {
      try {
        await deleteStore(id);
      } catch (e) {
        toast.error('Lỗi: ' + e.message);
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
              <th className="p-3">SM quản lý</th>
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
                <td className="p-3">
                  {(() => {
                    const storeManagers = getStoreManagers(st.id);
                    
                    return (
                      <div className="flex flex-col gap-1.5 items-start">
                        {storeManagers.length === 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] italic text-slate-400">Chưa có quản lý</span>
                            {canAssignSM && (
                              <button
                                onClick={() => { setAssignModalStore(st); setSelectedEmpId(''); }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                                title={`Bổ nhiệm Quản lý cho cửa hàng ${st.name}`}
                              >
                                <Plus size={12} /> Gán SM
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 w-full max-w-xs">
                            {storeManagers.map(m => (
                              <div key={m.id} className="inline-flex items-center justify-between gap-2 px-2 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80 text-[11px] font-bold">
                                <span className="inline-flex items-center gap-1.5 truncate">
                                  <Crown size={12} className="text-amber-500 shrink-0" />
                                  <span className="truncate">{m.id} - {m.name}</span>
                                </span>
                                {canAssignSM && (
                                  <button
                                    onClick={() => handleRemoveSM(st.id, m)}
                                    className="text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                                    title={`Gỡ ${m.name} khỏi cửa hàng ${st.id}`}
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            ))}
                            {canAssignSM && (
                              <button
                                onClick={() => { setAssignModalStore(st); setSelectedEmpId(''); }}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline mt-0.5 cursor-pointer"
                              >
                                <UserPlus size={11} /> Đổi / Gán thêm SM
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
                      {pickStore && (
                        <button
                          onClick={async () => {
                            const next = st.is_active === false; // đang khóa -> mở
                            if (!next && !confirm('Ngừng hoạt động cửa hàng ' + st.id + '? CH sẽ ẩn khỏi bộ chọn lịch/dashboard (dữ liệu giữ nguyên).')) return;
                            try {
                              await apiUpdateStore(st.id, { is_active: next });
                              updateStore(st.id, { is_active: next });
                            } catch (e) {
                              toast.error('Lỗi: ' + e.message + ' (Chạy sql_stores_active.sql nếu chưa có cột is_active)');
                            }
                          }}
                          className={`p-1.5 rounded transition-colors mr-1 ${st.is_active === false ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-slate-500 hover:bg-slate-100'}`}
                          title={st.is_active === false ? 'Mở lại hoạt động' : 'Ngừng hoạt động'}
                        >
                          {st.is_active === false ? <Unlock size={15} /> : <Lock size={15} />}
                        </button>
                      )}
                      {pickStore && <button onClick={() => handleDelete(st.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="Xóa"><Trash2 size={15} /></button>}
                    </>
                  )}
                </td>
              </tr>
              {editingId === st.id && (
                <tr className="bg-blue-50/40">
                  <td colSpan={5} className="p-3 space-y-3">
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
                <td colSpan={5} className="p-8 text-center text-slate-400">
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

      {/* ── Modal Bổ nhiệm / Gán Cửa hàng trưởng (SM) ── */}
      {assignModalStore && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-sky-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md border border-white/20">
                  <Crown size={22} className="text-amber-300" />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight">Gán Cửa hàng trưởng (SM)</h3>
                  <p className="text-xs text-blue-100 mt-0.5 font-medium">
                    Chi nhánh: <span className="font-bold text-white font-mono">{assignModalStore.id}</span> — {assignModalStore.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalStore(null)}
                className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* SM hiện tại */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Quản lý hiện tại phụ trách
                </label>
                {getStoreManagers(assignModalStore.id).length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 italic">
                    Cửa hàng này hiện chưa có Cửa hàng trưởng phụ trách.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {getStoreManagers(assignModalStore.id).map(m => (
                      <div key={m.id} className="flex items-center justify-between p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs font-bold text-amber-900">
                        <span className="flex items-center gap-2">
                          <Crown size={14} className="text-amber-500" />
                          <span>{m.id} - {m.name}</span>
                          <span className="text-[10px] font-normal text-amber-700">({m.dept})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSM(assignModalStore.id, m)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-semibold hover:underline cursor-pointer"
                        >
                          Gỡ quyền
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chọn nhân sự bổ nhiệm */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                  Chọn nhân sự bổ nhiệm làm SM <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedEmpId}
                  onChange={e => setSelectedEmpId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">-- Chọn nhân sự từ danh sách --</option>
                  {existingManagers.length > 0 && (
                    <optgroup label="👑 Cửa hàng trưởng hiện có trong chuỗi">
                      {existingManagers.map(m => (
                        <option key={m.id} value={m.id}>
                          👑 {m.id} - {m.name} (Đang ở: {m.dept || 'Chưa gắn CH'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {regularEmployees.length > 0 && (
                    <optgroup label="👤 Nhân viên tiềm năng (sẽ nâng cấp lên CHT)">
                      {regularEmployees.map(e => (
                        <option key={e.id} value={e.id}>
                          👤 {e.id} - {e.name} ({e.role || e.type} - {e.dept})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  💡 Nếu chọn nhân viên thường, hệ thống sẽ tự động cập nhật chức danh thành <strong>Cửa hàng trưởng (SM)</strong>.
                </p>
              </div>

              {/* Chế độ gán */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Phạm vi phụ trách:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="assignMode"
                      value="replace"
                      checked={assignMode === 'replace'}
                      onChange={() => setAssignMode('replace')}
                      className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span><strong>Chỉ phụ trách cửa hàng này</strong> (chuyển hẳn về {assignModalStore.id})</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="assignMode"
                      value="append"
                      checked={assignMode === 'append'}
                      onChange={() => setAssignMode('append')}
                      className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span><strong>Phụ trách thêm cửa hàng này</strong> (Quản lý cụm / Multi-store)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAssignModalStore(null)}
                disabled={savingSM}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAssignSM}
                disabled={savingSM || !selectedEmpId}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                {savingSM ? (
                  <span>Đang lưu...</span>
                ) : (
                  <>
                    <Crown size={15} /> Xác nhận Gán SM
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}