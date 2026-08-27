import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  image?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get('/auth/get-session');
        if (response.data?.user) {
          setUser(response.data.user);
        }
      } catch (_error) {
        // User not authenticated
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/sign-in/email', {
        email,
        password,
      });

      if (response.data?.user) {
        setUser(response.data.user);
        // better-auth stores session automatically in cookies
        if (response.data?.token) {
          localStorage.setItem('authToken', response.data.token);
        }
      } else {
        throw new Error('Login failed: No user data returned');
      }
    } catch (error) {
      setIsLoading(false);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login failed: ' + String(error));
    }
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/sign-out');
      setUser(null);
      localStorage.removeItem('authToken');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
