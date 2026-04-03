import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../controllers/hooks/hooks';

interface RoleRouteProps {
  allowedRole: 'Doctor' | 'Assistant';
}

export const RoleRoute = ({ allowedRole }: RoleRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Verifying access...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== allowedRole) {
    // If authenticated but wrong role, redirect to root for AppRouter to decide
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
