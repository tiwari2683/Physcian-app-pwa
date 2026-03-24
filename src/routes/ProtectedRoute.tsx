import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../controllers/hooks/hooks';

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading application...</div>;
  }

  // If authenticated, render the child routes (Outlet). Otherwise, force redirect to login.
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};
