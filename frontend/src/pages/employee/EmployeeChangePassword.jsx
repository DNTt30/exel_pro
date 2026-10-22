/**
 * EmployeeChangePassword.jsx
 * Trang đổi mật khẩu cho nhân viên (bắt buộc khi dùng mật khẩu mặc định hoặc tự đổi từ Hồ sơ).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasPasswordNumberOrSymbol, validateNewPassword } from '../../utils/passwordPolicy';
import { signedInPath } from '../../utils/authNavigation';
import { useStore } from '../../store/useStore';
import { KeyRound, Eye, EyeOff, AlertTriangle, Lock, ArrowLeft } from 'lucide-react';

export default function EmployeeChangePassword() {
  const navigate = useNavigate();
  const user = useStore(s => s.user);
  const changeMyPassword = useStore(s => s.changeMyPassword);

  const forced = !!user?.mustChangePassword;

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl w-full max-w-md overflow-hidden">
        {/* Header dịu mắt, đồng bộ với SecurityChangePassword */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 ${
              isExpired
                ? 'bg-gradient-to-tr from-rose-500 to-red-600'
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
            }`}
          >
            {isExpired ? <AlertTriangle size={20} /> : <Lock size={20} />}
          </div>
          <div>
            <h1 className="text-slate-900 font-extrabold text-base leading-tight">
              {isExpired ? 'Mật khẩu đã hết hạn' : forced ? 'Cần đổi mật khẩu lần đầu' : 'Đổi mật khẩu tài khoản'}
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              {isExpired
                ? 'Mật khẩu mặc định đã quá 7 ngày. Vui lòng liên hệ quản lý.'
                : 'Thiết lập mật khẩu cá nhân an toàn để bảo vệ tài khoản.'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 border border-slate-200/70 rounded-xl px-3.5 py-2.5">
            <span>👤 <strong>{user?.name}</strong></span>
            <span className="font-mono text-slate-500">{user?.id}</span>
          </div>

          {/* Mật khẩu hiện tại */}
          {!isExpired && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Mật khẩu hiện tại</label>
              <div className="relative">
                <input
                  type={showOld ? 'text' : 'password'}
                  value={oldPw}
                  onChange={e => setOldPw(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại (mặc định: 1)"
                  className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* Mật khẩu mới */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Tối thiểu 8 ký tự, có số hoặc ký tự đặc biệt"
                className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {newPw.length > 0 && (
              <div className="mt-1.5 flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < (newPw.length >= 12 ? 4 : newPw.length >= 10 ? 3 : newPw.length >= 8 ? 2 : 1)
                        ? 'bg-emerald-500'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Xác nhận mật khẩu */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 outline-none ${
                confirmPw && confirmPw !== newPw
                  ? 'border-rose-300 focus:ring-rose-400/20 focus:border-rose-500'
                  : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-500'
              }`}
            />
          </div>

          {/* Yêu cầu */}
          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200/70 rounded-xl px-3.5 py-2.5 space-y-1">
            <div className={newPw.length >= 8 ? 'text-emerald-600 font-semibold' : ''}>
              {newPw.length >= 8 ? '✓' : '○'} Tối thiểu 8 ký tự
            </div>
            <div className={hasPasswordNumberOrSymbol(newPw) ? 'text-emerald-600 font-semibold' : ''}>
              {hasPasswordNumberOrSymbol(newPw) ? '✓' : '○'} Có ít nhất 1 chữ số hoặc ký tự đặc biệt
            </div>
            <div className={confirmPw && confirmPw === newPw ? 'text-emerald-600 font-semibold' : ''}>
              {confirmPw && confirmPw === newPw ? '✓' : '○'} Mật khẩu xác nhận khớp
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl px-3.5 py-2.5 flex items-start gap-2">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !newPw || !confirmPw}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <KeyRound size={16} />
            <span>{loading ? 'Đang lưu...' : 'Cập nhật mật khẩu'}</span>
          </button>

          {!forced && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 text-center py-1.5 cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Quay lại</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
