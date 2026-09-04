import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Plus, Edit2, Trash2, Save, X, Search, Lock, Unlock, Crown, KeyRound } from 'lucide-react';
import ChangePasswordModal from '../../components/modals/ChangePasswordModal';
import { MA_RE, STANDARD_ROLES, getRoleBadgeInfo } from '../../data/constants';
import { canPickStore, isManagerFromEmp, isOpsManager, canAssignManager } from '../../lib/authSession';
import { visibleDeptIds } from '../../utils/dataScope';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '../../components/ui/toastStore';
import { updateEmployeeInfo } from '../../services/api';

export default function Employees() {
  const { employees, stores, addEmployee, updateEmployee, deleteEmployee, user } = useStore(useShallow((s) => ({ employees: s.employees, stores: s.stores, addEmployee: s.addEmployee, updateEmployee: s.updateEmployee, deleteEmployee: s.deleteEmployee, user: s.user })));
  const pickStore = canPickStore(user);
  const canPromote = canAssignManager(user);
  const canEditEmps = pickStore || isOpsManager(user);
  const allowedDepts = new Set(visibleDeptIds(user, stores));
  const visibleStores = pickStore ? stores : stores.filter(s => allowedDepts.has(s.id));
  const homeDept = pickStore ? (stores[0]?.id || '') : (user?.dept || '');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // ALL | sm | nv
  
  // SM cơ sở chỉ quản lý nhân sự cơ sở (STFT, STPT, CSR); Admin toàn quyền bổ nhiệm CHT/OFC
  const availableRoles = useMemo(() => {
    if (canPromote) return STANDARD_ROLES;
    return STANDARD_ROLES.filter(r => r.id !== 'Cửa hàng trưởng' && r.id !== 'OFC');
  }, [canPromote]);

  const [formData, setFormData] = useState({ 
    id: '', 
    name: '', 
    dept: '', 
    role: 'STFT',
    type: 'STFT', 
    maxH: 48 
  });

  const filteredEmps = useMemo(() => {
    let list = employees || [];
    if (!pickStore && user?.dept) list = list.filter(e => e.dept === user.dept);
    if (roleFilter === 'sm') list = list.filter(e => isManagerFromEmp(e));
    else if (roleFilter === 'nv') list = list.filter(e => !isManagerFromEmp(e));
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter(e => e.name.toLowerCase().includes(s) || e.id.toLowerCase().includes(s));
  }, [employees, search, roleFilter, pickStore, user?.dept]);

  const handleRoleChange = (selectedRole) => {
    const roleInfo = availableRoles.find(r => r.id === selectedRole) || STANDARD_ROLES.find(r => r.id === selectedRole) || { type: 'STFT', defaultMaxH: 48 };
    setFormData(prev => ({
      ...prev,
      role: selectedRole,
      type: roleInfo.type,
      maxH: roleInfo.defaultMaxH
    }));
  };

  const handleSaveAdd = async () => {
    const trimmedId = formData.id.trim();
    const trimmedName = formData.name.trim();

    if (!trimmedId || !trimmedName || !formData.dept) {
      return toast.error('Vui lòng nhập đủ Mã NV, Họ tên và Chọn Cửa hàng');
    }

    if (!MA_RE.test(trimmedId)) {
      return toast.error('Mã nhân viên phải gồm đúng 9 chữ số liên tiếp (Ví dụ: 260512008)!');
    }

    try {
      const result = await addEmployee({
        ...formData,
        id: trimmedId,
        name: trimmedName
      });
      if (result?.provisionWarning) {
        toast.info(result.provisionWarning);
      }
      setIsAdding(false);
      setFormData({ id: '', name: '', dept: homeDept, role: 'STFT', type: 'STFT', maxH: 48 });
    } catch (e) {
      toast.error('Lỗi: ' + e.message);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateEmployee(editingId, formData);
      setEditingId(null);
    } catch (e) {
      toast.error('Lỗi: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    // Kiểm tra tính toàn vẹn: Không cho xóa nếu nhân viên này đang là SM
    const ownedStores = stores.filter(s => (s.sm_id || s.smId) === id);
    if (ownedStores.length > 0) {
      return toast.error(`Không thể xóa: Nhân sự này đang là SM phụ trách cửa hàng ${ownedStores.map(s => s.id).join(', ')}. Vui lòng gán SM khác cho các cửa hàng này trước khi xóa.`);
    }

    if (confirm('Bạn có chắc chắn muốn xóa nhân sự này (Khuyến nghị dùng nút KHÓA thay vì XÓA)?')) {
      try {
        await deleteEmployee(id);
      } catch (e) {
        toast.error('Lỗi: ' + e.message);
      }
    }
  };

  // Khóa/mở tài khoản: mã bị khóa không thể đăng nhập (dùng khi nghỉ việc)
  const handleToggleActive = async (emp) => {
    const next = emp.isActive === false;
    if (!next) {
      const ownedStores = stores.filter(s => (s.sm_id || s.smId) === emp.id);
      if (isManagerFromEmp(emp) && ownedStores.length > 0) {
        if (!confirm('⚠️ ' + emp.name + ' (' + emp.id + ') đang là SM phụ trách: ' + ownedStores.map(s => s.id).join(', ') + '.\nKhóa mã này sẽ khiến các cửa hàng trên KHÔNG CÒN NGƯỜI PHỤ TRÁCH.\nHãy gán SM khác trước nếu cần. Vẫn tiếp tục khóa?')) return;
      } else if (!confirm('Vô hiệu hóa mã ' + emp.id + '? Người này sẽ không đăng nhập được nữa.')) return;
    }
    try {
      await updateEmployee(emp.id, { isActive: next });
      toast.success(next ? 'Đã mở lại tài khoản ' + emp.id : 'Đã vô hiệu hóa mã ' + emp.id);
    } catch (e) {
      toast.error('Lỗi: ' + e.message + ' (Chạy sql_employee_status.sql nếu chưa có cột is_active)');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Quản lý Nhân sự</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {pickStore ? `Danh sách nhân sự các chi nhánh (${filteredEmps.length})` : `Nhân sự cửa hàng ${user?.dept || ''} (${filteredEmps.length})`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {[['ALL', 'Tất cả'], ['sm', 'Quản lý (SM)'], ['nv', 'Nhân viên']].map(([v, lb]) => (
              <button key={v} onClick={() => setRoleFilter(v)}
                className={`px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${roleFilter === v ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                {lb}
              </button>
            ))}
          </div>
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
          {canEditEmps && (
          <button 
            onClick={() => { 
              setIsAdding(true); 
              setFormData({ id: '', name: '', dept: homeDept, role: 'STFT', type: 'STFT', maxH: 48 }); 
            }}
            className="btn btn-primary text-xs py-2 px-3 rounded-lg shadow-2xs font-bold whitespace-nowrap cursor-pointer"
          >
            <Plus size={15} /> Thêm nhân sự
          </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-100/80 text-left border-b border-slate-200 sticky top-0 z-10 text-xs font-bold text-slate-600">
              <th className="p-3">Mã NV</th>
              <th className="p-3">Họ và tên</th>
              <th className="p-3">Cửa hàng làm việc</th>
              <th className="p-3">Vị trí / Chức vụ</th>
              <th className="p-3">Định mức Giờ/Tuần</th>
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {canEditEmps && isAdding && (
              <tr className="bg-blue-50/70 border-b border-blue-100 animate-in fade-in duration-150">
                <td className="p-2.5">
                  <input 
                    type="text" 
                    maxLength={9}
                    className="w-full p-1.5 border border-blue-300 rounded bg-white font-mono text-xs outline-none" 
                    placeholder="Mã 9 số" 
                    value={formData.id} 
                    onChange={e => setFormData({...formData, id: e.target.value.replace(/\D/g, '')})} 
                  />
                </td>
                <td className="p-2.5">
                  <input 
                    type="text" 
                    className="w-full p-1.5 border border-blue-300 rounded bg-white text-xs font-semibold outline-none" 
                    placeholder="Họ và tên" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                </td>
                <td className="p-2.5">
                  <select 
                    className="w-full p-1.5 border border-blue-300 rounded bg-white text-xs outline-none font-medium disabled:bg-slate-100" 
                    value={formData.dept}
                    disabled={!pickStore}
                    onChange={e => setFormData({...formData, dept: e.target.value})}
                  >
                    <option value="">-- Chọn Cửa hàng --</option>
                    {visibleStores.map(st => <option key={st.id} value={st.id}>{st.id} - {st.name}</option>)}
                  </select>
                </td>
                <td className="p-2.5">
                  <select 
                    className="w-full p-1.5 border border-blue-300 rounded bg-white text-xs outline-none font-bold text-slate-700" 
                    value={formData.role} 
                    onChange={e => handleRoleChange(e.target.value)}
                  >
                    {availableRoles.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2.5">
                  <input 
                    type="number" 
                    className="w-20 p-1.5 border border-blue-300 rounded bg-white text-xs outline-none font-mono" 
                    value={formData.maxH} 
                    onChange={e => setFormData({...formData, maxH: Number(e.target.value)})} 
                  />
                </td>
                <td className="p-2.5 text-right whitespace-nowrap">
                  <button onClick={handleSaveAdd} className="text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded font-bold mr-1 cursor-pointer" title="Lưu"><Save size={15} /></button>
                  <button onClick={() => setIsAdding(false)} className="text-slate-600 bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded font-bold cursor-pointer" title="Hủy"><X size={15} /></button>
                </td>
              </tr>
            )}
            
            {filteredEmps.map(emp => {
              const badgeInfo = getRoleBadgeInfo(emp.role || emp.type);
              
              return (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-slate-700">{emp.id}</td>
                  <td className="p-3">
                    {editingId === emp.id ? (
                      <input 
                        type="text" 
                        className="w-full p-1.5 border border-blue-400 rounded bg-white text-xs font-bold outline-none" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                      />
                    ) : <span className="font-bold text-slate-800">{emp.name}</span>}
                  </td>
                  <td className="p-3">
                    {editingId === emp.id ? (
                      <select 
                        className="w-full p-1.5 border border-blue-400 rounded bg-yellow-50 text-xs font-semibold outline-none disabled:bg-slate-100" 
                        value={formData.dept}
                        disabled={!pickStore}
                        onChange={e => setFormData({...formData, dept: e.target.value})}
                      >
                        {visibleStores.length === 0 && <option value={emp.dept}>{emp.dept}</option>}
                        {visibleStores.map(st => <option key={st.id} value={st.id}>{st.id} - {st.name}</option>)}
                      </select>
                    ) : <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-bold">{emp.dept}</span>}
                  </td>
                  <td className="p-3">
                    {editingId === emp.id ? (
                      <select 
                        className="w-full p-1.5 border border-blue-400 rounded bg-white text-xs font-bold text-slate-700" 
                        value={formData.role} 
                        onChange={e => handleRoleChange(e.target.value)}
                      >
                        {availableRoles.map(r => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${badgeInfo.badgeCls}`}>
                        {badgeInfo.label || emp.role || emp.type}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {editingId === emp.id ? (
                      <input 
                        type="number" 
                        className="w-20 p-1.5 border border-blue-400 rounded bg-white text-xs outline-none font-mono" 
                        value={formData.maxH} 
                        onChange={e => setFormData({...formData, maxH: Number(e.target.value)})} 
                      />
                    ) : <span className="text-slate-600 font-mono font-bold">{emp.maxH || (emp.type === 'STPT' ? 23 : 48)}h</span>}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {editingId === emp.id ? (
                      <>
                        <button onClick={handleSaveEdit} className="text-emerald-700 bg-emerald-100 hover:bg-emerald-200 p-1.5 rounded mr-1 cursor-pointer" title="Lưu"><Save size={15} /></button>
                        <button onClick={() => setEditingId(null)} className="text-slate-500 bg-slate-100 hover:bg-slate-200 p-1.5 rounded cursor-pointer" title="Hủy"><X size={15} /></button>
                      </>
                    ) : (
                      <>
                        {canPromote && emp.id !== user?.id && (
                        <button
                          onClick={async () => {
                            const next = isManagerFromEmp(emp) ? '' : 'Cửa hàng trưởng';
                            try {
                              await updateEmployeeInfo(emp.id, { jobTitle: next });
                              updateEmployee(emp.id, { jobTitle: next });
                              toast.success(next ? `${emp.name} đã là Quản lý (SM)` : `${emp.name} về vai trò Nhân viên`);
                            } catch (e) {
                              toast.error('Lỗi: ' + e.message);
                            }
                          }}
                          className={`p-1.5 rounded transition-colors mr-1 cursor-pointer ${isManagerFromEmp(emp) ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-slate-400 hover:bg-slate-100'}`}
                          title={isManagerFromEmp(emp) ? 'Hạ thành Nhân viên' : 'Đặt làm Quản lý (SM)'}
                        >
                          <Crown size={15} />
                        </button>
                        )}
                        {canEditEmps && (
                        <><button onClick={() => setResetTarget(emp)} title="Đặt lại mật khẩu" className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 mr-1"><KeyRound size={14} /></button>
            <button onClick={() => handleToggleActive(emp)} className={`${emp.isActive === false ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-500 hover:bg-slate-100'} p-1.5 rounded transition-colors mr-1 cursor-pointer`} title={emp.isActive === false ? 'Mở lại tài khoản' : 'Vô hiệu hóa (nghỉ việc)'}>
                          {emp.isActive === false ? <Unlock size={15} /> : <Lock size={15} />}
                        </button></>
                        )}
                        {canEditEmps && (
                        <button onClick={() => { setEditingId(emp.id); setFormData({ ...emp, role: emp.role || emp.type || 'STFT' }); }} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors mr-1 cursor-pointer" title="Sửa thông tin"><Edit2 size={15} /></button>
                        )}
                        {canEditEmps && (
                        <button onClick={() => handleDelete(emp.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors cursor-pointer" title="Xóa"><Trash2 size={15} /></button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
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
    
      {resetTarget && <ChangePasswordModal isOpen onClose={() => setResetTarget(null)} targetEmp={resetTarget} />}</div>
  );
}