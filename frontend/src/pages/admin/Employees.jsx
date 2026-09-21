import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Plus, Edit2, Trash2, Save, X, Search, Lock, Unlock, Crown, KeyRound, ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, Copy, Check } from 'lucide-react';
import ChangePasswordModal from '../../components/modals/ChangePasswordModal';
import ConfirmModal from '../../components/modals/ConfirmModal';
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
  const [passwordFilter, setPasswordFilter] = useState('ALL'); // ALL | CHANGED | DEFAULT | EXPIRED
  const [copied, setCopied] = useState(false);
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', variant: 'danger', confirmText: 'Xác nhận', onConfirm: null });
  
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

  // Thống kê an toàn mật khẩu
  const securityStats = useMemo(() => {
    let list = employees || [];
    if (!pickStore && user?.dept) list = list.filter(e => e.dept === user.dept);
    const total = list.length;
    let changed = 0;
    let unchanged = 0;
    let expired = 0;
    const now = Date.now();
    list.forEach(e => {
      if (e.passwordChangedAt) {
        changed++;
      } else {
        unchanged++;
        if (e.createdAt) {
          const days = (now - new Date(e.createdAt).getTime()) / (1000 * 3600 * 24);
          if (days > 7) expired++;
        }
      }
    });
    return { 
      total, 
      changed, 
      unchanged, 
      expired, 
      percent: total ? Math.round((changed / total) * 100) : 100 
    };
  }, [employees, pickStore, user?.dept]);

  const handleCopyReminder = () => {
    const text = `📢 [THÔNG BÁO QUAN TRỌNG GS25]\nHiện tại hệ thống phân ca đã kích hoạt chính sách bảo mật bắt buộc. Yêu cầu tất cả nhân viên (${securityStats.unchanged} bạn chưa đổi mật khẩu) đăng nhập vào ứng dụng và đổi mật khẩu riêng ngay trong hôm nay để bảo vệ quyền lợi chấm công & lịch làm việc của mình!`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('Đã sao chép nội dung nhắc nhở để dán vào nhóm Zalo/Telegram!');
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      toast.info(text);
    });
  };

  const filteredEmps = useMemo(() => {
    let list = employees || [];
    if (!pickStore && user?.dept) list = list.filter(e => e.dept === user.dept);
    if (roleFilter === 'sm') list = list.filter(e => isManagerFromEmp(e));
    else if (roleFilter === 'nv') list = list.filter(e => !isManagerFromEmp(e));
    
    // Lọc theo trạng thái mật khẩu
    const now = Date.now();
    if (passwordFilter === 'CHANGED') {
      list = list.filter(e => Boolean(e.passwordChangedAt));
    } else if (passwordFilter === 'DEFAULT') {
      list = list.filter(e => !e.passwordChangedAt);
    } else if (passwordFilter === 'EXPIRED') {
      list = list.filter(e => !e.passwordChangedAt && e.createdAt && (now - new Date(e.createdAt).getTime()) / (1000 * 3600 * 24) > 7);
    }

    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter(e => e.name.toLowerCase().includes(s) || e.id.toLowerCase().includes(s));
  }, [employees, search, roleFilter, passwordFilter, pickStore, user?.dept]);

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

  const handleDelete = (id) => {
    // Kiểm tra tính toàn vẹn: Không cho xóa nếu nhân viên này đang là SM
    const ownedStores = stores.filter(s => (s.sm_id || s.smId) === id);
    if (ownedStores.length > 0) {
      return toast.error(`Không thể xóa: Nhân sự này đang là SM phụ trách cửa hàng ${ownedStores.map(s => s.id).join(', ')}. Vui lòng gán SM khác cho các cửa hàng này trước khi xóa.`);
    }

    setConfirmState({
      isOpen: true,
      title: 'Xóa hồ sơ nhân sự',
      message: 'Bạn có chắc chắn muốn xóa nhân sự này khỏi danh sách?\n\n💡 Khuyến nghị: Nên dùng nút KHÓA thay vì XÓA để bảo toàn lịch sử chấm công và xếp ca.',
      variant: 'danger',
      confirmText: 'Xác nhận xóa',
      onConfirm: async () => {
        try {
          await deleteEmployee(id);
          toast.success('Đã xóa nhân sự thành công');
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        } catch (e) {
          toast.error('Lỗi: ' + e.message);
        }
      }
    });
  };

  // Khóa/mở tài khoản: mã bị khóa không thể đăng nhập (dùng khi nghỉ việc)
  const handleToggleActive = async (emp) => {
    const next = emp.isActive === false;
    if (!next) {
      const ownedStores = stores.filter(s => (s.sm_id || s.smId) === emp.id);
      let warningMsg = `Vô hiệu hóa mã ${emp.id}? Người này sẽ không thể đăng nhập vào ứng dụng nữa.`;
      if (isManagerFromEmp(emp) && ownedStores.length > 0) {
        warningMsg = `⚠️ ${emp.name} (${emp.id}) đang là SM phụ trách: ${ownedStores.map(s => s.id).join(', ')}.\n\nKhóa mã này sẽ khiến các cửa hàng trên KHÔNG CÒN NGƯỜI PHỤ TRÁCH. Hãy gán SM khác trước nếu cần. Vẫn tiếp tục khóa?`;
      }

      setConfirmState({
        isOpen: true,
        title: 'Khóa tài khoản nhân viên',
        message: warningMsg,
        variant: 'warning',
        confirmText: 'Xác nhận khóa',
        onConfirm: async () => {
          try {
            await updateEmployee(emp.id, { isActive: false });
            toast.success('Đã vô hiệu hóa mã ' + emp.id);
            setConfirmState(prev => ({ ...prev, isOpen: false }));
          } catch (e) {
            toast.error('Lỗi: ' + e.message + ' (Chạy sql_employee_status.sql nếu chưa có cột is_active)');
          }
        }
      });
      return;
    }

    try {
      await updateEmployee(emp.id, { isActive: true });
      toast.success('Đã mở lại tài khoản ' + emp.id);
    } catch (e) {
      toast.error('Lỗi: ' + e.message + ' (Chạy sql_employee_status.sql nếu chưa có cột is_active)');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-6 h-full flex flex-col">
      {/* ── BẢNG THỐNG KÊ AN TOÀN MẬT KHẨU ── */}
      <div className={`mb-4 p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
        securityStats.unchanged === 0 
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
          : securityStats.expired > 0
            ? 'bg-rose-50/80 border-rose-200 text-rose-900'
            : 'bg-amber-50/80 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center gap-2.5">
          {securityStats.unchanged === 0 ? (
            <ShieldCheck size={24} className="text-emerald-600 flex-shrink-0" />
          ) : (
            <ShieldAlert size={24} className={securityStats.expired > 0 ? 'text-rose-600 flex-shrink-0' : 'text-amber-600 flex-shrink-0'} />
          )}
          <div>
            <div className="font-bold flex items-center gap-2">
              <span>Bảo mật Tài khoản: {securityStats.changed}/{securityStats.total} nhân sự đã đổi mật khẩu ({securityStats.percent}%)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                securityStats.unchanged === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-white shadow-2xs text-slate-800'
              }`}>
                {securityStats.unchanged === 0 ? '100% An toàn' : `${securityStats.unchanged} chưa đổi`}
              </span>
            </div>
            <p className="text-[11px] opacity-80 mt-0.5">
              {securityStats.unchanged === 0 
                ? 'Tất cả tài khoản trong hệ thống đã thiết lập mật khẩu riêng an toàn, không còn tài khoản dùng mật khẩu mặc định.' 
                : securityStats.expired > 0
                  ? `Có ${securityStats.expired} tài khoản quá hạn 7 ngày chưa đổi mật khẩu (có nguy cơ bị kẻ gian lợi dụng). Hãy yêu cầu nhân sự đổi ngay!`
                  : `Còn ${securityStats.unchanged} tài khoản đang dùng mật khẩu mặc định. Hệ thống sẽ tự động ép đổi mật khẩu khi nhân viên đăng nhập.`}
            </p>
          </div>
        </div>

        {securityStats.unchanged > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopyReminder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all cursor-pointer text-xs"
              title="Sao chép nội dung nhắc nhở để gửi vào nhóm Zalo/Telegram cửa hàng"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-slate-500" />}
              <span>{copied ? 'Đã sao chép!' : 'Nhắc nhở qua Zalo'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Quản lý Nhân sự</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {pickStore ? `Danh sách nhân sự các chi nhánh (${filteredEmps.length})` : `Nhân sự cửa hàng ${user?.dept || ''} (${filteredEmps.length})`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Lọc theo chức vụ */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {[['ALL', 'Tất cả'], ['sm', 'Quản lý (SM)'], ['nv', 'Nhân viên']].map(([v, lb]) => (
              <button key={v} onClick={() => setRoleFilter(v)}
                className={`px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${roleFilter === v ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                {lb}
              </button>
            ))}
          </div>

          {/* Lọc theo trạng thái Mật khẩu */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {[
              ['ALL', `Tất cả (${securityStats.total})`],
              ['CHANGED', `🟢 Đã đổi (${securityStats.changed})`],
              ['DEFAULT', `🔴 Mặc định (${securityStats.unchanged})`],
              ...(securityStats.expired > 0 ? [['EXPIRED', `⚠️ Quá hạn (${securityStats.expired})`]] : [])
            ].map(([v, lb]) => (
              <button key={v} onClick={() => setPasswordFilter(v)}
                className={`px-2 py-1.5 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${passwordFilter === v ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
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
              className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs w-44 sm:w-56 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
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
              <th className="p-3">Trạng thái MK</th>
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
                <td className="p-2.5"></td>
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
                  <td className="p-3">
                    {(() => {
                      const hasChanged = Boolean(emp.passwordChangedAt);
                      const now = Date.now();
                      const isOverdue = !hasChanged && emp.createdAt && (now - new Date(emp.createdAt).getTime()) / (1000 * 3600 * 24) > 7;

                      if (hasChanged) {
                        return (
                          <span 
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            title={emp.passwordChangedAt ? `Đã đổi: ${new Date(emp.passwordChangedAt).toLocaleDateString('vi-VN')}` : 'Đã đổi mật khẩu'}
                          >
                            <CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0" />
                            Đã đổi MK
                          </span>
                        );
                      }

                      if (isOverdue) {
                        return (
                          <span 
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-300 animate-pulse"
                            title="Tài khoản chưa đổi mật khẩu sau 7 ngày kể từ khi tạo! Cần đôn đốc đổi ngay."
                          >
                            <AlertTriangle size={12} className="text-rose-600 flex-shrink-0" />
                            Quá hạn (&gt;7d)
                          </span>
                        );
                      }

                      return (
                        <span 
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-300"
                          title="Vẫn dùng mật khẩu mặc định (1) - hệ thống sẽ buộc đổi khi đăng nhập"
                        >
                          <KeyRound size={12} className="text-amber-600 flex-shrink-0" />
                          Mặc định (1)
                        </span>
                      );
                    })()}
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
                <td colSpan={7} className="p-8 text-center text-slate-400">
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
    
      {resetTarget && <ChangePasswordModal isOpen onClose={() => setResetTarget(null)} targetEmp={resetTarget} />}
      
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        confirmText={confirmState.confirmText}
      />
    </div>
  );
}