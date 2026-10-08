import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types/auth';
import apiClient from '../api/client';
import { walletStore } from '../services/walletStore';
import { complaintStore } from '../services/complaintStore';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (mobile: string, password: string) => Promise<{ success: boolean; message: string; redirectUrl?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('v2online_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('v2online_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    if (!localStorage.getItem('v2online_token')) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await apiClient.get('/auth/me');
      if (response.data.status === 'success') {
        setUser(response.data.user);
        localStorage.setItem('v2online_user', JSON.stringify(response.data.user));
        // Sync stores with authenticated user
        if (response.data.user?.id) {
          walletStore.setUser(response.data.user.id);
          complaintStore.setUser(response.data.user.id);
        }
      }
    } catch (error) {
      console.error('Failed to refresh user profile', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (mobile: string, password: string) => {
    // All authentication goes through the real backend API
    try {
      const response = await apiClient.post('/auth/login', { mobile, password });
      if (response.data.status === 'success') {
        const { token: receivedToken, user: receivedUser, redirect_url } = response.data;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('v2online_token', receivedToken);
        localStorage.setItem('v2online_user', JSON.stringify(receivedUser));

        // Initialize stores with the authenticated user's data
        if (receivedUser?.id) {
          walletStore.setUser(receivedUser.id);
          complaintStore.setUser(receivedUser.id);
        }

        return { success: true, message: response.data.message, redirectUrl: redirect_url };
      }
      return { success: false, message: response.data.message || 'Login failed' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Login request failed. Check server connection.';
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      // Clear stores
      walletStore.clearUser();
      complaintStore.clearUser();

      setUser(null);
      setToken(null);
      localStorage.removeItem('v2online_token');
      localStorage.removeItem('v2online_user');
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
