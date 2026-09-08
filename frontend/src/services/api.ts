import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    const isSessionCheck = error.config?.url?.includes('/auth/get-session');
    if (error.response?.status === 401 && !isSessionCheck) {
      // Clear any stored token and redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

