import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { LogIn, UserCircle, Lock, Eye, EyeOff, Sparkles, Building2 } from 'lucide-react';

export default function Login() {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('1');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const login = useStore(state => state.login);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setError('');
    try {
      login(empId, password);
      const user = useStore.getState().user;
      if (user.role === 'admin' || user.isManager) {
        navigate('/admin/schedule');
      } else {
        navigate('/employee/schedule');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleQuickLogin = (id, pass = '1') => {
    setEmpId(id);
    setPassword(pass);
    setError('');
    try {
      login(id, pass);
      const user = useStore.getState().user;
      if (user.role === 'admin' || user.isManager) {
        navigate('/admin/schedule');
      } else {
        navigate('/employee/schedule');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-4 py-8 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 border border-white/20 relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white mb-3 shadow-lg shadow-blue-500/25">
            <Building2 size={28} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">OFC SCHEDULE APP</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">Hệ thống Xếp lịch & Feedback C&B Chuỗi Cửa Hàng</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-shake">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Tài khoản (Mã NV hoặc admin)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserCircle size={18} />
              </div>
              <input
                type="text"
                value={empId}
                onChange={e => setEmpId(e.target.value)}
                className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 font-medium transition-all outline-none"
                placeholder="Nhập mã nhân viên hoặc admin..."
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Mật khẩu (Mặc định là 1)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="block w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 font-medium transition-all outline-none"
                placeholder="Nhập mật khẩu..."
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <LogIn size={18} />
            Đăng Nhập
          </button>
        </form>
        
        {/* Quick Demo Accounts */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            <Sparkles size={12} className="text-amber-500" />
            <span>Tài khoản thử nghiệm nhanh (Click để vào):</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', '1')}
              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold text-left transition-colors flex flex-col"
            >
              <span>👑 Quản trị viên</span>
              <span className="text-[10px] text-purple-500 font-mono font-normal">admin (pass: 1)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('260520021', '1')}
              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold text-left transition-colors flex flex-col"
            >
              <span>👤 Hoàng Thị Huyền</span>
              <span className="text-[10px] text-blue-500 font-mono font-normal">260520021 (pass: 1)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}