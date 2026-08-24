import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { isOpsManager } from '../lib/authSession';
import { requestAdminOtp, verifyAdminOtp } from '../lib/adminOtp';
import { LogIn, UserCircle, Lock, Eye, EyeOff, Building2, Send } from 'lucide-react';

export default function Login() {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('1');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Bước 2FA: nhập mã OTP gửi qua Telegram của admin ──
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpNote, setOtpNote] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const login = useStore(state => state.login);
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = async (isResend) => {
    setOtpBusy(true);
    setOtpNote('');
    const r = await requestAdminOtp();
    setOtpBusy(false);
    if (!r.ok) {
      setOtpNote(r.reason === 'cooldown'
        ? 'Mã trước vẫn còn hiệu lực — hãy kiểm tra Telegram.'
        : 'Không gửi được mã. Kiểm tra cấu hình 2FA rồi thử "Gửi lại mã".');
      return;
    }
    setCooldown(60);
    if (isResend) setOtpNote('Đã gửi lại mã — kiểm tra Telegram của admin.');
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    if (otpBusy) return;
    setOtpBusy(true);
    setError('');
    const r = await verifyAdminOtp(otpCode);
    if (!r.ok) {
      setOtpBusy(false);
      setError(r.reason === 'wrong' ? 'Mã không đúng — thử lại.'
        : r.reason === 'expired' ? 'Mã hết hạn hoặc sai quá 5 lần — gửi lại mã mới.'
        : 'Xác minh lỗi, thử lại.');
      return;
    }
    setOtpBusy(false);
    await handleLogin(); // thiết bị đã tin tưởng → vào thẳng
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(empId, password);
      if (isOpsManager(user)) {
        navigate('/admin/dashboard');
      } else {
        navigate('/employee/home');
      }
    } catch (err) {
      if (err.code === 'OTP_REQUIRED') {
        setOtpStep(true);
        setError('');
        sendOtp(false);
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
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
          <p className="text-[11px] text-slate-400 mt-2">Dữ liệu lưu cloud Supabase, tự đồng bộ khi bạn lưu. 100 NV có thể đăng nhập cùng lúc.</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-shake">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {otpStep ? (
          <form onSubmit={submitOtp} className="space-y-4">
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold flex items-start gap-2">
              <Send size={14} className="mt-0.5 flex-shrink-0" />
              <span>Mã 6 số đã gửi tới Telegram của admin. Mã có hiệu lực 5 phút, thiết bị này sẽ được ghi nhớ 30 ngày.</span>
            </div>
            {otpNote && (
              <div className="text-xs font-semibold text-slate-500">{otpNote}</div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Mã xác thực (OTP)
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="block w-full px-3 py-3 text-center text-2xl font-black tracking-[0.45em] border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 outline-none"
                placeholder="······"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={otpBusy || otpCode.length !== 6}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              <LogIn size={18} />
              {otpBusy ? 'Đang xác minh...' : 'Xác nhận & đăng nhập'}
            </button>
            <button
              type="button"
              onClick={() => sendOtp(true)}
              disabled={otpBusy || cooldown > 0}
              className="w-full text-xs font-bold text-blue-600 hover:text-blue-700 disabled:text-slate-400 transition-colors"
            >
              {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : otpBusy ? 'Đang gửi...' : 'Gửi lại mã'}
            </button>
            <button
              type="button"
              onClick={() => { setOtpStep(false); setOtpCode(''); setError(''); }}
              className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              ← Quay lại đăng nhập
            </button>
          </form>
        ) : (
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
            disabled={submitting}
            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60"
          >
            <LogIn size={18} />
            {submitting ? 'Đang đăng nhập...' : 'Đăng Nhập'}
          </button>
        </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Hệ thống quản lý nội bộ chuỗi cửa hàng OFC. Vui lòng liên hệ Quản lý chi nhánh (SM) nếu quên mật khẩu.
          </p>
        </div>
      </div>
    </div>
  );
}