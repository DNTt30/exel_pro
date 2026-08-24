import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import heroImg from '../assets/gs25_hero.jpg';
import { isOpsManager } from '../lib/authSession';
import { requestAdminOtp, verifyAdminOtp } from '../lib/adminOtp';
import { 
  LogIn,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck, 
  KeyRound, 
  ArrowRight,
  Store,
  Bot
} from 'lucide-react';

export default function Login() {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('1');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
    <div className="min-h-screen flex items-center justify-center p-0 sm:p-4 lg:p-8 relative overflow-hidden bg-slate-950 select-none">
      
      {/* Dynamic Keyframes & Styling */}
      <style>{`
        @keyframes blob-float {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.1); }
          66% { transform: translate(-25px, 25px) scale(0.95); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes particle-rise {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          20% { opacity: 0.7; }
          80% { opacity: 0.7; }
          100% { transform: translateY(-10vh) scale(1); opacity: 0; }
        }
        @keyframes kenburns {
          0% { transform: scale(1); }
          100% { transform: scale(1.08); }
        }
        @keyframes shimmer-sweep {
          0% { transform: translateX(-150%) skewX(-20deg); }
          100% { transform: translateX(250%) skewX(-20deg); }
        }
        .anim-blob-1 { animation: blob-float 18s ease-in-out infinite; }
        .anim-blob-2 { animation: blob-float 22s ease-in-out infinite reverse; }
        .anim-blob-3 { animation: blob-float 15s ease-in-out infinite 3s; }
        .anim-kenburns { animation: kenburns 25s ease-in-out infinite alternate; }
        .btn-shimmer::after {
          content: '';
          position: absolute;
          top: 0; left: 0; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          transform: translateX(-150%) skewX(-20deg);
        }
        .btn-shimmer:hover::after {
          animation: shimmer-sweep 1.2s ease-in-out infinite;
        }
      `}</style>

      {/* Ambient Animated Glow Mesh Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-blue-600/30 rounded-full blur-[120px] anim-blob-1" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-cyan-500/25 rounded-full blur-[140px] anim-blob-2" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px] anim-blob-3" />
        
        {/* Subtle Futuristic Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.07]" 
          style={{
            backgroundImage: `radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />

        {/* Floating Ambient Sparkles */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.8)] pointer-events-none hidden sm:block"
            style={{
              left: `${(i * 8.5 + 4)}%`,
              bottom: '-20px',
              width: i % 3 === 0 ? '6px' : '4px',
              height: i % 3 === 0 ? '6px' : '4px',
              animation: `particle-rise ${7 + (i % 5) * 2}s linear infinite`,
              animationDelay: `${-(i * 1.3)}s`
            }}
          />
        ))}
      </div>

      {/* Main Glassmorphic Login Container */}
      <div className="relative z-10 w-full max-w-5xl min-h-[620px] rounded-none sm:rounded-3xl overflow-hidden shadow-[0_25px_80px_-15px_rgba(0,0,0,0.8)] border border-white/10 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-slate-900/60 backdrop-blur-2xl">
        
        {/* ── LEFT SHOWCASE PANEL (Hero & Highlights) ── */}
        <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden border-r border-white/10">
          {/* Background Hero Image with Slow Cinematic Zoom */}
          <div className="absolute inset-0 overflow-hidden">
            <img 
              src={heroImg} 
              alt="GS25 Store" 
              className="w-full h-full object-cover anim-kenburns"
            />
            {/* Multi-layer Gradient Overlay for crisp contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-blue-950/75 to-slate-950/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/60" />
          </div>

          {/* Top Brand Pill */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-black tracking-widest text-cyan-300 uppercase">
                GS25 OFC OPERATIONS SYSTEM
              </span>
            </div>
          </div>

          {/* Center Brand Title & Core Value */}
          <div className="relative z-10 my-auto py-8">
            <h1 className="text-3xl xl:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-md">
              Điều Hành Lịch Ca & Quản Trị Chuỗi <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300">GS25</span>
            </h1>
            <p className="text-sm text-slate-300 font-medium mt-3 max-w-md leading-relaxed drop-shadow">
              Hệ thống xếp ca thông minh với AI Copilot, tự động kiểm soát hạn mức 91h Part-time và quản lý hàng date 24/7.
            </p>

            {/* Floating Glass Feature Badges */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-sm flex items-center gap-3 transition-transform hover:-translate-y-0.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  <Bot size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Xếp Ca AI GS25</span>
                  <span className="text-[10px] text-slate-300 block">Tự động hóa 100%</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-sm flex items-center gap-3 transition-transform hover:-translate-y-0.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Chu Kỳ 26 → 25</span>
                  <span className="text-[10px] text-slate-300 block">Định mức chuẩn PT</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Live System Indicator */}
          <div className="relative z-10 flex items-center justify-between text-xs text-slate-300 border-t border-white/10 pt-4 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Cơ sở dữ liệu Supabase kết nối trực tuyến</span>
            </div>
            <span className="text-cyan-300 font-mono font-bold">v2.5 Enterprise</span>
          </div>
        </div>

        {/* ── RIGHT LOGIN FORM PANEL ── */}
        <div className="bg-white/95 backdrop-blur-xl p-8 sm:p-10 lg:p-12 flex flex-col justify-between">
          
          {/* Header */}
          <div>
            {/* Brand Logo Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Store size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                    GS25 Workspace
                  </h2>
                  <span className="text-xs text-slate-500 font-semibold">Cổng đăng nhập nhân sự & quản lý</span>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                24/7 Portal
              </span>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-2xs">
                <span className="text-sm">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form Step: 2FA OTP */}
            {otpStep ? (
              <form onSubmit={submitOtp} className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-xs font-bold text-slate-700 mb-1">
                    Xác Thực Bảo Mật 2FA Quản Lý
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Mã xác thực 6 chữ số đã được gửi tới Telegram của Admin. Mã có hiệu lực trong 5 phút.
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="block w-full px-4 py-3 text-center text-2xl font-black tracking-[0.4em] border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-slate-900 outline-none shadow-xs"
                    placeholder="······"
                    autoFocus
                    required
                  />
                </div>

                {otpNote && <div className="text-xs text-slate-500 text-center">{otpNote}</div>}

                <button
                  type="submit"
                  disabled={otpBusy || otpCode.length !== 6}
                  className="btn-shimmer w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {otpBusy ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LogIn size={17} />
                  )}
                  <span>{otpBusy ? 'Đang xác minh...' : 'Xác Nhận Đăng Nhập'}</span>
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
              /* Standard Login Form */
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Employee ID Field */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mã Nhân Viên (9 Số)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <UserCheck size={17} />
                    </div>
                    <input
                      type="text"
                      value={empId}
                      onChange={e => setEmpId(e.target.value)}
                      className="block w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none font-medium text-slate-900 transition-all shadow-2xs"
                      placeholder="VD: 260716009 hoặc 260512008"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      Mật Khẩu
                    </label>
                    <span className="text-[11px] text-slate-400">Mặc định: 1</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound size={17} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-11 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none font-medium text-slate-900 transition-all shadow-2xs"
                      placeholder="Nhập mật khẩu..."
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Help */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-slate-600 font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                    />
                    <span>Ghi nhớ phiên đăng nhập</span>
                  </label>
                </div>

                {/* Submit Login Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-shimmer relative overflow-hidden w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-sm shadow-md shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all transform active:scale-[0.99] mt-2"
                >
                  {submitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LogIn size={17} />
                  )}
                  <span>{submitting ? 'Đang xác thực hệ thống...' : 'Đăng Nhập Ngay'}</span>
                  {!submitting && <ArrowRight size={15} className="ml-0.5 opacity-80" />}
                </button>
              </form>
            )}

          </div>

          {/* Footer Security Footnote */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <div className="flex items-center gap-1.5 text-slate-500">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Bảo mật SSL 256-bit</span>
            </div>
            <span>© GS25 Vietnam Co., Ltd.</span>
          </div>

        </div>

      </div>

    </div>
  );
}