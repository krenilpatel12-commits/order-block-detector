import {
  NotificationPreferences,
  NotificationRecord,
  SentEmailLog,
  StockAnalysis,
  StockOverview,
  Timeframe,
  UserProfile,
  WatchlistStockItem
} from '../types';

const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('ob_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  let data: any = {};
  try {
    const text = await res.text();
    if (text && text.trim().length > 0) {
      data = JSON.parse(text);
    }
  } catch (e) {
    if (!res.ok) {
      throw new Error(`Backend server is not reachable (HTTP ${res.status}). Please ensure backend server is started.`);
    }
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}.`);
  }
  return data as T;
}

export const api = {
  // Auth
  async sendOtp(name: string, email: string, password: string): Promise<{ message: string; email: string; otp?: string; expiresIn: number; alreadyRegistered?: boolean; token?: string; user?: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    return handleResponse(res);
  },

  async verifyOtp(email: string, otp: string): Promise<{ token: string; user: UserProfile; message: string }> {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    return handleResponse(res);
  },

  async resendOtp(email: string): Promise<{ message: string; otp?: string; expiresIn: number }> {
    const res = await fetch(`${API_BASE}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  async forgotPasswordSendOtp(email: string): Promise<{ message: string; email: string; expiresIn: number; otp?: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  async forgotPasswordReset(email: string, otp: string, newPassword: string): Promise<{ token: string; user: UserProfile; message: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    return handleResponse(res);
  },

  async signup(name: string, email: string, password: string): Promise<{ token: string; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    return handleResponse(res);
  },

  async login(email: string, password: string): Promise<{ token: string; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async updateProfile(name?: string, email?: string): Promise<{ user: UserProfile; message: string }> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ name, email }),
    });
    return handleResponse(res);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return handleResponse(res);
  },

  // Stocks & Global Markets
  async searchStocks(query: string, country?: string): Promise<{ results: StockOverview[] }> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (country) params.append('country', country);
    const res = await fetch(`${API_BASE}/stocks/search?${params.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getMarkets(): Promise<{ markets: any[] }> {
    const res = await fetch(`${API_BASE}/stocks/markets`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getStockOverview(symbol: string): Promise<{ stock: StockOverview }> {
    const res = await fetch(`${API_BASE}/stocks/${symbol}/overview`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getStockAnalysis(symbol: string, timeframe: Timeframe = '1D'): Promise<StockAnalysis> {
    const res = await fetch(`${API_BASE}/stocks/${symbol}/analysis?timeframe=${timeframe}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async overridePrice(symbol: string, price: number | null): Promise<{ message: string; currentPrice: number }> {
    const res = await fetch(`${API_BASE}/stocks/${symbol}/override-price`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ price }),
    });
    return handleResponse(res);
  },

  // Watchlist
  async getWatchlist(): Promise<{ watchlist: WatchlistStockItem[]; count: number; maxLimit: number; isLimitReached: boolean }> {
    const res = await fetch(`${API_BASE}/watchlist`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async addToWatchlist(symbol: string): Promise<{ message: string; count: number; maxLimit: number }> {
    const res = await fetch(`${API_BASE}/watchlist/add`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ symbol }),
    });
    return handleResponse(res);
  },

  async removeFromWatchlist(symbol: string): Promise<{ message: string; count: number; maxLimit: number }> {
    const res = await fetch(`${API_BASE}/watchlist/${symbol}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async checkWatchlist(symbol: string): Promise<{ inWatchlist: boolean; count: number; maxLimit: number }> {
    const res = await fetch(`${API_BASE}/watchlist/check/${symbol}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Notifications & Preferences
  async getPreferences(): Promise<{ preferences: NotificationPreferences }> {
    const res = await fetch(`${API_BASE}/notifications/preferences`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<{ preferences: NotificationPreferences; message: string }> {
    const res = await fetch(`${API_BASE}/notifications/preferences`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(prefs),
    });
    return handleResponse(res);
  },

  async getNotifications(): Promise<{ notifications: NotificationRecord[]; unreadCount: number; retentionDays: number }> {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async markNotificationRead(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async markAllNotificationsRead(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async clearNotifications(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/notifications/clear`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async triggerTestAlert(symbol = 'RELIANCE', timeframe: Timeframe = '1D', obType: 'Bullish' | 'Bearish' = 'Bullish'): Promise<any> {
    const res = await fetch(`${API_BASE}/notifications/test`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ symbol, timeframe, obType }),
    });
    return handleResponse(res);
  },

  async getSentEmails(): Promise<{ emails: SentEmailLog[]; count: number }> {
    const res = await fetch(`${API_BASE}/notifications/emails`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Master Account Admin
  async getAdminStats(): Promise<{ system: any; stats: any }> {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getAdminGlobalScan(): Promise<{ opportunities: any[]; totalActiveOBs: number; scannedMarketsCount: number }> {
    const res = await fetch(`${API_BASE}/admin/global-scan`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getAdminUsers(): Promise<{ users: any[] }> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  }
};
