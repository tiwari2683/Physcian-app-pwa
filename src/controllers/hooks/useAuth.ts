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
        role: decoded['custom:role'],
        jwtToken: token,
      };
      dispatch(setCredentials(user));
    } catch (err: any) {
      console.log('Session check failed or user needs to log in:', err.message);
      authService.logout();
      dispatch(logoutUser());
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const login = async (email: string, password: string): Promise<'success' | 'new_password_required' | 'error'> => {
    setError(null);
    dispatch(setLoading(true));
    try {
      const result = await authService.login(email, password);

      if (result.type === 'NEW_PASSWORD_REQUIRED') {
        dispatch(setLoading(false));
        return 'new_password_required';
      }

      // type === 'SUCCESS'
      const decoded: any = jwtDecode(result.token);
      const user: User = {
        email: decoded.email,
        sub: decoded.sub,
        name: decoded.name || decoded['cognito:username'],
        role: decoded['custom:role'],
        jwtToken: result.token,
      };
      dispatch(setCredentials(user));
      return 'success';
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      dispatch(setLoading(false));
      return 'error';
    }
  };

  // Called from ForceChangePasswordScreen after user enters a new password
  const completeNewPassword = async (newPassword: string): Promise<boolean> => {
    setError(null);
    dispatch(setLoading(true));
    try {
      const token = await authService.completeNewPassword(newPassword);
      const decoded: any = jwtDecode(token);
      const user: User = {
        email: decoded.email,
        sub: decoded.sub,
        name: decoded.name || decoded['cognito:username'],
        role: decoded['custom:role'],
        jwtToken: token,
      };
      dispatch(setCredentials(user));
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to set new password.');
      dispatch(setLoading(false));
      return false;
    }
  };

  const logout = () => {
    authService.logout();
    dispatch(logoutUser());
  };

  return { login, logout, checkSession, completeNewPassword, error };
};
