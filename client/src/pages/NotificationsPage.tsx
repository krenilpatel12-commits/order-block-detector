import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { NotificationRecord, SentEmailLog } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  Mail,
  CheckCircle2,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Inbox
} from 'lucide-react';

interface NotificationsPageProps {
  onNavigateToStock: (symbol: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigateToStock }) => {
  const { refreshNotificationsCount } = useAuth();
  const [activeTab, setActiveTab] = useState<'IN_APP' | 'EMAILS'>('IN_APP');
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [emails, setEmails] = useState<SentEmailLog[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'Bullish' | 'Bearish'>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEmail, setSelectedEmail] = useState<SentEmailLog | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const notifData = await api.getNotifications();
      setNotifications(Array.isArray(notifData?.notifications) ? notifData.notifications : []);

      const emailData = await api.getSentEmails();
      setEmails(Array.isArray(emailData?.emails) ? emailData.emails : []);
    } catch (err) {
      console.warn('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await refreshNotificationsCount();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear your notification history?')) return;
    try {
      await api.clearNotifications();
      setNotifications([]);
      await refreshNotificationsCount();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleTriggerTest = async () => {
    try {
      await api.triggerTestAlert('RELIANCE', '1D', 'Bullish');
      await loadData();
      await refreshNotificationsCount();
    } catch (e) {
      console.warn(e);
    }
  };

  // Group notifications by Today, Yesterday, Older
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const filteredNotifs = notifications.filter((n) => {
    if (filterType === 'ALL') return true;
    return n.obType === filterType;
  });

  const todayList = filteredNotifs.filter((n) => n.createdAt.startsWith(todayStr));
  const yesterdayList = filteredNotifs.filter((n) => n.createdAt.startsWith(yesterdayStr));
  const olderList = filteredNotifs.filter((n) => !n.createdAt.startsWith(todayStr) && !n.createdAt.startsWith(yesterdayStr));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Tabs */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Bell className="w-5 h-5" />
              </span>
              <span>ORDER BLOCK ALERTS</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Automatic In-App & Email alerts • Retained for 30 days
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTriggerTest}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulate Alert</span>
            </button>
            {notifications.length > 0 && (
              <>
                <button
                  onClick={handleMarkAllRead}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark All Read</span>
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* View Switcher Tabs: In-App Notifications vs Sent Emails */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('IN_APP')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'IN_APP' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>In-App Alerts ({notifications.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('EMAILS')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'EMAILS' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Inbox Log ({emails.length})</span>
            </button>
          </div>

          {activeTab === 'IN_APP' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterType === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('Bullish')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterType === 'Bullish' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🟢 Bullish
              </button>
              <button
                onClick={() => setFilterType('Bearish')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterType === 'Bearish' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔴 Bearish
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-semibold">Loading alerts history...</p>
        </div>
      ) : activeTab === 'IN_APP' ? (
        <div className="space-y-6">
          {/* Section: Today */}
          {todayList.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>TODAY</span>
              </h3>
              <div className="space-y-2.5">
                {todayList.map((n) => renderNotificationCard(n, onNavigateToStock))}
              </div>
            </div>
          )}

          {/* Section: Yesterday */}
          {yesterdayList.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>YESTERDAY</span>
              </h3>
              <div className="space-y-2.5">
                {yesterdayList.map((n) => renderNotificationCard(n, onNavigateToStock))}
              </div>
            </div>
          )}

          {/* Section: Older */}
          {olderList.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>OLDER (LAST 30 DAYS)</span>
              </h3>
              <div className="space-y-2.5">
                {olderList.map((n) => renderNotificationCard(n, onNavigateToStock))}
              </div>
            </div>
          )}

          {filteredNotifs.length === 0 && (
            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
              <Bell className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">No Order Block Alerts</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Monitored stocks from your watchlist will generate instant alerts when market price enters identified Order Blocks.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Sent Email Log Viewer */
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Inbox className="w-4 h-4 text-sky-400" />
              <span>Simulated Email Delivery Archive</span>
            </h3>
            <p className="text-xs text-slate-400">
              When email notifications are enabled, the application formats and dispatches institutional HTML alerts. Preview all dispatched emails below.
            </p>
          </div>

          {emails.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Email List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {emails.map((em) => (
                  <div
                    key={em.id}
                    onClick={() => setSelectedEmail(em)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedEmail?.id === em.id
                        ? 'bg-slate-800/90 border-emerald-500/60'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-white">{em.symbol}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(em.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-200 truncate">{em.subject}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">To: {em.to}</p>
                  </div>
                ))}
              </div>

              {/* Email Preview Frame */}
              <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[400px]">
                {selectedEmail ? (
                  <div className="space-y-3">
                    <div className="border-b border-slate-800 pb-3">
                      <h4 className="font-bold text-base text-white">{selectedEmail.subject}</h4>
                      <div className="flex items-center justify-between text-xs text-slate-400 mt-1 font-mono">
                        <span>To: {selectedEmail.to}</span>
                        <span>{new Date(selectedEmail.sentAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div
                      className="p-3 bg-[#0b0f17] rounded-xl border border-slate-800/80 overflow-auto max-h-[460px]"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-16 text-slate-500 text-xs">
                    <Mail className="w-10 h-10 mb-2 opacity-50" />
                    <span>Select an email from the left to view the delivered alert format.</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
              <Mail className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">No Sent Emails Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Trigger a test alert to simulate email notification delivery.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function renderNotificationCard(n: NotificationRecord, onNavigateToStock: (symbol: string) => void) {
  const isBull = n.obType === 'Bullish';
  const curr = n.currencySymbol || '$';

  return (
    <div
      key={n.id}
      onClick={() => onNavigateToStock(n.symbol)}
      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isBull
          ? 'bg-slate-900/70 border-emerald-500/30 hover:border-emerald-500/60 shadow-lg shadow-emerald-950/20'
          : 'bg-slate-900/70 border-rose-500/30 hover:border-rose-500/60 shadow-lg shadow-rose-950/20'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isBull ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          }`}
        >
          {isBull ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
        </span>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-white">{n.symbol}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                isBull
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {n.timeframe === '1D' ? 'DAILY' : 'WEEKLY'} {n.obType.toUpperCase()} OB
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              • {n.stockName}
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-1 font-medium">{n.message}</p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 text-xs">
        <div className="text-left sm:text-right font-mono">
          <span className="text-slate-400 block text-[10px]">OB ZONE</span>
          <span className="text-slate-200 font-semibold">
            {curr}{n.obLow.toFixed(2)} – {curr}{n.obHigh.toFixed(2)}
          </span>
        </div>

        <button className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1">
          <span>Analyze</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
