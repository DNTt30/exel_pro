import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { lazy, Suspense } from 'react';

const Login = lazy(() => import('./pages/Login'));
const AppLayout = lazy(() => import('./components/layout/AppLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Schedule = lazy(() => import('./pages/admin/Schedule'));
const Timesheet = lazy(() => import('./pages/admin/Timesheet'));
const FeedbackCB = lazy(() => import('./pages/admin/FeedbackCB'));
const Employees = lazy(() => import('./pages/admin/Employees'));
const Stores = lazy(() => import('./pages/admin/Stores'));
const EmployeeSchedule = lazy(() => import('./pages/employee/EmployeeSchedule'));
const EmployeeTimesheet = lazy(() => import('./pages/employee/EmployeeTimesheet'));
const EmployeeFeedback = lazy(() => import('./pages/employee/EmployeeFeedback'));

const PrivateRoute = ({ children, allowedRoles }) => {
  const user = useStore(state => state.user);
  
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const IndexRedirect = () => {
  const user = useStore(state => state.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin' || user.isManager) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/employee/schedule" replace />;
};

function App() {
  const user = useStore(state => state.user);
  const initializeData = useStore(state => state.initializeData);
  const isInitializing = useStore(state => state.isInitializing);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  if (isInitializing) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50"><div className="text-blue-600 font-bold">Đang tải dữ liệu từ Cloud...</div></div>;
  }

  return (
    <Router>
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
            <Route path="admin/dashboard" element={<Dashboard />} />
            <Route path="admin/schedule" element={<Schedule />} />
            <Route path="admin/timesheet" element={<Timesheet />} />
            <Route path="admin/feedback" element={<FeedbackCB />} />
            <Route path="admin/employees" element={<Employees />} />
            <Route path="admin/stores" element={<Stores />} />

            {/* Employee Routes */}
            <Route path="employee/schedule" element={<EmployeeSchedule />} />
            <Route path="employee/timesheet" element={<EmployeeTimesheet />} />
            <Route path="employee/feedback" element={<EmployeeFeedback />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
