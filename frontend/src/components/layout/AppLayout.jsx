import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { CalendarDays, Clock, FileText, LogOut, LayoutDashboard, User } from 'lucide-react';

export default function AppLayout() {
  const user = useStore(state => state.user);
  const logout = useStore(state => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminLinks = [
    { to: '/admin/schedule', icon: <CalendarDays size={20} />, label: 'Xếp lịch (Realtime)' },
    { to: '/admin/timesheet', icon: <Clock size={20} />, label: 'Bảng công lương' },
    { to: '/admin/feedback', icon: <FileText size={20} />, label: 'Feedback C&B' },
  ];

  const employeeLinks = [
    { to: '/employee/schedule', icon: <CalendarDays size={20} />, label: 'Lịch làm việc' },
    { to: '/employee/timesheet', icon: <Clock size={20} />, label: 'Bảng công của tôi' },
    { to: '/employee/feedback', icon: <FileText size={20} />, label: 'Báo bù công C&B' },
  ];

  const links = (user?.role === 'admin' || user?.isManager) ? adminLinks : employeeLinks;

  return (
    <div className="flex flex-col h-screen bg-slate-50 print:bg-white print:h-auto">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 shadow-sm z-10 px-6 py-3 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800 leading-tight">OFC Schedule</h1>
            <p className="text-xs text-slate-500">v4.3 React Edition</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <User size={16} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">{user?.name} {user?.role !== 'admin' && `(${user?.dept})`}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors font-semibold text-sm"
          >
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden print:overflow-visible">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col pt-6 print:hidden">
          <nav className="flex-1 px-4 space-y-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {link.icon}
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-100 text-xs text-slate-400 text-center">
            &copy; 2026 OFC Management System
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50 p-6 print:p-0 print:bg-white print:overflow-visible">
          <Outlet />
        </main>
      </div>
    </div>
  );
}