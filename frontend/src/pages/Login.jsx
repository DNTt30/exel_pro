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
  Bot,
  Sparkles,
  Clock,
  Crown,
  Zap
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

  const handleQuickSelect = (id, pass = '1') => {
    setEmpId(id);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-6 lg:p-10 relative overflow-hidden bg-[#070b14] select-none">
      
      {/* ── Advanced Animation Styles ── */}
      <style>{`
        @keyframes aurora-1 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0.35; }
          33% { transform: translate(60px, -50px) scale(1.2) rotate(120deg); opacity: 0.55; }
          66% { transform: translate(-40px, 40px) scale(0.9) rotate(240deg); opacity: 0.4; }
        }
        @keyframes aurora-2 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0.3; }
          33% { transform: translate(-50px, 60px) scale(1.15) rotate(-90deg); opacity: 0.5; }
          66% { transform: translate(40px, -30px) scale(0.95) rotate(-180deg); opacity: 0.35; }
        }
        @keyframes aurora-3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; }
          50% { transform: translate(30px, 40px) scale(1.1); opacity: 0.45; }
        }
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes kenburns-slow {
          0% { transform: scale(1.02) translate(0, 0); }
          50% { transform: scale(1.08) translate(-1%, -1%); }
          100% { transform: scale(1.02) translate(0, 0); }
        }
        @keyframes neon-border {
          0%, 100% { border-color: rgba(56, 189, 248, 0.4); box-shadow: 0 0 25px rgba(56, 189, 248, 0.15); }
          50% { border-color: rgba(99, 102, 241, 0.5); box-shadow: 0 0 35px rgba(99, 102, 241, 0.25); }
        }
        @keyframes meteor {
          0% { transform: rotate(215deg) translateX(0); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: rotate(215deg) translateX(-600px); opacity: 0; }
        }

        .anim-aurora-1 { animation: aurora-1 18s ease-in-out infinite; }
        .anim-aurora-2 { animation: aurora-2 22s ease-in-out infinite; }
        .anim-aurora-3 { animation: aurora-3 15s ease-in-out infinite; }
        .anim-float { animation: float-gentle 6s ease-in-out infinite; }
        .anim-kenburns { animation: kenburns-slow 35s ease-in-out infinite; }
        .anim-neon-card { animation: neon-border 8s ease-in-out infinite; }

        .btn-glow-effect {
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-glow-effect::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(60deg, transparent, rgba(255,255,255,0.25), transparent);
          transform: rotate(30deg) translateY(-100%);
          transition: transform 0.75s ease-in-out;
        }
        .btn-glow-effect:hover::before {
          transform: rotate(30deg) translateY(100%);
        }
      `}</style>

      {/* ── Dynamic Ambient Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glowing Aurora Spheres */}
        <div className="absolute -top-40 -left-40 w-[650px] h-[650px] bg-gradient-to-br from-blue-600/40 via-cyan-500/25 to-transparent rounded-full blur-[140px] anim-aurora-1" />
        <div className="absolute -bottom-48 -right-48 w-[700px] h-[700px] bg-gradient-to-tl from-indigo-600/35 via-sky-500/20 to-transparent rounded-full blur-[150px] anim-aurora-2" />
        <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-gradient-to-r from-purple-600/20 via-blue-500/20 to-transparent rounded-full blur-[120px] anim-aurora-3" />

        {/* Futuristic Cyber Matrix Grid */}
        <div 
          className="absolute inset-0 opacity-[0.06]" 
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Ambient Shooting Meteors */}
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute h-0.5 bg-gradient-to-l from-cyan-400 via-sky-300 to-transparent rounded-full pointer-events-none hidden md:block"
            style={{
              top: `${15 + i * 22}%`,
              right: `${10 + i * 20}%`,
              width: `${120 + i * 40}px`,
              animation: `meteor ${6 + i * 3}s linear infinite`,
              animationDelay: `${i * 2.5}s`
            }}
          />
        ))}

        {/* Floating Cyber Particle Dots */}
        {[...Array(14)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-cyan-300/80 shadow-[0_0_8px_#38bdf8] pointer-events-none hidden sm:block"
            style={{
              left: `${(i * 7.2 + 3)}%`,
              bottom: `${(i * 6.5 + 5)}%`,
              width: i % 3 === 0 ? '5px' : '3px',
              height: i % 3 === 0 ? '5px' : '3px',
              opacity: 0.3 + (i % 4) * 0.15,
              animation: `float-gentle ${4 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${-(i * 0.8)}s`
            }}
          />
        ))}
      </div>

      {/* ── Main Futuristic Glass Card ── */}
      <div className="relative z-10 w-full max-w-5xl min-h-[640px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_30px_90px_-15px_rgba(0,0,0,0.9)] border border-white/15 anim-neon-card grid grid-cols-1 lg:grid-cols-[1.12fr_1fr] bg-slate-900/60 backdrop-blur-2xl transition-all duration-300">
        
        {/* ── LEFT SHOWCASE PANEL ── */}
        <div className="relative hidden lg:flex flex-col justify-between p-10 xl:p-12 overflow-hidden border-r border-white/10">
          {/* Background Image with Slow Breathing Zoom */}
          <div className="absolute inset-0 overflow-hidden">
            <img 
              src={heroImg} 
              alt="GS25 Store Ambient" 
              className="w-full h-full object-cover anim-kenburns opacity-70"
            />
            {/* Multi-layer Gradient Mask */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#0b1329]/80 to-[#070b14]/50" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070b14]/90 via-transparent to-[#070b14]/70" />
            
            {/* Laser Scanning Line */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-40 animate-pulse" />
          </div>

          {/* Top Brand Pill & Realtime Clock */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
              <div className="relative flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <div className="absolute w-4 h-4 rounded-full border border-cyan-400/80 animate-ping" />
              </div>
              <span className="text-xs font-black tracking-widest text-cyan-300 uppercase">
                GS25 OPERATIONS SYSTEM
              </span>
            </div>

            {currentTime && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/15 text-slate-300 font-mono text-xs font-bold shadow-inner">
                <Clock size={12} className="text-cyan-400" />
                <span>{currentTime}</span>
              </div>
            )}
          </div>

          {/* Center Content: Brand Title & Value Props */}
          <div className="relative z-10 my-auto py-8">
            <div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-extrabold uppercase tracking-wider mb-2">
              <Sparkles size={14} className="animate-spin" style={{ animationDuration: '8s' }} />
              <span>Next-Gen Retail Scheduling & Ops</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
              Hệ Thống Điều Hành <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300">
                Chuỗi Cửa Hàng GS25
              </span>
            </h1>

            <p className="text-sm text-slate-300 font-normal mt-3.5 max-w-md leading-relaxed drop-shadow">
              Nền tảng quản trị ca kíp tự động bằng AI Copilot, kiểm soát hạn mức 91h Part-time chuẩn chu kỳ và vận hành SOP 24/7.
            </p>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-2 gap-3 mt-7">
              <div className="p-3.5 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 shadow-sm hover:bg-white/[0.12] transition-all group">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 group-hover:scale-110 transition-transform">
                    <Bot size={17} />
                  </div>
                  <span className="text-xs font-black text-white">AI Copilot</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-tight">
                  Tự động xếp ca thông minh & giải đáp SOP vận hành.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 shadow-sm hover:bg-white/[0.12] transition-all group">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 group-hover:scale-110 transition-transform">
                    <Zap size={17} />
                  </div>
                  <span className="text-xs font-black text-white">Chu Kỳ 26 → 25</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-tight">
                  Kiểm soát tuyệt đối trần 91h Part-time chống vượt quỹ.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Status Ticker */}
          <div className="relative z-10 flex items-center justify-between text-xs text-slate-300 border-t border-white/10 pt-4 font-medium">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="absolute w-3.5 h-3.5 rounded-full bg-emerald-400/50 animate-ping" />
              </div>
              <span className="text-slate-300 text-xs font-semibold">Cơ sở dữ liệu Supabase kết nối trực tuyến</span>
            </div>
            <span className="text-cyan-300 font-mono font-bold bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-400/30">
              v2.5 Pro
            </span>
          </div>
        </div>

        {/* ── RIGHT LOGIN FORM PANEL ── */}
        <div className="bg-white/95 backdrop-blur-2xl p-7 sm:p-10 lg:p-12 flex flex-col justify-between relative">
          
          {/* Subtle Corner Glow Accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full pointer-events-none blur-2xl" />

          <div>
            {/* Header Brand */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 anim-float">
                  <Store size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                    GS25 Workspace
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Cổng đăng nhập nhân sự & điều hành
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold shadow-2xs">
                24/7 Portal
              </span>
            </div>

            {/* Quick Fast-Login Demo Chips */}
            <div className="mb-5 p-3 rounded-2xl bg-slate-100/90 border border-slate-200/80">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                <span>Chọn nhanh tài khoản thử nghiệm:</span>
                <span className="text-[10px] text-blue-600 font-bold">1-Click</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickSelect('admin', '1')}
                  className={`px-2.5 py-1.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                    empId === 'admin'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs'
                  }`}
                >
                  <Crown size={14} className={empId === 'admin' ? 'text-amber-300' : 'text-purple-600'} />
                  <div className="truncate">
                    <span className="text-xs font-bold block leading-none">Admin Chuỗi</span>
                    <span className={`text-[10px] ${empId === 'admin' ? 'text-purple-200' : 'text-slate-500'}`}>admin (full quyền)</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickSelect('251104004', '1')}
                  className={`px-2.5 py-1.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                    empId === '251104004'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs'
                  }`}
                >
                  <Store size={14} className={empId === '251104004' ? 'text-cyan-300' : 'text-blue-600'} />
                  <div className="truncate">
                    <span className="text-xs font-bold block leading-none">SM VN0485</span>
                    <span className={`text-[10px] ${empId === '251104004' ? 'text-blue-200' : 'text-slate-500'}`}>251104004 (Quản lý)</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200 shadow-2xs">
                <span className="text-base">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* ── Form Step 1: 2FA OTP ── */}
            {otpStep ? (
              <form onSubmit={submitOtp} className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                    <ShieldCheck size={20} />
                  </div>
                  <p className="text-xs font-bold text-slate-800 mb-1">
                    Xác Thực Bảo Mật 2FA Quản Trị
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Mã 6 chữ số đã được gửi qua Telegram của Admin. Mã có hiệu lực trong 5 phút.
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
                  className="btn-glow-effect w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm shadow-md shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
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
              /* ── Form Step 2: Standard Login Form ── */
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Employee ID Field */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mã Nhân Viên (9 Số)
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <UserCheck size={18} />
                    </div>
                    <input
                      type="text"
                      value={empId}
                      onChange={e => setEmpId(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 text-sm bg-slate-50/80 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none font-semibold text-slate-900 transition-all shadow-2xs placeholder:text-slate-400"
                      placeholder="VD: 251104004 hoặc admin"
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
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
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
                      className="block w-full pl-10 pr-11 py-3 text-sm bg-slate-50/80 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none font-semibold text-slate-900 transition-all shadow-2xs placeholder:text-slate-400"
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
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>Mặc định: <strong className="text-slate-600 font-mono">1</strong></span>
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
                    <span>Ghi nhớ phiên đăng nhập</span>
                  </label>
                </div>

                {/* Submit Login Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-glow-effect relative w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 transition-all transform active:scale-[0.99] mt-2"
                >
                  {submitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LogIn size={18} />
                  )}
                  <span>{submitting ? 'Đang xác thực hệ thống...' : 'Đăng Nhập Ngay'}</span>
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
            <span>© GS25 Vietnam Co., Ltd.</span>
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
