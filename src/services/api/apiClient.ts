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
      // 1. Get the raw JWT token string directly
      const tokenString = await authService.getCurrentSessionToken();

      if (tokenString && config.headers) {
        // 2. Send as 'Bearer <token>' — required by the Cognito User Pool Authorizer on API Gateway
        config.headers.Authorization = `Bearer ${tokenString}`;
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
