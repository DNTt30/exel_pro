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
    <div className="lgx-root min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <style>{`
        .lgx-root { background: radial-gradient(1200px 800px at 20% 10%, #1e3a8a55, transparent 60%),
                                radial-gradient(1000px 700px at 85% 90%, #4338ca44, transparent 60%),
                                linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #111827 100%); }
        @keyframes lgx-drift { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(40px,-30px) scale(1.15); } 66% { transform: translate(-30px,25px) scale(0.9); } }
        @keyframes lgx-rise { from { transform: translateY(110vh); opacity: 0; } 10% { opacity: .7; } 90% { opacity: .5; } to { transform: translateY(-10vh); opacity: 0; } }
        @keyframes lgx-card-in { from { opacity: 0; transform: translateY(26px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes lgx-stagger { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes lgx-spin { to { transform: rotate(360deg); } }
        @keyframes lgx-pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(96,165,250,.45); } 70% { box-shadow: 0 0 0 16px rgba(96,165,250,0); } 100% { box-shadow: 0 0 0 0 rgba(96,165,250,0); } }
        @keyframes lgx-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes lgx-shine { 0% { left: -60%; } 60%,100% { left: 130%; } }
        @keyframes lgx-shake { 10%,90% { transform: translateX(-2px); } 30%,70% { transform: translateX(3px); } 50% { transform: translateX(-4px); } }
        @keyframes lgx-border-rot { to { transform: rotate(360deg); } }
        .lgx-blob { position:absolute; border-radius:9999px; filter: blur(70px); pointer-events:none; animation: lgx-drift 14s ease-in-out infinite; }
        .lgx-dot { position:absolute; bottom:-12px; width:6px; height:6px; border-radius:9999px; background:rgba(147,197,253,.65); animation: lgx-rise linear infinite; pointer-events:none; }
        .lgx-card { animation: lgx-card-in .55s cubic-bezier(.22,1,.36,1) both; }
        .lgx-item { animation: lgx-stagger .5s cubic-bezier(.22,1,.36,1) both; }
        .lgx-logo-wrap { position:relative; width:64px; height:64px; margin:0 auto 12px; }
        .lgx-logo-ring { position:absolute; inset:-7px; border-radius:18px; background:conic-gradient(from 0deg,#3b82f6,#8b5cf6,#ec4899,#3b82f6); animation: lgx-border-rot 5s linear infinite; filter: blur(6px); opacity:.75; }
        .lgx-logo { position:relative; width:64px; height:64px; border-radius:16px; display:flex; align-items:center; justify-content:center; color:#fff;
                    background:linear-gradient(135deg,#2563eb,#4f46e5); box-shadow:0 10px 24px -6px rgba(37,99,235,.5); animation: lgx-pulse-ring 2.6s ease-out infinite; }
        .lgx-logo > svg { animation: lgx-bob 3.4s ease-in-out infinite; }
        .lgx-btn { position:relative; overflow:hidden; background:linear-gradient(90deg,#2563eb,#4f46e5,#7c3aed); background-size:200% 100%; transition:all .25s; }
        .lgx-btn:hover:not(:disabled) { background-position:100% 0; transform: translateY(-1px); box-shadow:0 12px 22px -8px rgba(79,70,229,.55); }
        .lgx-btn::after { content:''; position:absolute; top:0; bottom:0; width:40%; left:-60%; background:linear-gradient(105deg,transparent,rgba(255,255,255,.35),transparent); transform:skewX(-18deg); }
        .lgx-btn:hover:not(:disabled)::after { animation: lgx-shine .9s ease; }
        .lgx-input { transition:border-color .2s, box-shadow .2s, background .2s; }
        .lgx-input:focus-within { transform: translateY(-1px); }
        .lgx-shake { animation: lgx-shake .45s ease; }
        @media (prefers-reduced-motion: reduce) { .lgx-blob,.lgx-dot,.lgx-logo-ring,.lgx-logo>svg,.lgx-logo{animation:none !important;} }
      `}</style>

      {/* Khối sáng trôi + hạt bay */}
      <div className="lgx-blob" style={{ top: '-8%', left: '-6%', width: 340, height: 340, background: 'rgba(59,130,246,.28)', animationDelay: '0s' }} />
      <div className="lgx-blob" style={{ bottom: '-10%', right: '-8%', width: 380, height: 380, background: 'rgba(99,102,241,.26)', animationDelay: '-5s' }} />
      <div className="lgx-blob" style={{ top: '40%', left: '55%', width: 260, height: 260, background: 'rgba(236,72,153,.16)', animationDelay: '-9s' }} />
      {[...Array(9)].map((_, i) => (
        <span key={i} className="lgx-dot" style={{ left: (i * 11 + 4) + '%', animationDuration: (7 + (i % 4) * 2.5) + 's', animationDelay: -(i * 1.7) + 's', width: i % 3 === 0 ? 8 : 5, height: i % 3 === 0 ? 8 : 5 }} />
      ))}

      <div className="lgx-card bg-white/[.96] backdrop-blur-md rounded-3xl shadow-[0_24px_70px_-18px_rgba(0,0,0,.6)] w-full max-w-md p-6 sm:p-8 border border-white/40 relative z-10">
        {/* Logo + tiêu đề */}
        <div className="text-center mb-6">
          <div className="lgx-logo-wrap">
            <div className="lgx-logo-ring" />
            <div className="lgx-logo"><Building2 size={30} /></div>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight lgx-item" style={{ animationDelay: '.08s' }}>OFC SCHEDULE APP</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 lgx-item" style={{ animationDelay: '.16s' }}>Hệ thống Xếp lịch & Feedback C&B Chuỗi Cửa Hàng</p>
          <p className="text-[11px] text-slate-400 mt-2 lgx-item" style={{ animationDelay: '.24s' }}>Dữ liệu lưu cloud Supabase · 100 NV đăng nhập cùng lúc.</p>
        </div>

        {error && (
          <div className="lgx-shake mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        {otpStep ? (
          <form onSubmit={submitOtp} className="space-y-4">
            <div className="lgx-item p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold flex items-start gap-2" style={{ animationDelay: '.05s' }}>
              <Send size={14} className="mt-0.5 flex-shrink-0" />
              <span>Mã 6 số đã gửi tới Telegram của admin. Hiệu lực 5 phút — thiết bị này được ghi nhớ 30 ngày.</span>
            </div>
            {otpNote && <div className="text-xs font-semibold text-slate-500">{otpNote}</div>}
            <div className="lgx-input lgx-item" style={{ animationDelay: '.12s' }}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Mã xác thực (OTP)</label>
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
            <button type="submit" disabled={otpBusy || otpCode.length !== 6}
              className="lgx-btn w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold text-white shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-60 lgx-item"
              style={{ animationDelay: '.2s' }}>
              {otpBusy ? (<span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" style={{ animation: 'lgx-spin .7s linear infinite' }} />) : <LogIn size={18} />}
              {otpBusy ? 'Đang xác minh...' : 'Xác nhận & đăng nhập'}
            </button>
            <button type="button" onClick={() => sendOtp(true)} disabled={otpBusy || cooldown > 0}
              className="w-full text-xs font-bold text-blue-600 hover:text-blue-700 disabled:text-slate-400 transition-colors lgx-item" style={{ animationDelay: '.26s' }}>
              {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : otpBusy ? 'Đang gửi...' : 'Gửi lại mã'}
            </button>
            <button type="button" onClick={() => { setOtpStep(false); setOtpCode(''); setError(''); }}
              className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors">
              ← Quay lại đăng nhập
            </button>
          </form>
        ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="lgx-input lgx-item" style={{ animationDelay: '.08s' }}>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Tài khoản (Mã NV hoặc admin)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><UserCircle size={18} /></div>
              <input type="text" value={empId} onChange={e => setEmpId(e.target.value)}
                className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 font-medium outline-none"
                placeholder="Nhập mã nhân viên hoặc admin..." required />
            </div>
          </div>

          <div className="lgx-input lgx-item" style={{ animationDelay: '.16s' }}>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Mật khẩu (Mặc định là 1)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Lock size={18} /></div>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className="block w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 font-medium outline-none"
                placeholder="Nhập mật khẩu..." required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="lgx-btn w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold text-white shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-60 lgx-item"
            style={{ animationDelay: '.24s' }}>
            {submitting ? (<span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" style={{ animation: 'lgx-spin .7s linear infinite' }} />) : <LogIn size={18} />}
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