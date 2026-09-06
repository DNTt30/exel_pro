import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import heroImg from '../assets/gs25_hero.jpg';
import { isOpsManager } from '../lib/authSession';
import { requestAdminOtp, verifyAdminOtp } from '../lib/adminOtp';
import ForgotPasswordModal from '../components/modals/ForgotPasswordModal';
import { 
  LogIn,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck, 
  KeyRound, 
  ArrowRight, 
  Store, 
  Clock, 
  ShieldAlert
} from 'lucide-react';

export default function Login() {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('1');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // ── Bước 2FA: nhập mã OTP gửi qua Telegram của admin ──
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpNote, setOtpNote] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const login = useStore(state => state.login);
  const navigate = useNavigate();

  // Đồng hồ thời gian thực
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

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
    await handleLogin();
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!empId.trim()) {
      setError('Vui lòng nhập mã nhân viên');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const user = await login(empId.trim(), password);
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
        setError(err.message || 'Đăng nhập không thành công');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-6 lg:p-10 relative overflow-y-auto lg:overflow-hidden bg-[#050811] text-slate-100 select-none">
      
      {/* ── Advanced Futuristic Animations ── */}
      <style>{`
        @keyframes aurora-orbit-1 {
          0%, 100% { transform: translate(0px, 0px) scale(1) rotate(0deg); opacity: 0.45; }
          33% { transform: translate(60px, -60px) scale(1.2) rotate(120deg); opacity: 0.65; }
          66% { transform: translate(-50px, 40px) scale(0.9) rotate(240deg); opacity: 0.4; }
        }
        @keyframes aurora-orbit-2 {
          0%, 100% { transform: translate(0px, 0px) scale(1) rotate(0deg); opacity: 0.4; }
          33% { transform: translate(-60px, 50px) scale(1.15) rotate(-100deg); opacity: 0.6; }
          66% { transform: translate(40px, -40px) scale(0.95) rotate(-200deg); opacity: 0.35; }
        }
        @keyframes wave-wiggle {
          0%, 100% { transform: rotate(0deg); }
          20%, 60% { transform: rotate(14deg); }
          40%, 80% { transform: rotate(-10deg); }
        }
        @keyframes shimmer-ray {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(250%); }
        }
        @keyframes border-glow-cycle {
          0%, 100% { border-color: rgba(56, 189, 248, 0.45); box-shadow: 0 0 35px rgba(56, 189, 248, 0.2); }
          50% { border-color: rgba(99, 102, 241, 0.55); box-shadow: 0 0 45px rgba(99, 102, 241, 0.25); }
        }
        @keyframes meteor-pass {
          0% { transform: rotate(215deg) translateX(0); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: rotate(215deg) translateX(-650px); opacity: 0; }
        }
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-reverse-slow {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }

        .anim-aurora-1 { animation: aurora-orbit-1 20s ease-in-out infinite; }
        .anim-aurora-2 { animation: aurora-orbit-2 25s ease-in-out infinite; }
        .anim-border-glow { animation: border-glow-cycle 8s ease-in-out infinite; }
        .anim-float { animation: float-gentle 5s ease-in-out infinite; }
        .anim-spin-slow { animation: spin-slow 30s linear infinite; }
        .anim-spin-reverse { animation: spin-reverse-slow 22s linear infinite; }
        
        .anim-wave {
          display: inline-block;
          transform-origin: 75% 75%;
          animation: wave-wiggle 2.2s infinite ease-in-out;
        }

        .btn-shimmer-effect {
          position: relative;
          overflow: hidden;
        }
        .btn-shimmer-effect::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 65%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
          transform: translateX(-120%);
          animation: shimmer-ray 3.5s infinite ease-in-out;
        }
      `}</style>

      {/* ── Ambient Background Lighting & Cyber Grid ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glowing Aurora Spheres */}
        <div className="absolute -top-32 -left-32 w-[650px] h-[650px] bg-gradient-to-br from-blue-600/45 via-cyan-500/30 to-transparent rounded-full blur-[140px] anim-aurora-1" />
        <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-gradient-to-tl from-indigo-600/40 via-sky-500/25 to-transparent rounded-full blur-[150px] anim-aurora-2" />
        <div className="absolute top-1/2 left-1/3 w-[450px] h-[450px] bg-gradient-to-r from-purple-600/25 via-blue-500/20 to-transparent rounded-full blur-[130px] opacity-70" />

        {/* Cyberpunk Subtle Perspective Grid */}
        <div 
          className="absolute inset-0 opacity-[0.05]" 
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px'
          }}
        />

        {/* Ambient Shooting Meteors */}
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute h-0.5 bg-gradient-to-l from-cyan-400 via-sky-300 to-transparent rounded-full pointer-events-none hidden md:block"
            style={{
              top: `${18 + i * 28}%`,
              right: `${8 + i * 25}%`,
              width: `${140 + i * 50}px`,
              animation: `meteor-pass ${7 + i * 3}s linear infinite`,
              animationDelay: `${i * 2.8}s`
            }}
          />
        ))}

        {/* Cyber Particles */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-cyan-300/80 shadow-[0_0_8px_#38bdf8] pointer-events-none hidden sm:block"
            style={{
              left: `${(i * 8 + 4)}%`,
              bottom: `${(i * 7 + 6)}%`,
              width: i % 2 === 0 ? '4px' : '3px',
              height: i % 2 === 0 ? '4px' : '3px',
              opacity: 0.25 + (i % 3) * 0.2,
              animation: `float-gentle ${4 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${-(i * 0.7)}s`
            }}
          />
        ))}
      </div>

      {/* ── Main Neo-Glass Container ── */}
      <div className="relative z-10 w-full max-w-4xl my-auto min-h-0 lg:min-h-[580px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_30px_100px_-15px_rgba(0,0,0,0.95)] border border-white/20 anim-border-glow grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-slate-900/75 backdrop-blur-3xl transition-all duration-300">
        
        {/* ── LEFT SHOWCASE PANEL (Minimalist Animation Focus) ── */}
        <div className="relative hidden lg:flex flex-col justify-between p-8 xl:p-10 overflow-hidden border-r border-white/10">
          
          {/* Subtle Ambient Background Layer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img 
              src={heroImg} 
              alt="GS25 Atmosphere" 
              className="w-full h-full object-cover opacity-30 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060a14] via-[#070e1e]/90 to-[#060a14]/75" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#060a14] via-transparent to-[#060a14]/90" />
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />
          </div>

          {/* Top Status Bar */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <span className="text-[11px] font-black tracking-widest text-cyan-300 uppercase">
                GS25 PORTAL
              </span>
            </div>

            {currentTime && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/15 text-slate-300 font-mono text-xs font-bold shadow-inner">
                <Clock size={13} className="text-cyan-400" />
                <span>{currentTime}</span>
              </div>
            )}
          </div>

          {/* Center Stage: Futuristic Animated Core & Minimal Title */}
          <div className="relative z-10 my-auto py-6 flex flex-col items-center text-center">
            
            {/* Animated Concentric Cyber Rings */}
            <div className="relative w-44 h-44 flex items-center justify-center anim-float mb-6">
              {/* Outer Ring */}
              <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/30 anim-spin-slow" />
              {/* Middle Glowing Ring */}
              <div className="absolute inset-3 rounded-full border border-indigo-400/40 anim-spin-reverse shadow-[0_0_20px_rgba(99,102,241,0.2)]" />
              {/* Inner Ambient Glow Core */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-600/30 to-indigo-600/20 backdrop-blur-xl border border-white/25 flex items-center justify-center shadow-inner">
                <Store size={38} className="text-cyan-300 drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]" />
              </div>
            </div>

            <h1 className="text-2xl xl:text-3xl font-black text-white tracking-tight leading-tight">
              GS25 Workspace
            </h1>
            
            <p className="text-xs text-slate-400 mt-2 font-medium max-w-xs leading-relaxed">
              Cổng quản trị điều hành & phân ca nhân sự tập trung
            </p>

            {/* Minimal Status Pills */}
            <div className="flex items-center gap-2 mt-5">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-cyan-300">
                ⚡ Tốc độ cao
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-indigo-300">
                🛡️ Bảo mật
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-emerald-300">
                🤖 AI Copilot
              </span>
            </div>

          </div>

          {/* Bottom Footer Status */}
          <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-3 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-300 text-xs font-semibold">Hệ thống trực tuyến</span>
            </div>
            <span className="text-cyan-300 font-mono font-bold bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-400/30 text-[11px]">
              v2.5 Pro
            </span>
          </div>

        </div>

        {/* ── RIGHT LOGIN FORM PANEL (Clean Minimalist Glass) ── */}
        <div className="bg-white/95 backdrop-blur-3xl p-6 sm:p-9 lg:p-10 flex flex-col justify-between relative text-slate-900">
          
          {/* Subtle Ambient Accent */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-bl-full pointer-events-none blur-3xl" />

          <div>
            
            {/* Header Brand */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 anim-float">
                  <Store size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                    Đăng Nhập
                    <span className="anim-wave inline-block text-lg">👋</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Chào mừng bạn trở lại hệ thống
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] sm:text-[11px] font-bold shadow-2xs">
                Portal 24/7
              </span>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200 shadow-2xs">
                <ShieldAlert size={16} className="shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* ── Form Step 1: 2FA OTP ── */}
            {otpStep ? (
              <form onSubmit={submitOtp} className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-100 text-center">
                  <div className="w-11 h-11 mx-auto rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-md shadow-blue-500/20">
                    <ShieldCheck size={22} />
                  </div>
                  <p className="text-xs font-bold text-slate-800 mb-1">
                    Xác Thực Bảo Mật 2FA
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Mã xác nhận 6 số đã được gửi qua Telegram của Admin.
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="block w-full px-4 py-3 text-center text-2xl font-black tracking-[0.4em] border border-blue-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-slate-900 outline-none shadow-xs"
                    placeholder="······"
                    autoFocus
                    required
                  />
                </div>

                {otpNote && <div className="text-xs text-slate-500 text-center font-medium">{otpNote}</div>}

                <button
                  type="submit"
                  disabled={otpBusy || otpCode.length !== 6}
                  className="btn-shimmer-effect w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm shadow-md shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {otpBusy ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LogIn size={17} />
                  )}
                  <span>{otpBusy ? 'Đang xác minh...' : 'Xác Nhận'}</span>
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => sendOtp(true)}
                    disabled={otpBusy || cooldown > 0}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 disabled:text-slate-400 cursor-pointer"
                  >
                    {cooldown > 0 ? `Gửi lại sau (${cooldown}s)` : 'Gửi lại mã'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOtpStep(false); setOtpCode(''); setError(''); }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    ← Quay lại
                  </button>
                </div>
              </form>
            ) : (
              /* ── Form Step 2: Standard Login Form ── */
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Employee ID Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mã nhân viên / Tài khoản
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <UserCheck size={18} />
                    </div>
                    <input
                      type="text"
                      value={empId}
                      onChange={e => setEmpId(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 text-sm bg-slate-50/90 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none font-semibold text-slate-900 transition-all shadow-2xs placeholder:text-slate-400"
                      placeholder="VD: 251104004 hoặc admin"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mật khẩu
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <KeyRound size={18} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-11 py-3 text-sm bg-slate-50/90 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none font-semibold text-slate-900 transition-all shadow-2xs placeholder:text-slate-400"
                      placeholder="Nhập mật khẩu..."
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 text-slate-600 font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                    />
                    <span>Ghi nhớ đăng nhập</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Mặc định: <strong className="font-mono text-slate-600">1</strong></span>
                </div>

                {/* Submit Login Button with Shimmer Ray */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-shimmer-effect relative w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm shadow-lg shadow-blue-500/35 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 transition-all transform active:scale-[0.99] mt-3"
                >
                  {submitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LogIn size={18} />
                  )}
                  <span>{submitting ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
                  {!submitting && <ArrowRight size={16} className="ml-0.5 opacity-90" />}
                </button>
              </form>
            )}

          </div>

          {/* Footer Security Footnote */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <div className="flex items-center gap-1.5 text-slate-500">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Bảo mật SSL 256-bit</span>
            </div>
            <span>GS25 Workspace</span>
          </div>

        </div>

      </div>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmpId={empId}
        onUseDefaultPassword={() => setPassword('1')}
      />
    </div>
  );
}
