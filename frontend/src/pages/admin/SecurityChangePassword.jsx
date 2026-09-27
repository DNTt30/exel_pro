import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Lock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { validateNewPassword } from '../../utils/passwordPolicy';
import { toast } from '../../components/ui/toastStore';
import { setAdminPassword } from '../../lib/adminCredential';

/**
 * Buoc / cho phep admin doi mat khau — /admin/security/change-password.
 * Khi user.mustSetupPassword = true, AppLayout dieu huong vao day ngay sau login.
 */
export default function SecurityChangePassword() {
  const user = useStore((s) => s.user);
  const changeMyPassword = useStore((s) => s.changeMyPassword);
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user || user.id !== 'admin') return <Navigate to="/login" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const validationError = validateNewPassword(next);
    if (validationError) { toast.error(validationError); return; }
    if (next !== confirm) { toast.error('Xác nhận mật khẩu mới không khớp.'); return; }
    
    setBusy(true);
    try {
      await changeMyPassword(current, next);

      // Cập nhật cả bộ nhớ cục bộ để đồng bộ thiết bị cũ
      try {
        await setAdminPassword(next);
      } catch { /* ignore */ }

      if (useStore.getState().user?.id !== user.id) return;
      toast.success('Đã cập nhật mật khẩu admin an toàn trên hệ thống.');
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Không đổi được mật khẩu.');
    } finally {
      setBusy(false);
    }
  };

  const fieldCls = "w-full border border-slate-300 rounded-xl px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-800 leading-tight">Bảo mật tài khoản admin</h1>
            <p className="text-xs text-slate-500">Thiết lập mật khẩu bảo mật đồng bộ cho mọi thiết bị</p>
          </div>
        </div>

        {(user.mustSetupPassword || user.mustChangePassword) && (
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2 flex items-start gap-2">
            <Lock size={14} className="mt-0.5 flex-shrink-0" />
            <span>Hãy đặt mật khẩu mới tối thiểu 8 ký tự, có số hoặc ký tự đặc biệt để tiếp tục sử dụng hệ thống.</span>
          </div>
        )}

        <label className="block">
          <span className="block text-xs font-bold text-slate-600 mb-1">Mật khẩu hiện tại</span>
          <input type={show ? 'text' : 'password'} value={current} onChange={(e) => setCurrent(e.target.value)}
            className={fieldCls} placeholder="Nhập mật khẩu đang dùng" autoComplete="current-password" />
        </label>

        <label className="block">
          <span className="block text-xs font-bold text-slate-600 mb-1">Mật khẩu mới</span>
          <input type={show ? 'text' : 'password'} value={next} onChange={(e) => setNext(e.target.value)}
            className={fieldCls} placeholder="Tối thiểu 8 ký tự, có số hoặc ký tự đặc biệt" autoComplete="new-password" />
        </label>

        <label className="block">
          <span className="block text-xs font-bold text-slate-600 mb-1">Nhập lại mật khẩu mới</span>
          <input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className={fieldCls} autoComplete="new-password" />
        </label>

        <button type="button" onClick={() => setShow(!show)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
          {show ? <EyeOff size={13} /> : <Eye size={13} />} {show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        </button>

        <button type="submit" disabled={busy}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl py-2.5 shadow-md shadow-blue-500/20 hover:brightness-105 transition-all">
          {busy ? 'Đang lưu…' : 'Cập nhật mật khẩu'}
        </button>
      </form>
    </div>
  );
}
