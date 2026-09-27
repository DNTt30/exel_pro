/**
 * EmployeeChangePassword.jsx
 * Trang bắt buộc đổi mật khẩu cho nhân viên khi:
 *  - Còn dùng mật khẩu mặc định (forced: true, reason: 'default')
 *  - Admin yêu cầu đổi (must_change_password flag)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasPasswordNumberOrSymbol, validateNewPassword } from '../../utils/passwordPolicy';
import { signedInPath } from '../../utils/authNavigation';
import { useStore } from '../../store/useStore';
import { KeyRound, Eye, EyeOff, AlertTriangle, Lock } from 'lucide-react';

export default function EmployeeChangePassword() {
  const navigate = useNavigate();
  const user = useStore(s => s.user);
  const changeMyPassword = useStore(s => s.changeMyPassword);

  const forced = !!user?.mustChangePassword;

  const [oldPw, setOldPw]       = useState('');
  const [newPw, setNewPw]       = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showOld, setShowOld]   = useState(false);
  const [showNew, setShowNew]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const isExpired = !!user?.isPasswordExpired;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!oldPw) { setError('Vui lòng nhập mật khẩu hiện tại'); return; }

    const valErr = validateNewPassword(newPw);
    if (valErr) { setError(valErr); return; }
    if (newPw !== confirmPw) { setError('Mật khẩu xác nhận không khớp'); return; }
    if (newPw === '1' || newPw === oldPw) { setError('Mật khẩu mới không được trùng mật khẩu cũ'); return; }

    setLoading(true);
    try {
      await changeMyPassword(oldPw, newPw);
      navigate(signedInPath(useStore.getState().user), { replace: true });
    } catch (err) {
      setError(err.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className={`px-6 py-5 ${isExpired ? 'bg-red-600' : 'bg-amber-500'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              {isExpired ? <AlertTriangle size={20} className="text-white" /> : <Lock size={20} className="text-white" />}
            </div>
            <div>
              <div className="text-white font-black text-base">
                {isExpired ? 'Mật khẩu đã hết hạn' : 'Cần đổi mật khẩu'}
              </div>
              <div className="text-white/80 text-xs">
                {isExpired
                  ? 'Mật khẩu mặc định đã quá 7 ngày. Vui lòng liên hệ quản lý.'
                  : 'Vui lòng đặt mật khẩu riêng để bảo vệ tài khoản của bạn.'}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
            👤 <strong>{user?.name}</strong> · {user?.id}
          </div>

          {/* Mật khẩu cũ — nếu không phải expired thì nhập 1 */}
          {!isExpired && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mật khẩu hiện tại</label>
              <div className="relative">
                <input
                  type={showOld ? 'text' : 'password'}
                  value={oldPw}
                  onChange={e => setOldPw(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại (mặc định: 1)"
                  className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button type="button" onClick={() => setShowOld(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* Mật khẩu mới */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Tối thiểu 8 ký tự, có số hoặc ký tự đặc biệt"
                className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {/* Strength indicator */}
            {newPw.length > 0 && (
              <div className="mt-1 flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                    i < (newPw.length >= 12 ? 4 : newPw.length >= 10 ? 3 : newPw.length >= 8 ? 2 : 1)
                      ? 'bg-emerald-400' : 'bg-slate-200'
                  }`} />
                ))}
              </div>
            )}
          </div>

          {/* Xác nhận mật khẩu */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 outline-none ${
                confirmPw && confirmPw !== newPw
                  ? 'border-red-300 focus:ring-red-400'
                  : 'border-slate-300 focus:ring-blue-500'
              }`}
            />
          </div>

          {/* Yêu cầu */}
          <div className="text-[11px] text-slate-500 bg-slate-50 rounded-xl px-3 py-2 space-y-0.5">
            <div className={newPw.length >= 8 ? 'text-emerald-600' : ''}>
              {newPw.length >= 8 ? '✓' : '○'} Tối thiểu 8 ký tự
            </div>
            <div className={hasPasswordNumberOrSymbol(newPw) ? 'text-emerald-600' : ''}>
              {hasPasswordNumberOrSymbol(newPw) ? '✓' : '○'} Có ít nhất 1 chữ số hoặc ký tự đặc biệt
            </div>
            <div className={confirmPw && confirmPw === newPw ? 'text-emerald-600' : ''}>
              {confirmPw && confirmPw === newPw ? '✓' : '○'} Mật khẩu xác nhận khớp
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2 flex items-start gap-2">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !newPw || !confirmPw}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <KeyRound size={16} />
            {loading ? 'Đang lưu...' : 'Đổi mật khẩu ngay'}
          </button>

          {/* Không cho phép bỏ qua nếu forced */}
          {!forced && (
            <button type="button" onClick={() => navigate(-1)}
              className="w-full text-xs text-slate-400 hover:text-slate-600 text-center py-1">
              Bỏ qua lần này
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
