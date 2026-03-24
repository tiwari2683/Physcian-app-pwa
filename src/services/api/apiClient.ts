// src/services/api/apiClient.ts
import axios from 'axios';
import { authService } from '../auth/authService';

const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach the Cognito JWT token to every request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await authService.getCurrentSessionToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // If token fetch fails (e.g., user logged out), let the request proceed 
      // without it, allowing the backend to reject it with a 401.
      console.warn('Could not attach auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Force logout or trigger a token refresh event here if needed
      console.error('Unauthorized access - please log in again.');
      authService.logout();
      window.location.href = '/login'; // Quick redirect fallback
    }
    return Promise.reject(error);
  }
);
