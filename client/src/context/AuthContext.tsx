import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, NotificationRecord } from '../types';
import { api } from '../services/api';

interface ToastAlert extends NotificationRecord {
  toastId: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  unreadCount: number;
  toasts: ToastAlert[];
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  sendOtp: (name: string, email: string, password: string) => Promise<{ message: string; email: string; otp?: string; expiresIn: number; alreadyRegistered?: boolean; token?: string; user?: UserProfile }>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<{ message: string; otp?: string }>;
  forgotPasswordSendOtp: (email: string) => Promise<{ message: string; email: string; expiresIn: number }>;
  forgotPasswordReset: (email: string, otp: string, newPassword: string) => Promise<void>;
  demoLogin: (mode: 'USER' | 'ADMIN') => Promise<void>;
  logout: () => void;
  updateUser: (user: UserProfile) => void;
  refreshNotificationsCount: () => Promise<void>;
  removeToast: (toastId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('ob_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastAlert[]>([]);

  const refreshNotificationsCount = async () => {
    if (!token) return;
    try {
      const data = await api.getNotifications();
      setUnreadCount(data.unreadCount);
    } catch (e) {
      // Ignore background sync errors
    }
  };

  // Initial token verification
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('ob_token');
      if (savedToken) {
        try {
          const { user } = await api.getMe();
          setUser(user);
          setToken(savedToken);
          // Fetch initial unread notifications count
          const notifData = await api.getNotifications();
          setUnreadCount(notifData.unreadCount);
        } catch (e) {
          console.warn('Session expired or invalid token');
          localStorage.removeItem('ob_token');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // WebSocket Live Connection for real-time In-App alert toasts
  useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${token}`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'ORDER_BLOCK_ALERT') {
            const alertData: NotificationRecord = message.data;
            const toast: ToastAlert = {
              ...alertData,
              toastId: `${Date.now()}_${Math.random()}`
            };

            setToasts((prev) => [toast, ...prev].slice(0, 4));
            setUnreadCount((c) => c + 1);

            // Auto dismiss toast after 8 seconds
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.toastId !== toast.toastId));
            }, 8000);
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      ws.onerror = (e) => {
        console.warn('WebSocket connection warning:', e);
      };
    } catch (err) {
      console.warn('WebSocket init failed:', err);
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [token]);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    localStorage.setItem('ob_token', data.token);
    setToken(data.token);
    setUser(data.user);
    await refreshNotificationsCount();
  };

  const signup = async (name: string, email: string, password: string) => {
    const data = await api.signup(name, email, password);
    localStorage.setItem('ob_token', data.token);
    setToken(data.token);
    setUser(data.user);
    await refreshNotificationsCount();
  };

  const sendOtp = async (name: string, email: string, password: string) => {
    const res = await api.sendOtp(name, email, password);
    if (res.alreadyRegistered && res.token && res.user) {
      localStorage.setItem('ob_token', res.token);
      setToken(res.token);
      setUser(res.user);
      await refreshNotificationsCount();
    }
    return res;
  };

  const verifyOtp = async (email: string, otp: string) => {
    const data = await api.verifyOtp(email, otp);
    localStorage.setItem('ob_token', data.token);
    setToken(data.token);
    setUser(data.user);
    await refreshNotificationsCount();
  };

  const resendOtp = async (email: string) => {
    return await api.resendOtp(email);
  };

  const forgotPasswordSendOtp = async (email: string) => {
    return await api.forgotPasswordSendOtp(email);
  };

  const forgotPasswordReset = async (email: string, otp: string, newPassword: string) => {
    const data = await api.forgotPasswordReset(email, otp, newPassword);
    localStorage.setItem('ob_token', data.token);
    setToken(data.token);
    setUser(data.user);
    await refreshNotificationsCount();
  };

  const demoLogin = async (mode: 'USER' | 'ADMIN') => {
    if (mode === 'ADMIN') {
      await login('admin@orderblock.com', 'admin123');
    } else {
      await login('trader@orderblock.com', 'trader123');
    }
  };

  const logout = () => {
    localStorage.removeItem('ob_token');
    setToken(null);
    setUser(null);
    setUnreadCount(0);
    setToasts([]);
  };

  const updateUser = (updated: UserProfile) => {
    setUser(updated);
  };

  const removeToast = (toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        unreadCount,
        toasts,
        login,
        signup,
        sendOtp,
        verifyOtp,
        resendOtp,
        forgotPasswordSendOtp,
        forgotPasswordReset,
        demoLogin,
        logout,
        updateUser,
        refreshNotificationsCount,
        removeToast
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
