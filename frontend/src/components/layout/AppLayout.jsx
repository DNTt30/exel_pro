import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { appRoleLabel, appRoleOf, isOpsManager } from '../../lib/authSession';
import { CalendarDays, Clock, FileText, LogOut, LayoutDashboard, User, Users, Store, Menu, X, Sparkles, ScrollText, HelpCircle, Home, Rows3, ChevronRight } from 'lucide-react';
import NotificationBell from './NotificationBell';
import CloudSyncBadge from './CloudSyncBadge';
import AICopilotDrawer from '../ai/AICopilotDrawer';
import HelpDrawer from '../HelpDrawer';

export default function AppLayout() {
  const user = useStore(state => state.user);
  const logout = useStore(state => state.logout);
  const currentWeek = useStore(state => state.currentWeek);
  const isInitializing = useStore(state => state.isInitializing);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const isManager = isOpsManager(user);

  const adminLinks = [
    { to: '/admin/dashboard',  icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
    { to: '/admin/schedule',   icon: <CalendarDays size={17} />,    label: 'Lich ca' },
    { to: '/admin/timesheet',  icon: <Clock size={17} />,           label: 'Cham cong' },
    { to: '/admin/feedback',   icon: <FileText size={17} />,        label: 'Bu cong C&B' },
    { to: '/admin/shelves',    icon: <Rows3 size={17} />,           label: 'Ke & date' },
    { to: '/admin/employees',  icon: <Users size={17} />,           label: 'Nhan vien' },
    { to: '/admin/stores',     icon: <Store size={17} />,           label: 'Cua hang' },
    { to: '/admin/logs',       icon: <ScrollText size={17} />,      label: 'Nhat ky' },
  ];
  const employeeLinks = [
    { to: '/employee/home',      icon: <Home size={17} />,         label: 'Trang chu' },
    { to: '/employee/schedule',  icon: <CalendarDays size={17} />, label: 'Lich ca' },
    { to: '/employee/timesheet', icon: <Clock size={17} />,        label: 'Cham cong' },
    { to: '/employee/feedback',  icon: <FileText size={17} />,     label: 'Bu cong C&B' },
    { to: '/employee/shelves',   icon: <Rows3 size={17} />,        label: 'Ke cua toi' },
  ];
  const links = isManager ? adminLinks : employeeLinks;

  const getRoleInfo = () => {
    const role = appRoleOf(user); const label = appRoleLabel(user);
    if (role === 'admin') return { label, side: 'bg-purple-500/20 text-purple-200 border-purple-500/30', top: 'bg-purple-50 text-purple-700 border-purple-200' };
    if (role === 'am')    return { label, side: 'bg-amber-500/20 text-amber-200 border-amber-500/30', top: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (role === 'sm')    return { label, side: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30', top: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    return { label, side: 'bg-white/10 text-white/60 border-white/20', top: 'bg-slate-100 text-slate-600 border-slate-200' };
  };
  const ri = getRoleInfo();

  return (
    <div className="flex flex-col h-screen bg-slate-100 print:bg-white print:h-auto print:block overflow-hidden">
      <header className="relative bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm z-30 px-4 md:px-6 py-2.5 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-xl shadow-md shadow-green-500/25 font-black text-sm tracking-tight select-none">GS25</div>
            <div className="hidden sm:block">
              <h1 className="font-extrabold text-sm text-slate-800 tracking-tight leading-tight">OFC Schedule</h1>
              <p className="text-[10px] text-slate-400 font-medium">Quan ly Lich & C&B</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <CloudSyncBadge />
          <button onClick={() => setIsHelpOpen(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Huong dan su dung"><HelpCircle size={18} /></button>
          <NotificationBell />
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 pl-2 pr-3 py-1 rounded-full shadow-xs ml-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User size={12} />}
            </div>
            <span className="text-xs font-bold text-slate-700 max-w-[90px] sm:max-w-[150px] truncate">{user?.name}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border hidden sm:inline ${ri.top}`}>{ri.label}</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-0.5" title="Dang xuat"><LogOut size={16} /></button>
        </div>
        {isInitializing && (<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-100 overflow-hidden"><div className="h-full w-1/3 bg-green-500 animate-pulse" /></div>)}
      </header>

      <div className="flex flex-1 overflow-hidden print:overflow-visible print:h-auto print:block relative">
        {mobileMenuOpen && (<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />)}

        <aside className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto w-60 flex flex-col print:hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-white/5 transform transition-transform duration-200 ease-in-out ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}>
          <div className="px-4 py-3 md:hidden flex items-center justify-between border-b border-white/10">
            <span className="font-bold text-sm text-white/70">Menu</span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-white/40 hover:text-white rounded"><X size={18} /></button>
          </div>

          <div className="px-4 pt-5 pb-4 border-b border-white/8 hidden md:flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-green-400 to-emerald-600 text-white flex items-center justify-center font-black text-base shadow-lg shadow-green-600/30 flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-sm truncate leading-tight">{user?.name || 'Nguoi dung'}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 inline-block ${ri.side}`}>{ri.label}</span>
            </div>
          </div>

          <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all group ${isActive ? 'bg-white/12 text-white' : 'text-white/50 hover:bg-white/7 hover:text-white/85'}`}
              >
                {({ isActive }) => (<>
                  <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-white/35 group-hover:text-white/65'}`}>{link.icon}</span>
                  <span className="truncate flex-1">{link.label}</span>
                  {isActive && <ChevronRight size={13} className="text-emerald-400 flex-shrink-0 opacity-80" />}
                </>)}
              </NavLink>
            ))}
          </nav>

          <div className="px-3 py-3 border-t border-white/8">
            <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all text-xs font-semibold group">
              <LogOut size={14} className="flex-shrink-0" /> Dang xuat
            </button>
            <p className="text-white/15 text-[10px] text-center mt-2">© 2026 GS25 OFC System</p>
          </div>
        </aside>

        <main className="flex-1 overflow-auto bg-slate-100 print:p-0 print:m-0 print:bg-white print:overflow-visible print:h-auto print:block flex flex-col"><Outlet /></main>

        <button onClick={() => setIsAIOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-green-500 to-emerald-600 rounded-full shadow-2xl shadow-green-600/35 flex items-center justify-center text-white hover:scale-110 transition-all z-40 print:hidden focus:ring-4 focus:ring-green-300 group" title="GS25 AI Copilot">
          <Sparkles size={22} className="group-hover:animate-pulse" />
        </button>

        <HelpDrawer isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} isAdmin={isManager} />
        <AICopilotDrawer isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} currentWeek={currentWeek} storeId={user?.dept || 'ALL'} />
      </div>
    </div>
  );
}
