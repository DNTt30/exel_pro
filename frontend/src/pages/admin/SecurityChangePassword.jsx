import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Lock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import { toast } from '../../components/ui/toastStore';
import { setAdminPassword, verifyAdminPassword } from '../../lib/adminCredential';

/**
 * Buoc / cho phep admin doi mat khau — /admin/security/change-password.
 * Khi user.mustSetupPassword = true, AppLayout dieu huong vao day ngay sau login.
 */
export default function SecurityChangePassword() {
  const user = useStore((s) => s.user);
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
    
    setBusy(true);
    try {
      // Xác thực mật khẩu cũ
      let signInOk = false;
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: 'admin@ofc.app',
        password: current,
      });

      if (!signInErr && signInData?.session) {
        signInOk = true;
      } else {
        const localMatch = await verifyAdminPassword(current);
        if (current === '1' || current === 'ofc-admin-1' || localMatch) {
          const fallback = await supabase.auth.signInWithPassword({
            email: 'admin@ofc.app',
            password: 'ofc-admin-1',
          });
          if (!fallback.error && fallback.data?.session) {
            signInOk = true;
          }
        }
      }

      if (!signInOk) {
        toast.error('Mật khẩu hiện tại không đúng.');
        setBusy(false);
        return;
      }

      if (next !== confirm) { toast.error('Xác nhận mật khẩu mới không khớp.'); setBusy(false); return; }
      if (next.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự.'); setBusy(false); return; }
      if (next === '1') { toast.error('Không được dùng lại mật khẩu mặc định.'); setBusy(false); return; }

      // Cập nhật mật khẩu mới và metadata must_change_password = false
      const { error: updateErr } = await supabase.auth.updateUser({
        password: next,
        data: { must_change_password: false }
      });

      if (updateErr) {
        throw updateErr;
      }

      // Cập nhật cả bộ nhớ cục bộ để đồng bộ thiết bị cũ
      try {
        await setAdminPassword(next);
      } catch { /* ignore */ }

      useStore.setState({ user: { ...useStore.getState().user, mustSetupPassword: false } });
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
            <p className="text-xs text-slate-500">Thiết lập mật khẩu riêng cho thiết bị này</p>
          </div>
        </div>

        {user.mustSetupPassword && (
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2 flex items-start gap-2">
            <Lock size={14} className="mt-0.5 flex-shrink-0" />
            <span>Bạn đang dùng mật khẩu mặc định. Hãy đặt mật khẩu mới tối thiểu 6 ký tự để tiếp tục sử dụng hệ thống.</span>
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
            className={fieldCls} placeholder={`Tối thiểu 6 ký tự`} autoComplete="new-password" />
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
