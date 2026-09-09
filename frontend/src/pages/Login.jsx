import { useEffect, useState, useRef, useCallback } from 'react';
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
  Home, 
  Clock, 
  ShieldAlert,
  Leaf
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
  const [particles, setParticles] = useState([]);
  
  // Parallax Tilt state
  const [tiltStyle, setTiltStyle] = useState({});
  const containerRef = useRef(null);

  // ── Bước 2FA ──
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

  // Parallax Tilt effect on mouse move
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;
    
    const rotateX = (y - 0.5) * -15; // Max 15deg
    const rotateY = (x - 0.5) * 15;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      transition: 'transform 0.1s ease-out'
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
      transition: 'transform 0.5s ease-out'
    });
  }, []);

  // Click creates warm sparkles
  const handleBackgroundClick = useCallback((e) => {
    const newParticle = {
      id: Date.now(),
      x: e.clientX,
      y: e.clientY,
      color: ['#fbbf24', '#f59e0b', '#fcd34d'][Math.floor(Math.random() * 3)]
    };
    setParticles(prev => [...prev, newParticle]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newParticle.id));
    }, 1000);
  }, []);

  return (
    <div 
      className="min-h-[100dvh] flex items-center justify-center p-3 sm:p-6 lg:p-10 relative overflow-hidden select-none"
      onClick={handleBackgroundClick}
    >
      
      {/* ── Animations ── */}
      <style>{`
        @keyframes shimmer-ray {
          0% { transform: translateX(-120%) skewX(-20deg); }
          100% { transform: translateX(250%) skewX(-20deg); }
        }
        @keyframes coffee-steam {
          0% { transform: translateY(0) scaleX(1); opacity: 0; }
          20% { opacity: 0.6; }
          50% { transform: translateY(-30px) scaleX(1.2); opacity: 0.8; }
          100% { transform: translateY(-60px) scaleX(1.5); opacity: 0; }
        }
        @keyframes leaf-sway {
          0%, 100% { transform: rotate(-5deg) translateX(0); }
          50% { transform: rotate(5deg) translateX(10px); }
        }
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes sparkle-burst {
          0% { transform: scale(0) rotate(0deg); opacity: 1; }
          100% { transform: scale(2) rotate(90deg); opacity: 0; }
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
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
          transform: translateX(-120%) skewX(-20deg);
          animation: shimmer-ray 3s infinite ease-in-out;
        }
        .bg-coffee-shop {
          background-image: url('${heroImg}');
          background-size: cover;
          background-position: center;
          filter: blur(8px) brightness(1.1) sepia(0.3);
          transform: scale(1.05);
        }
      `}</style>

      {/* ── Ambient Background (Coffee Shop) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-coffee-shop" />
        <div className="absolute inset-0 bg-amber-900/10" />
      </div>

      {/* Animated Leaves */}
      <div 
        className="absolute top-[-50px] left-[-50px] w-64 h-64 pointer-events-none opacity-80"
        style={{ animation: 'leaf-sway 6s ease-in-out infinite', transformOrigin: 'top left' }}
      >
        <svg viewBox="0 0 100 100" fill="rgba(34, 197, 94, 0.4)">
           <path d="M50 0 C 20 20, 0 50, 20 80 C 40 100, 80 80, 100 50 C 80 20, 60 0, 50 0 Z" />
        </svg>
      </div>

      {/* Animated Coffee Steam */}
      <div className="absolute bottom-10 right-20 pointer-events-none flex flex-col items-center">
        <div className="relative w-8 h-20 mb-2">
          <div className="absolute bottom-0 left-1 w-2 h-10 bg-white/40 blur-md rounded-full" style={{ animation: 'coffee-steam 3s ease-in-out infinite' }} />
          <div className="absolute bottom-0 right-1 w-2 h-12 bg-white/30 blur-md rounded-full" style={{ animation: 'coffee-steam 4s ease-in-out infinite 1s' }} />
        </div>
        <div className="w-16 h-10 bg-white/20 backdrop-blur-md rounded-b-3xl border border-white/40 shadow-lg relative">
          <div className="absolute top-0 right-[-10px] w-6 h-6 border-4 border-white/30 rounded-full" />
        </div>
      </div>

      {/* Warm Sparkles on Click */}
      {particles.map(p => (
        <div 
          key={p.id}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: p.x - 10,
            top: p.y - 10,
            width: 20,
            height: 20,
            background: `radial-gradient(circle, ${p.color} 0%, transparent 70%)`,
            animation: 'sparkle-burst 1s ease-out forwards'
          }}
        />
      ))}

      {/* ── Main Glass Container ── */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={tiltStyle}
        className="relative z-10 w-full max-w-[900px] my-auto min-h-[500px] rounded-3xl overflow-hidden shadow-[0_25px_60px_-10px_rgba(0,0,0,0.4)] grid grid-cols-1 lg:grid-cols-[1fr_1fr] bg-white backdrop-blur-xl border border-white/60"
      >
        
        {/* ── LEFT SHOWCASE PANEL (Blue Gradient & Illustration) ── */}
        <div className="relative hidden lg:flex flex-col justify-between p-8 bg-gradient-to-br from-[#e0f2fe] via-[#f0f9ff] to-[#e0f2fe] overflow-hidden border-r border-blue-100/50">
          
          {/* Top Status Bar */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-sm border border-blue-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-black tracking-widest text-blue-800 uppercase">
                GS25 PORTAL
              </span>
            </div>

            {currentTime && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white shadow-sm border border-blue-100 text-slate-700 font-mono text-xs font-bold">
                <Clock size={13} className="text-blue-500" />
                <span>{currentTime}</span>
              </div>
            )}
          </div>

          {/* Center Stage: GS25 Illustration & Titles */}
          <div className="relative z-10 my-auto py-6 flex flex-col items-center text-center">
            
            {/* Store Illustration Mockup */}
            <div className="relative w-56 h-40 mb-8 mt-4" style={{ animation: 'float-gentle 5s ease-in-out infinite' }}>
              <div className="absolute inset-0 bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden flex flex-col">
                <div className="h-6 w-full bg-gradient-to-r from-blue-500 via-sky-400 to-cyan-400 flex items-center justify-center">
                  <span className="text-white font-black text-xs">GS25</span>
                </div>
                <div className="flex-1 bg-slate-50 relative">
                   <div className="absolute bottom-0 left-4 w-12 h-16 bg-blue-100/50 border border-blue-200 rounded-t-lg" />
                   <div className="absolute bottom-0 right-4 w-12 h-16 bg-blue-100/50 border border-blue-200 rounded-t-lg" />
                   <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-8 bg-sky-100 rounded" />
                </div>
              </div>
              <div className="absolute -bottom-4 z-20 flex items-end justify-center w-full">
                <span className="text-6xl drop-shadow-md pb-2">👨‍💼</span>
                <span className="text-5xl absolute -right-2 top-0 drop-shadow-md" style={{ animation: 'leaf-sway 2s infinite' }}>👋</span>
                <span className="text-4xl drop-shadow-md absolute -left-4 bottom-0">👩‍🌾</span>
              </div>
            </div>

            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
              Quản lý Cửa hàng Của Bạn
            </h1>
            <p className="text-[13px] text-slate-500 mt-2 font-medium max-w-[240px] leading-relaxed">
              Đơn giản hóa công việc, kiến tạo thành công
            </p>

            {/* Badges */}
            <div className="flex items-center gap-2 mt-6">
              <span className="px-3 py-1.5 rounded-full bg-white shadow-sm border border-blue-100 text-[11px] font-bold text-sky-600 flex items-center gap-1">
                <span className="text-sm">⚡</span> Dễ sử dụng
              </span>
              <span className="px-3 py-1.5 rounded-full bg-white shadow-sm border border-emerald-100 text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <span className="text-sm">🛡️</span> An toàn
              </span>
              <span className="px-3 py-1.5 rounded-full bg-white shadow-sm border border-purple-100 text-[11px] font-bold text-purple-600 flex items-center gap-1">
                <span className="text-sm">✨</span> Hỗ trợ Thân thiện
              </span>
            </div>
          </div>

          {/* Bottom Footer Status */}
          <div className="relative z-10 flex items-center justify-between text-xs pt-3 font-medium mt-auto">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600 text-xs font-bold">Hệ thống sẵn sàng</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 font-bold bg-white px-2.5 py-1 rounded-md shadow-sm border border-slate-200">
              <span className="border border-slate-400 rounded-sm px-1 text-[9px] uppercase tracking-wider">File</span>
              <span>Phiên bản Cũ bản</span>
            </div>
          </div>

        </div>

        {/* ── RIGHT LOGIN FORM PANEL (Clean White) ── */}
        <div className="bg-white p-8 sm:p-10 flex flex-col justify-center relative text-slate-900 rounded-r-3xl">
          
          <div>
            {/* Header Brand */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center shadow-inner">
                  <Home size={26} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                    Chào mừng bạn về nhà!
                  </h2>
                  <p className="text-[13px] text-blue-600 font-semibold mt-0.5">
                    Vui lòng đăng nhập để bắt đầu.
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold whitespace-nowrap">
                PORTAL 24/7
              </span>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
                <ShieldAlert size={16} className="shrink-0 text-rose-500" />
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
                  <p className="text-xs font-bold text-slate-800 mb-1">Xác Thực Bảo Mật 2FA</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Mã xác nhận 6 số đã được gửi qua Telegram của Admin.</p>
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="block w-full px-4 py-3 text-center text-2xl font-black tracking-[0.4em] border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 text-slate-900 outline-none transition-all"
                    placeholder="······"
                    autoFocus
                    required
                  />
                </div>

                {otpNote && <div className="text-xs text-slate-500 text-center font-medium">{otpNote}</div>}

                <button
                  type="submit"
                  disabled={otpBusy || otpCode.length !== 6}
                  className="btn-shimmer-effect w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm shadow-md shadow-sky-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
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
              <form onSubmit={handleLogin} className="space-y-4 relative z-20">
                
                {/* Employee ID Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mã nhân viên / Tài khoản
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
                      <UserCheck size={18} />
                    </div>
                    <input
                      type="text"
                      value={empId}
                      onChange={e => setEmpId(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none font-semibold text-slate-900 transition-all placeholder:text-slate-300 shadow-sm"
                      placeholder="Nhập mã nhân viên (VD: 2511004004)"
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
                      className="text-xs font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
                      <KeyRound size={18} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-11 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none font-semibold text-slate-900 transition-all placeholder:text-slate-300 shadow-sm"
                      placeholder="Nhập mật khẩu"
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
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-sky-700 font-bold cursor-pointer select-none">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="peer appearance-none w-4 h-4 border-2 border-sky-500 rounded bg-white checked:bg-sky-500 cursor-pointer transition-all"
                      />
                      <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span>Ghi nhớ đăng nhập</span>
                  </label>
                </div>

                {/* Submit Login Button with Shimmer Ray */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-shimmer-effect relative w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white font-black text-sm shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all mt-4"
                >
                  {submitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>ĐĂNG NHẬP</span>
                  )}
                  {!submitting && <ArrowRight size={18} className="ml-1" />}
                </button>
              </form>
            )}

          </div>

          {/* Footer Versions */}
          <div className="mt-10 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
            <div className="flex items-center gap-1.5">
              <KeyRound size={14} className="text-sky-500" />
              <span>v4.2.3</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Leaf size={14} className="text-emerald-500" />
              <span>GS25 Workspace</span>
            </div>
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
