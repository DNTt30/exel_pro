import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { appRoleLabel, appRoleOf, isOpsManager } from '../../lib/authSession';
import { CalendarDays, Clock, FileText, LogOut, LayoutDashboard, User, Users, Store, Menu, X, Sparkles, ScrollText, HelpCircle, Home, Rows3 } from 'lucide-react';

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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isManager = isOpsManager(user);

  const adminLinks = [
    { to: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/admin/schedule', icon: <CalendarDays size={18} />, label: 'Lịch ca' },
    { to: '/admin/timesheet', icon: <Clock size={18} />, label: 'Chấm công' },
    { to: '/admin/feedback', icon: <FileText size={18} />, label: 'Bù công C&B' },
    { to: '/admin/shelves', icon: <Rows3 size={18} />, label: 'Kệ & date' },
    { to: '/admin/employees', icon: <Users size={18} />, label: 'Nhân viên' },
    { to: '/admin/stores', icon: <Store size={18} />, label: 'Cửa hàng' },
    { to: '/admin/logs', icon: <ScrollText size={18} />, label: 'Nhật ký' },
  ];

  const employeeLinks = [
    { to: '/employee/home', icon: <Home size={18} />, label: 'Trang chủ' },
    { to: '/employee/schedule', icon: <CalendarDays size={18} />, label: 'Lịch ca' },
    { to: '/employee/timesheet', icon: <Clock size={18} />, label: 'Chấm công' },
    { to: '/employee/feedback', icon: <FileText size={18} />, label: 'Bù công C&B' },
    { to: '/employee/shelves', icon: <Rows3 size={18} />, label: 'Kệ của tôi' },
  ];

  const links = isManager ? adminLinks : employeeLinks;

  const getRoleLabel = () => {
    const role = appRoleOf(user);
    const label = appRoleLabel(user);
    if (role === 'admin') return { label, color: 'bg-purple-100 text-purple-800 border-purple-200' };
    if (role === 'am') return { label, color: 'bg-amber-100 text-amber-800 border-amber-200' };
    if (role === 'sm') return { label, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    return { label, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const roleInfo = getRoleLabel();

  return (
    <div className="flex flex-col h-screen bg-slate-50 print:bg-white print:h-auto print:min-h-0 print:overflow-visible print:block overflow-hidden">
      {/* Top Navbar */}
      <header className="relative bg-white border-b border-slate-200 shadow-xs z-30 px-4 md:px-6 py-2.5 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-xl shadow-xs">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <h1 className="font-extrabold text-base md:text-lg text-slate-800 tracking-tight leading-tight">OFC Schedule</h1>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Hệ thống Xếp lịch & Quản lý C&B</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <CloudSyncBadge />
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="p-2 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl border border-transparent hover:border-indigo-100"
            title="Hướng dẫn sử dụng"
          >
            <HelpCircle size={18} />
          </button>
          <NotificationBell />

          <div className="flex items-center gap-2 bg-slate-50 pl-2.5 pr-3 py-1 rounded-full border border-slate-200 shadow-2xs">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User size={14} />}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-xs font-bold text-slate-700 max-w-[120px] sm:max-w-[180px] truncate">{user?.name}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors font-semibold text-xs border border-transparent hover:border-red-100 cursor-pointer"
            title="Đăng xuất"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
        {isInitializing && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-100 overflow-hidden">
            <div className="h-full w-1/3 bg-blue-600 animate-pulse" />
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden print:overflow-visible print:h-auto print:block relative">
        {/* Mobile Menu Backdrop */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar for Desktop & Drawer for Mobile */}
        <aside className={`
          fixed md:static inset-y-0 left-0 z-50 md:z-auto
          w-64 bg-white border-r border-slate-200 flex flex-col pt-4 md:pt-5 print:hidden
          transform transition-transform duration-200 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="px-4 pb-3 md:hidden flex items-center justify-between border-b border-slate-100">
            <span className="font-bold text-sm text-slate-700">Menu chức năng</span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-xs transition-all ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <span className="flex-shrink-0">{link.icon}</span>
                <span className="truncate">{link.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-3 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
            <span>&copy; 2026 OFC Management</span>
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50 print:p-0 print:m-0 print:bg-white print:overflow-visible print:h-auto print:block flex flex-col">
          <Outlet />
        </main>
        
        {/* Floating AI Button cho Nhân viên */}
        <button
          onClick={() => setIsAIOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-105 transition-transform z-40 print:hidden focus:ring-4 focus:ring-blue-300 group"
          title="OFC AI Copilot"
        >
          <Sparkles size={24} className="text-amber-300 group-hover:animate-pulse" />
        </button>

        <HelpDrawer
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          isAdmin={isManager}
        />

        <AICopilotDrawer
          isOpen={isAIOpen}
          onClose={() => setIsAIOpen(false)}
          currentWeek={currentWeek}
          storeId={user?.dept || 'ALL'}
        />
      </div>
    </div>
  );
}