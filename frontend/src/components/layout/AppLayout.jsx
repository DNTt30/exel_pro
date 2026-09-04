import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { appRoleLabel, appRoleOf, isOpsManager, isBuiltinStoreManager } from '../../lib/authSession';
import { CalendarDays, Clock, FileText, LogOut, KeyRound, LayoutDashboard, User, Users, Store, Menu, X, Sparkles, ScrollText, HelpCircle, Home, Rows3, ChevronRight } from 'lucide-react';
import NotificationBell from './NotificationBell';
import ChangePasswordModal from '../modals/ChangePasswordModal';
import Toaster from '../ui/toast';
import { toast } from '../ui/toastStore';
import { AdminPageSkeleton, EmployeePageSkeleton } from '../ui/Skeleton';
import CloudSyncBadge from './CloudSyncBadge';
import AICopilotDrawer from '../ai/AICopilotDrawer';
import HelpDrawer from '../HelpDrawer';

export default function AppLayout() {
  const user = useStore(state => state.user);
  const logout = useStore(state => state.logout);
  const [showPw, setShowPw] = useState(false);
  // Nhắc đổi mật khẩu MỘT LẦN bằng effect (tránh mở modal trong cùng commit mount
  const pwPromptedRef = useRef(false);
  useEffect(() => {
    if (user?.mustChangePassword && !pwPromptedRef.current) {
      pwPromptedRef.current = true;
      setShowPw(true);
    }
  }, [user?.mustChangePassword]);
  const currentWeek = useStore(state => state.currentWeek);
  const isInitializing = useStore(state => state.isInitializing);
  const authWarning = useStore(state => state.authWarning);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const isManager = isOpsManager(user);
  const location = useLocation();

  // ── Bảo mật 1: admin chưa đặt mật khẩu riêng → ép vào trang đổi mật khẩu
  useEffect(() => {
    if (user?.id === 'admin' && user?.mustSetupPassword && location.pathname !== '/admin/security/change-password') {
      navigate('/admin/security/change-password', { replace: true });
    }
  }, [user?.id, user?.mustSetupPassword, location.pathname, navigate]);

  // ── Bảo mật 2: tự đăng xuất khi không tương tác (20 phút) hoặc hết phiên tuyệt đối (12h)
  const logoutRef = useRef(handleLogout);
  logoutRef.current = handleLogout;
  useEffect(() => {
    if (!user) return undefined;
    const IDLE_LIMIT_MS = 20 * 60 * 1000;
    const ABSOLUTE_LIMIT_MS = 12 * 60 * 60 * 1000;
    let idleTimer = null;
    let expiredTimer = null;
    const forceLogout = (reason) => () => {
      Promise.resolve(logoutRef.current()).finally(() => {
        toast.info(reason);
      });
    };
    const resetIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(forceLogout('Phiên hết hạn do không hoạt động — vui lòng đăng nhập lại.'), IDLE_LIMIT_MS);
    };
    const events = ['pointerdown', 'keydown', 'visibilitychange'];
    events.forEach((ev) => window.addEventListener(ev, resetIdle, { passive: true }));
    resetIdle();
    if (user.loginAt) {
      const remainMs = user.loginAt + ABSOLUTE_LIMIT_MS - Date.now();
      if (remainMs <= 0) {
        forceLogout('Phiên đăng nhập đã quá 12 giờ — vui lòng đăng nhập lại.')();
        return undefined;
      }
      expiredTimer = setTimeout(forceLogout('Phiên đăng nhập đã quá 12 giờ — vui lòng đăng nhập lại.'), remainMs);
    }
    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (expiredTimer) clearTimeout(expiredTimer);
      events.forEach((ev) => window.removeEventListener(ev, resetIdle));
    };
  }, [user]);

  const isFullAdmin = isBuiltinStoreManager(user);
  const feedbacks = useStore(state => state.feedbacks);
  const shiftSwaps = useStore(state => state.shiftSwaps);
  const pendingFeedbacksCount = (feedbacks || []).filter(f => f.status === 'pending').length;
  const pendingSwapsCount = (shiftSwaps || []).filter(s => s.status === 'pending_manager').length;

  const adminSections = [
    {
      title: 'VẬN HÀNH',
      items: [
        { to: '/admin/dashboard',  icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
        { to: '/admin/schedule',   icon: <CalendarDays size={17} />,    label: 'Lịch ca', badge: pendingSwapsCount, badgeColor: 'bg-amber-400 text-slate-950 font-bold' },
        { to: '/admin/timesheet',  icon: <Clock size={17} />,           label: 'Chấm công' },
        { to: '/admin/feedback',   icon: <FileText size={17} />,        label: 'Bù công C&B', badge: pendingFeedbacksCount, badgeColor: 'bg-rose-400 text-white font-bold' },
        { to: '/admin/shelves',    icon: <Rows3 size={17} />,           label: 'Kệ & date' },
      ]
    },
    {
      title: 'HỆ THỐNG',
      items: [
        { to: '/admin/employees',  icon: <Users size={17} />,           label: 'Nhân viên' },
        { to: '/admin/stores',     icon: <Store size={17} />,           label: 'Cửa hàng' },
        ...(isFullAdmin ? [{ to: '/admin/logs', icon: <ScrollText size={17} />, label: 'Nhật ký' }] : [])
      ]
    }
  ];

  const employeeSections = [
    {
      title: 'CÁ NHÂN',
      items: [
        { to: '/employee/home',      icon: <Home size={17} />,         label: 'Trang chủ' },
        { to: '/employee/schedule',  icon: <CalendarDays size={17} />, label: 'Lịch ca' },
        { to: '/employee/timesheet', icon: <Clock size={17} />,        label: 'Chấm công' },
        { to: '/employee/feedback',  icon: <FileText size={17} />,     label: 'Bù công C&B' },
        { to: '/employee/shelves',   icon: <Rows3 size={17} />,        label: 'Kệ của tôi' },
      ]
    }
  ];

  const sections = isManager ? adminSections : employeeSections;

  const getRoleInfo = () => {
    const role = appRoleOf(user); const label = appRoleLabel(user);
    if (role === 'admin') return { label, side: 'bg-purple-500/20 text-purple-200 border-purple-400/30', top: 'bg-purple-50 text-purple-700 border-purple-200' };
    if (role === 'am')    return { label, side: 'bg-amber-500/20 text-amber-200 border-amber-400/30',    top: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (role === 'sm')    return { label, side: 'bg-sky-400/20 text-sky-200 border-sky-400/30',          top: 'bg-sky-50 text-sky-700 border-sky-200' };
    return { label, side: 'bg-white/10 text-white/60 border-white/20', top: 'bg-slate-100 text-slate-600 border-slate-200' };
  };
  const ri = getRoleInfo();

  return (
    <div className="flex flex-col h-screen bg-slate-50 print:bg-white print:h-auto print:block overflow-hidden">

      {/* ── Header ── */}
      <header className="relative bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs z-30 px-4 md:px-6 py-2.5 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="flex items-center gap-2.5">
            {/* GS25 logo */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5 rounded-xl shadow-md shadow-blue-500/25 font-black text-sm tracking-tight select-none">GS25</div>
            <div className="hidden sm:block">
              <h1 className="font-extrabold text-sm text-slate-800 tracking-tight leading-tight">OFC Schedule</h1>
              <p className="text-[10px] text-slate-400 font-medium">Quản lý Lịch & C&B</p>
            </div>
          </div>
          
          {/* Active store context pill */}
          {isManager && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-slate-100/90 border border-slate-200 rounded-full text-xs font-semibold text-slate-700 ml-2">
              <Store size={13} className="text-blue-600" />
              <span>{user?.dept ? `Cửa hàng: ${user.dept}` : 'Toàn khu vực (OFC)'}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <CloudSyncBadge />
          <button onClick={() => setIsHelpOpen(true)} className="hidden sm:flex p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Hướng dẫn"><HelpCircle size={18} /></button>
          <NotificationBell />
          <div className="flex items-center gap-1.5 sm:gap-2 bg-blue-50 border border-blue-100 pl-1.5 sm:pl-2 pr-2 sm:pr-3 py-1 rounded-full ml-0.5 sm:ml-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User size={12} />}
            </div>
            <span className="text-xs font-bold text-slate-700 max-w-[65px] sm:max-w-[150px] truncate">{user?.name}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border hidden sm:inline ${ri.top}`}>{ri.label}</span>
          </div>
          <button type="button" onClick={() => setShowPw(true)} title="Đổi mật khẩu" className="hidden sm:flex p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><KeyRound size={15} /></button>
          <button onClick={handleLogout} className="p-1.5 sm:p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-0.5" title="Đăng xuất"><LogOut size={16} /></button>
        </div>
        {isInitializing && (<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-100 overflow-hidden"><div className="h-full w-1/3 bg-blue-500 animate-pulse" /></div>)}
      </header>

      {/* Cảnh báo phiên dữ liệu chưa xác thực — RLS sẽ chặn ngầm ghi/đọc */}
      {authWarning && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-300 text-amber-900 text-[11px] sm:text-xs font-semibold print:hidden">
          ⚠️ Phiên dữ liệu chưa xác thực ({authWarning}). Hãy <strong>Đăng xuất → đăng nhập lại</strong>. Nếu vẫn lỗi: Supabase Dashboard → Authentication → Sign In / Providers → Email → tắt "Confirm email".
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden print:overflow-visible print:h-auto print:block relative">
        {mobileMenuOpen && (<div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />)}

        {/* ── Sidebar (blue gradient) ── */}
        <aside className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto w-60 flex flex-col print:hidden bg-gradient-to-b from-blue-600 via-blue-700 to-indigo-900 border-r border-blue-950/30 transform transition-transform duration-200 ease-in-out ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}>

          <div className="px-4 py-3 md:hidden flex items-center justify-between border-b border-white/10">
            <span className="font-bold text-sm text-white/80">Menu</span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-white/40 hover:text-white rounded"><X size={18} /></button>
          </div>

          {/* User block */}
          <div className="px-4 pt-5 pb-4 border-b border-white/10 hidden md:flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-blue-700 flex items-center justify-center font-black text-base shadow-lg flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-sm truncate leading-tight">{user?.name || 'Người dùng'}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 inline-block ${ri.side}`}>{ri.label}</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-2.5 py-3 space-y-3.5 overflow-y-auto">
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                <div className="px-3 pt-1 pb-0.5 text-[10px] font-black uppercase tracking-wider text-blue-200/50">
                  {section.title}
                </div>
                {section.items.map((link) => (
                  <NavLink key={link.to} to={link.to} onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all group ${isActive ? 'bg-white text-blue-700 shadow-md' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                  >
                    {({ isActive }) => (<>
                      <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-white/50 group-hover:text-white/90'}`}>{link.icon}</span>
                      <span className="truncate flex-1">{link.label}</span>
                      {link.badge > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 shadow-2xs ${link.badgeColor || 'bg-amber-400 text-slate-950 font-bold'}`}>
                          {link.badge}
                        </span>
                      )}
                      {isActive && <ChevronRight size={13} className="text-blue-400 flex-shrink-0" />}
                    </>)}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-3 py-3 border-t border-white/10 space-y-1">
            <button 
              type="button" 
              onClick={() => { setMobileMenuOpen(false); setShowPw(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all text-xs font-semibold cursor-pointer"
            >
              <KeyRound size={14} className="text-blue-300" /> Đổi mật khẩu
            </button>
            <button 
              type="button" 
              onClick={() => { setMobileMenuOpen(false); setIsHelpOpen(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all text-xs font-semibold cursor-pointer"
            >
              <HelpCircle size={14} className="text-blue-300" /> Hướng dẫn sử dụng
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/50 hover:text-red-300 hover:bg-white/10 transition-all text-xs font-semibold cursor-pointer">
              <LogOut size={14} /> Đăng xuất
            </button>
            <p className="text-white/20 text-[10px] text-center mt-2">© 2026 GS25 OFC System</p>
          </div>
        </aside>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-auto bg-slate-50 print:p-0 print:m-0 print:bg-white print:overflow-visible print:h-auto print:block flex flex-col">
          {/* Skeleton khi chưa có dữ liệu người dùng — khi đã có user thì Outlet luôn giữ mount */}
          {isInitializing && !user ? (isManager ? <AdminPageSkeleton /> : <EmployeePageSkeleton />) : <Outlet />}
        </main>

        {/* Floating AI Button - blue */}
        <button onClick={() => setIsAIOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full shadow-2xl shadow-blue-500/40 flex items-center justify-center text-white hover:scale-110 transition-all z-40 print:hidden focus:ring-4 focus:ring-blue-300 group" title="GS25 AI Copilot">
          <Sparkles size={22} className="group-hover:animate-pulse" />
        </button>

        <Toaster />
        <HelpDrawer isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} isAdmin={isManager} />
        <AICopilotDrawer isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} currentWeek={currentWeek} storeId={user?.dept || 'ALL'} />
      </div>
    
      <ChangePasswordModal isOpen={showPw} onClose={() => setShowPw(false)} /></div>
  );
}