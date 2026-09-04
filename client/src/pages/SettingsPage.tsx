import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { NotificationPreferences } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  CheckCircle2,
  Lock,
  LogOut,
  Sliders,
  HelpCircle,
  Clock,
  Bookmark
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    userId: 0,
    alertTypePreference: 'BOTH',
    dailyAlertsEnabled: true,
    weeklyAlertsEnabled: true,
    appNotificationsEnabled: true,
    emailNotificationsEnabled: true,
    emailAddress: user?.email || '',
  });

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Profile Form state
  const [profileName, setProfileName] = useState<string>(user?.name || '');
  const [profileEmail, setProfileEmail] = useState<string>(user?.email || '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Watchlist Count state
  const [watchlistCount, setWatchlistCount] = useState<number>(0);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const pData = await api.getPreferences();
        setPrefs(pData.preferences);
        setProfileName(user?.name || '');
        setProfileEmail(user?.email || '');

        const wlData = await api.getWatchlist();
        setWatchlistCount(wlData.count);
      } catch (e) {
        console.warn('Error loading preferences:', e);
      }
    };

    loadSettings();
  }, [user]);

  const handleUpdatePreference = async (updated: Partial<NotificationPreferences>) => {
    const newPrefs = { ...prefs, ...updated };
    setPrefs(newPrefs);
    setSaveSuccess(false);

    try {
      await api.updatePreferences(newPrefs);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      alert('Error updating notification preferences.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      const res = await api.updateProfile(profileName, profileEmail);
      updateUser(res.user);
      setProfileMsg('Profile updated successfully.');
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err: any) {
      setProfileMsg(err.message || 'Error updating profile.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (!currentPassword || !newPassword) {
      setPasswordMsg({ text: 'Please fill in both password fields.', isError: true });
      return;
    }

    try {
      const res = await api.changePassword(currentPassword, newPassword);
      setPasswordMsg({ text: res.message, isError: false });
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPasswordMsg(null), 4000);
    } catch (err: any) {
      setPasswordMsg({ text: err.message || 'Incorrect current password.', isError: true });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <SettingsIcon className="w-5 h-5" />
            </span>
            <span>APPLICATION SETTINGS</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Configure order block alerts, notification channels, account, and watchlist
          </p>
        </div>

        {saveSuccess && (
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            <span>Preferences Saved</span>
          </span>
        )}
      </div>

      {/* 1. ORDER BLOCK ALERT TYPE PREFERENCE */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-extrabold text-white">ORDER BLOCK ALERT TYPE</h2>
        </div>
        <p className="text-xs text-slate-400">
          Choose which types of Order Blocks trigger instant In-App and Email notifications.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Option: Both (Default) */}
          <div
            onClick={() => handleUpdatePreference({ alertTypePreference: 'BOTH' })}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              prefs.alertTypePreference === 'BOTH'
                ? 'bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              checked={prefs.alertTypePreference === 'BOTH'}
              onChange={() => {}}
              className="mt-1 text-emerald-500 focus:ring-emerald-500"
            />
            <div>
              <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                <span>Both (Bullish & Bearish)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono">RECOMMENDED</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Receive notifications when price enters both Bullish and Bearish Order Blocks.
              </p>
            </div>
          </div>

          {/* Option: Bullish Only */}
          <div
            onClick={() => handleUpdatePreference({ alertTypePreference: 'BULLISH_ONLY' })}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              prefs.alertTypePreference === 'BULLISH_ONLY'
                ? 'bg-emerald-950/30 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              checked={prefs.alertTypePreference === 'BULLISH_ONLY'}
              onChange={() => {}}
              className="mt-1 text-emerald-500 focus:ring-emerald-500"
            />
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>🟢 Bullish Only</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Bullish OB → Alert | Bearish OB → No Alert.
              </p>
            </div>
          </div>

          {/* Option: Bearish Only */}
          <div
            onClick={() => handleUpdatePreference({ alertTypePreference: 'BEARISH_ONLY' })}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              prefs.alertTypePreference === 'BEARISH_ONLY'
                ? 'bg-rose-950/30 border-rose-500 shadow-md ring-1 ring-rose-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              checked={prefs.alertTypePreference === 'BEARISH_ONLY'}
              onChange={() => {}}
              className="mt-1 text-rose-500 focus:ring-rose-500"
            />
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>🔴 Bearish Only</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Bullish OB → No Alert | Bearish OB → Alert.
              </p>
            </div>
          </div>

          {/* Option: Disabled */}
          <div
            onClick={() => handleUpdatePreference({ alertTypePreference: 'DISABLED' })}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              prefs.alertTypePreference === 'DISABLED'
                ? 'bg-slate-800/80 border-slate-600 shadow-md'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              checked={prefs.alertTypePreference === 'DISABLED'}
              onChange={() => {}}
              className="mt-1 text-slate-500 focus:ring-slate-500"
            />
            <div>
              <div className="font-bold text-sm text-slate-300">
                <span>Disabled</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Do not generate any Order Block notifications.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. NOTIFICATION CHANNELS & TIMEFRAMES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Notification Channels */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-extrabold text-white">NOTIFICATION METHODS</h2>
          </div>
          <p className="text-xs text-slate-400">
            Enable or disable notification channels independently.
          </p>

          <div className="space-y-3 pt-1">
            {/* In-App Notifications Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div>
                <span className="font-bold text-sm text-white block">App Notifications</span>
                <span className="text-xs text-slate-400">Real-time In-App alert banners & badges</span>
              </div>
              <button
                onClick={() => handleUpdatePreference({ appNotificationsEnabled: !prefs.appNotificationsEnabled })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                  prefs.appNotificationsEnabled
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {prefs.appNotificationsEnabled ? '[ ON ]' : '[ OFF ]'}
              </button>
            </div>

            {/* Email Notifications Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div>
                <span className="font-bold text-sm text-white block">Email Notifications</span>
                <span className="text-xs text-slate-400">HTML email alerts to registered address</span>
              </div>
              <button
                onClick={() => handleUpdatePreference({ emailNotificationsEnabled: !prefs.emailNotificationsEnabled })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                  prefs.emailNotificationsEnabled
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {prefs.emailNotificationsEnabled ? '[ ON ]' : '[ OFF ]'}
              </button>
            </div>

            {/* Notification Email Address Input */}
            <div className="pt-2">
              <label className="text-xs font-medium text-slate-400 block mb-1">Destination Alert Email:</label>
              <input
                type="email"
                value={prefs.emailAddress}
                onChange={(e) => setPrefs({ ...prefs, emailAddress: e.target.value })}
                onBlur={() => handleUpdatePreference({ emailAddress: prefs.emailAddress })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Timeframe Alerts & Watchlist Info */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-extrabold text-white">TIMEFRAME ALERTS</h2>
          </div>
          <p className="text-xs text-slate-400">
            Control alerts based on Daily and Weekly institutional Order Blocks.
          </p>

          <div className="space-y-3 pt-1">
            {/* Daily Alerts Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div>
                <span className="font-bold text-sm text-white block">Daily Alerts (1D)</span>
                <span className="text-xs text-slate-400">Alerts for Daily Bullish & Bearish OBs</span>
              </div>
              <button
                onClick={() => handleUpdatePreference({ dailyAlertsEnabled: !prefs.dailyAlertsEnabled })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                  prefs.dailyAlertsEnabled
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {prefs.dailyAlertsEnabled ? '[ ON ]' : '[ OFF ]'}
              </button>
            </div>

            {/* Weekly Alerts Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div>
                <span className="font-bold text-sm text-white block">Weekly Alerts (1W)</span>
                <span className="text-xs text-slate-400">Alerts for Weekly Bullish & Bearish OBs</span>
              </div>
              <button
                onClick={() => handleUpdatePreference({ weeklyAlertsEnabled: !prefs.weeklyAlertsEnabled })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                  prefs.weeklyAlertsEnabled
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {prefs.weeklyAlertsEnabled ? '[ ON ]' : '[ OFF ]'}
              </button>
            </div>

            {/* Watchlist Capacity Summary */}
            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-emerald-400" />
                  <span>Watchlist Capacity</span>
                </span>
                <span className="text-xs text-slate-400">Global stocks monitored</span>
              </div>
              <span className="font-mono font-bold text-sm text-emerald-400">
                {watchlistCount} / 30 STOCKS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. USER ACCOUNT & PASSWORD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-extrabold text-white">ACCOUNT PROFILE</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Full Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Email Address</label>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono text-slate-400">
                Role: <strong className="text-slate-200">{user?.isOwner ? 'MASTER OWNER' : 'TRADER'}</strong>
              </span>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Save Profile
              </button>
            </div>

            {profileMsg && (
              <p className="text-xs text-emerald-400 font-semibold pt-1">{profileMsg}</p>
            )}
          </form>
        </div>

        {/* Password Management */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-extrabold text-white">PASSWORD MANAGEMENT</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-sky-600 text-white border border-slate-700 hover:border-sky-500 rounded-lg text-xs font-bold transition-colors"
              >
                Update Password
              </button>
            </div>

            {passwordMsg && (
              <p className={`text-xs font-semibold pt-1 ${passwordMsg.isError ? 'text-rose-400' : 'text-emerald-400'}`}>
                {passwordMsg.text}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* 4. GENERAL & ABOUT */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-xs text-slate-400 space-y-3">
        <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <span>About Order Block Detector</span>
        </h3>
        <p>
          <strong>Order Block Detector</strong> is India's dedicated institutional Smart Money & Order Block monitoring platform designed for equity and momentum traders. The application detects high-probability institutional supply and demand Order Blocks on Daily and Weekly timeframes across all Indian stocks on the National Stock Exchange (NSE Large, Mid, Small, and SME) and Bombay Stock Exchange (BSE).
        </p>
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
          <span>Version: 1.0.0 (India NSE/BSE Edition)</span>
          <span>Currency: INR (₹) • 30-Day Notification Retention</span>
        </div>
      </div>

      {/* Logout Action */}
      <div className="text-center pt-2">
        <button
          onClick={logout}
          className="px-6 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of Account</span>
        </button>
      </div>
    </div>
  );
};
