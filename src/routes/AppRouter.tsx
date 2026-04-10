import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { LoginScreen } from '../views/Auth/LoginScreen';
import { SuperAdminLoginScreen } from '../views/Auth/SuperAdminLoginScreen';
import { ForgotPasswordScreen } from '../views/Auth/ForgotPasswordScreen';
import { ForceChangePasswordScreen } from '../views/Auth/ForceChangePasswordScreen';
import { useAppSelector } from '../controllers/hooks/hooks';
import SuperAdminDashboard from '../views/SuperAdmin/Dashboard/SuperAdminDashboard';
import ClinicDetailPage from '../views/SuperAdmin/Clinic/ClinicDetailPage';

// 1. Lazy Load the Sub-Apps for Code Splitting
const DoctorRoutes = lazy(() => import('./DoctorRoutes'));
const AssistantRoutes = lazy(() => import('./AssistantRoutes'));

// 2. Loading Spinner for Suspense
const LoadingSpinner = ({ message }: { message: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50">
    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-gray-500 font-medium animate-pulse">{message}</p>
  </div>
);

// 3. Create the Root Redirector for the '/' path
const RoleRedirector = () => {
  const { user } = useAppSelector((state) => state.auth);
  
  if (user?.role === 'Doctor') return <Navigate to="/doctor/dashboard" replace />;
  if (user?.role === 'Assistant') return <Navigate to="/assistant/dashboard" replace />;
  if (user?.role === 'SuperAdmin') return <Navigate to="/superadmin/dashboard" replace />;
  // Fallback if role is unassigned or invalid
  return <Navigate to="/login" replace />;
};

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/admin-login" element={<SuperAdminLoginScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/change-password" element={<ForceChangePasswordScreen />} />

        {/* Protected Parent Route (Authentication Guard) */}
        <Route element={<ProtectedRoute />}>
          
          {/* Base Path Traffic Controller */}
          <Route path="/" element={<RoleRedirector />} />

          {/* Doctor Sandbox (Role Guard + Code Splitting) */}
          <Route element={<RoleRoute allowedRole="Doctor" />}>
            <Route path="/doctor/*" element={
              <Suspense fallback={<LoadingSpinner message="Loading Physician Experience..." />}>
                <DoctorRoutes />
              </Suspense>
            } />
          </Route>

          {/* Assistant Sandbox (Role Guard + Code Splitting) */}
          <Route element={<RoleRoute allowedRole="Assistant" />}>
            <Route path="/assistant/*" element={
              <Suspense fallback={<LoadingSpinner message="Loading Assistant Panel..." />}>
                <AssistantRoutes />
              </Suspense>
            } />
          </Route>

          {/* SuperAdmin Sandbox (Role Guard) */}
          <Route element={<RoleRoute allowedRole="SuperAdmin" />}>
            <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
            <Route path="/superadmin/clinic/:clinicId" element={<ClinicDetailPage />} />
          </Route>

          {/* Catch-all for authenticated users: redirect back to root for sort-out */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
