import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const API_URL = configuredApiUrl.replace(/\/+$/, '');
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for better-auth to send cookies
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl: string = error.config?.url ?? '';
    const isSessionCheck = requestUrl.includes('/auth/get-session');
    const isSignInRequest = requestUrl.includes('/auth/sign-in/email');

    if (error.response?.status === 401 && !isSessionCheck && !isSignInRequest) {
      // Clear any stored token and redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
