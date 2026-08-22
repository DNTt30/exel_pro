import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { isOpsManager } from './lib/authSession';
import { lazy, Suspense } from 'react';

const Login = lazy(() => import('./pages/Login'));
const AppLayout = lazy(() => import('./components/layout/AppLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Schedule = lazy(() => import('./pages/admin/Schedule'));
const Timesheet = lazy(() => import('./pages/admin/Timesheet'));
const FeedbackCB = lazy(() => import('./pages/admin/FeedbackCB'));
const Employees = lazy(() => import('./pages/admin/Employees'));
const Stores = lazy(() => import('./pages/admin/Stores'));
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'));
const EmployeeHome = lazy(() => import('./pages/employee/EmployeeHome'));
const EmployeeSchedule = lazy(() => import('./pages/employee/EmployeeSchedule'));
const EmployeeTimesheet = lazy(() => import('./pages/employee/EmployeeTimesheet'));
const EmployeeFeedback = lazy(() => import('./pages/employee/EmployeeFeedback'));
const ShelfDateBoard = lazy(() => import('./pages/shared/ShelfDateBoard'));

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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md max-w-md">
            <div className="text-3xl mb-2">⚠️</div>
            <h2 className="text-sm font-bold text-slate-800 mb-1">Đã có lỗi hiển thị giao diện</h2>
            <p className="text-xs text-slate-500 mb-4">{this.state.error?.message || 'Vui lòng bấm tải lại trang.'}</p>
            <button 
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="btn btn-primary text-xs px-4 py-2"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const PrivateRoute = ({ children, allowedRoles }) => {
  const user = useStore(state => state.user);
  
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.includes(user.role);
    const managerGetsAdmin = isOpsManager(user) && allowedRoles.includes('admin');
    if (!hasRole && !managerGetsAdmin) {
      return <Navigate to="/" replace />;
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

function App() {
  const user = useStore(state => state.user);
  const initializeData = useStore(state => state.initializeData);

  useEffect(() => {
    if (user?.id) initializeData();
  }, [user?.id, initializeData]);

  const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

  return (
    <ErrorBoundary>
      <Router basename={routerBasename}>
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-slate-50"><div className="text-blue-600 font-bold">Đang tải trang...</div></div>}>
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
              <Route path="admin/stores" element={<PrivateRoute allowedRoles={['admin']}><Stores /></PrivateRoute>} />
              <Route path="admin/logs" element={<PrivateRoute allowedRoles={['admin']}><AdminLogs /></PrivateRoute>} />
              <Route path="admin/shelves" element={<PrivateRoute allowedRoles={['admin']}><ShelfDateBoard /></PrivateRoute>} />

              {/* Employee Routes */}
              <Route path="employee/home" element={<PrivateRoute allowedRoles={['employee', 'admin']}><EmployeeHome /></PrivateRoute>} />
              <Route path="employee/schedule" element={<PrivateRoute allowedRoles={['employee', 'admin']}><EmployeeSchedule /></PrivateRoute>} />
              <Route path="employee/timesheet" element={<PrivateRoute allowedRoles={['employee', 'admin']}><EmployeeTimesheet /></PrivateRoute>} />
              <Route path="employee/feedback" element={<PrivateRoute allowedRoles={['employee', 'admin']}><EmployeeFeedback /></PrivateRoute>} />
              <Route path="employee/shelves" element={<PrivateRoute allowedRoles={['employee', 'admin']}><ShelfDateBoard /></PrivateRoute>} />
            </Route>
            
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
