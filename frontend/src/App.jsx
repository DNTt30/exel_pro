import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { requiredPasswordPath } from './utils/authNavigation';
import { useStore } from './store/useStore';
import { isOpsManager, isBuiltinStoreManager, canManageStoreList } from './lib/authSession';
import { getPayrollCycleDates, getPayrollCycleFromWeek } from './data/constants';
import { offsetWeek } from './utils/employeeSkills';
import { lazy, Suspense } from 'react';
import WorkspaceBrandingSync from './components/WorkspaceBrandingSync';
import WorkspaceRolesSync from './components/WorkspaceRolesSync';
import ScheduleOverrideModal from './components/modals/ScheduleOverrideModal';

const Login = lazy(() => import('./pages/Login'));
const AppLayout = lazy(() => import('./components/layout/AppLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Schedule = lazy(() => import('./pages/admin/Schedule'));
const Timesheet = lazy(() => import('./pages/admin/Timesheet'));
const FeedbackCB = lazy(() => import('./pages/admin/FeedbackCB'));
const Employees = lazy(() => import('./pages/admin/Employees'));
const Stores = lazy(() => import('./pages/admin/Stores'));
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'));
const SecurityChangePassword = lazy(() => import('./pages/admin/SecurityChangePassword'));
const EmployeeHome = lazy(() => import('./pages/employee/EmployeeHome'));
const EmployeeSchedule = lazy(() => import('./pages/employee/EmployeeSchedule'));
const EmployeeTimesheet = lazy(() => import('./pages/employee/EmployeeTimesheet'));
const EmployeeFeedback = lazy(() => import('./pages/employee/EmployeeFeedback'));
const ShelfDateBoard = lazy(() => import('./pages/shared/ShelfDateBoard'));
const Handbook = lazy(() => import('./pages/shared/Handbook'));
const HandbookManager = lazy(() => import('./pages/admin/HandbookManager'));
const EmployeeChangePassword = lazy(() => import('./pages/employee/EmployeeChangePassword'));
const EmployeeProfile = lazy(() => import('./pages/employee/EmployeeProfile'));
const WorkspaceSettings = lazy(() => import('./pages/admin/WorkspaceSettings'));
const WorkspaceRoles = lazy(() => import('./pages/admin/WorkspaceRoles'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl max-w-md w-full">
            <div className="text-3xl mb-2">⚠️</div>
            <h2 className="text-sm font-bold text-slate-800 mb-1">Đã có lỗi hiển thị giao diện</h2>
            <p className="text-xs text-slate-500 mb-4 font-mono break-all">{this.state.error?.message || 'Vui lòng bấm tải lại trang.'}</p>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
                className="btn btn-primary text-xs px-4 py-2 cursor-pointer"
              >
                Tải lại trang
              </button>
              <button 
                onClick={() => {
                  try {
                    localStorage.removeItem('schedule-storage');
                    sessionStorage.clear();
                  } catch {}
                  window.location.href = import.meta.env.BASE_URL || '/';
                }}
                className="btn bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2 rounded-lg cursor-pointer"
              >
                Xóa cache & Đăng nhập lại
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const PrivateRoute = ({ children, allowedRoles, fullAdminOnly, storeAdminOnly }) => {
  const user = useStore(state => state.user);
  const location = useLocation();
  
  if (!user) return <Navigate to="/login" replace />;
  if (user.isPasswordExpired) return <Navigate to="/login" replace state={{ authError: 'Mật khẩu mặc định đã quá hạn 7 ngày. Vui lòng liên hệ quản lý để được cấp mật khẩu mới.' }} />;
  const passwordPath = requiredPasswordPath(user);
  if (passwordPath && location.pathname.replace(/\/$/, '') !== passwordPath) {
    return <Navigate to={passwordPath} replace />;
  }

  const isMgr = isOpsManager(user);
  const homePath = isMgr ? "/admin/dashboard" : "/employee/home";

  if (fullAdminOnly && !isBuiltinStoreManager(user)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (storeAdminOnly && !canManageStoreList(user)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = user.role || '';
    const hasDirectRole = allowedRoles.includes(role);
    const managerGetsAdmin = isMgr && allowedRoles.includes('admin');
    const employeeGetsAccess = !isMgr && allowedRoles.includes('employee');
    const managerGetsEmployee = isMgr && allowedRoles.includes('employee');

    const isAllowed = hasDirectRole || managerGetsAdmin || employeeGetsAccess || managerGetsEmployee;
    if (!isAllowed) {
      // Triệt tiêu vòng lặp: tuyệt đối không redirect về "/" vì "/" sẽ redirect ngược lại!
      return <Navigate to={homePath} replace />;
    }
  }
  
  return children;
};

const IndexRedirect = () => {
  const user = useStore(state => state.user);
  if (!user) return <Navigate to="/login" replace />;
  if (isOpsManager(user)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/employee/home" replace />;
};

const CatchAllRedirect = () => {
  const user = useStore(state => state.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={isOpsManager(user) ? "/admin/dashboard" : "/employee/home"} replace />;
};

function App() {
  const user = useStore(state => state.user);
  const initializeData = useStore(state => state.initializeData);
  const syncStatus = useStore(state => state.syncStatus);
  const currentWeek = useStore(state => state.currentWeek);

  // Nạp ngầm (background warmup) các trang cốt lõi & dữ liệu Lịch/Bảng công kỳ hiện tại để sẵn sàng xem Offline
  useEffect(() => {
    if (!user?.id || syncStatus !== 'ok') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const timer = setTimeout(() => {
      void import('./pages/employee/EmployeeHome').catch(() => {});
      void import('./pages/employee/EmployeeSchedule').catch(() => {});
      void import('./pages/employee/EmployeeTimesheet').catch(() => {});
      void import('./pages/shared/Handbook').catch(() => {});
      void import('./pages/shared/ShelfDateBoard').catch(() => {});
      const st = useStore.getState();
      const week = st.currentWeek || currentWeek;
      if (week) {
        const cycle = getPayrollCycleFromWeek(week);
        const cycleDates = getPayrollCycleDates(cycle.year, cycle.month);
        const weeksToCache = [...new Set([...cycleDates.map(c => c.weekKey), week, offsetWeek(week, 1)])];
        void st.ensureWeeksLoaded?.(weeksToCache)?.catch?.(() => {});
        if (cycleDates.length) {
          void st.loadAttendanceRange?.(cycleDates[0].fullDateStr, cycleDates.at(-1).fullDateStr)?.catch?.(() => {});
        }
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [user?.id, syncStatus, currentWeek]);

  useEffect(() => {
    if (user?.id) initializeData();
  }, [user?.id, initializeData]);

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return;
    const handleOnline = () => {
      if (useStore.getState().user?.id) initializeData();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const st = useStore.getState();
        if (st.user?.id && (st.syncStatus === 'error' || st.realtimeStatus === 'error' || st.realtimeStatus === 'disconnected')) {
          initializeData();
        }
      }
    };
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.id, initializeData]);

  const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

  return (
    <ErrorBoundary>
      <WorkspaceBrandingSync />
      <WorkspaceRolesSync />
      <ScheduleOverrideModal />
      <Router basename={routerBasename}>
        <Suspense fallback={<div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900/95 text-slate-200 gap-3"><div className="w-7 h-7 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" /><div className="text-xs font-semibold tracking-wide text-slate-300">Đang tải không gian làm việc...</div></div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            }>
              {/* Index Route */}
              <Route index element={<IndexRedirect />} />
              
              {/* Admin & Manager Routes */}
              <Route path="admin/dashboard" element={<PrivateRoute allowedRoles={['admin']}><Dashboard /></PrivateRoute>} />
              <Route path="admin/schedule" element={<PrivateRoute allowedRoles={['admin']}><Schedule /></PrivateRoute>} />
              <Route path="admin/timesheet" element={<PrivateRoute allowedRoles={['admin']}><Timesheet /></PrivateRoute>} />
              <Route path="admin/feedback" element={<PrivateRoute allowedRoles={['admin']}><FeedbackCB /></PrivateRoute>} />
              <Route path="admin/employees" element={<PrivateRoute allowedRoles={['admin']}><Employees /></PrivateRoute>} />
              <Route path="admin/stores" element={<PrivateRoute allowedRoles={['admin']} storeAdminOnly><Stores /></PrivateRoute>} />
              <Route path="admin/logs" element={<PrivateRoute allowedRoles={['admin']} fullAdminOnly><AdminLogs /></PrivateRoute>} />
              <Route path="admin/settings" element={<PrivateRoute allowedRoles={['admin']} fullAdminOnly><WorkspaceSettings /></PrivateRoute>} />
              <Route path="admin/roles" element={<PrivateRoute allowedRoles={['admin']} fullAdminOnly><WorkspaceRoles /></PrivateRoute>} />
              <Route path="admin/security/change-password" element={<PrivateRoute allowedRoles={['admin']}><SecurityChangePassword /></PrivateRoute>} />
              <Route path="admin/shelves" element={<PrivateRoute allowedRoles={['admin']}><ShelfDateBoard /></PrivateRoute>} />
              <Route path="admin/handbook" element={<PrivateRoute allowedRoles={['admin']}><HandbookManager /></PrivateRoute>} />

              {/* Employee Routes */}
              <Route path="employee/profile" element={<PrivateRoute allowedRoles={['employee', 'admin']}><EmployeeProfile /></PrivateRoute>} />
              <Route path="employee/home" element={<PrivateRoute allowedRoles={['employee', 'admin']}><EmployeeHome /></PrivateRoute>} />
              <Route path="employee/support" element={<Navigate to="/employee/home" replace />} />
              <Route path="admin/support" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="employee/schedule" element={<PrivateRoute allowedRoles={['employee', 'admin']}><EmployeeSchedule /></PrivateRoute>} />
              <Route path="employee/timesheet" element={<PrivateRoute allowedRoles={['employee', 'admin']}><EmployeeTimesheet /></PrivateRoute>} />
              <Route path="employee/feedback" element={<PrivateRoute allowedRoles={['employee', 'admin']}><EmployeeFeedback /></PrivateRoute>} />
              <Route path="employee/shelves" element={<PrivateRoute allowedRoles={['employee', 'admin']}><ShelfDateBoard /></PrivateRoute>} />
              <Route path="employee/handbook" element={<PrivateRoute allowedRoles={['employee', 'admin']}><Handbook /></PrivateRoute>} />
              <Route path="employee/change-password" element={<PrivateRoute allowedRoles={['employee', 'admin']}><EmployeeChangePassword /></PrivateRoute>} />
            </Route>
            
            <Route path="*" element={<CatchAllRedirect />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
