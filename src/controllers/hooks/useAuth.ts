import { useState, useCallback } from 'react';
import { useAppDispatch } from './hooks';
import { setCredentials, logoutUser, setLoading } from '../slices/authSlice';
import { authService } from '../../services/auth/authService';
import type { User } from '../../models';
import { jwtDecode } from 'jwt-decode';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const token = await authService.getCurrentSessionToken();
      const decoded: any = jwtDecode(token);
      const user: User = {
        email: decoded.email,
        sub: decoded.sub,
        name: decoded.name || decoded['cognito:username'],
        jwtToken: token,
      };
      dispatch(setCredentials(user));
    } catch (err) {
      console.log('No active session found. User needs to log in.');
      dispatch(logoutUser());
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const login = async (email: string, password: string) => {
    setError(null);
    dispatch(setLoading(true));
    try {
      const token = await authService.login(email, password);
      const decoded: any = jwtDecode(token);
      const user: User = {
        email: decoded.email,
        sub: decoded.sub,
        name: decoded.name || decoded['cognito:username'],
        jwtToken: token,
      };
      dispatch(setCredentials(user));
      return true;
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      dispatch(setLoading(false));
      return false;
    }
  };

  const logout = () => {
    authService.logout();
    dispatch(logoutUser());
  };

  return { login, logout, checkSession, error };
};
