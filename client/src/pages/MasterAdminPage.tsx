import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Users,
  Bookmark,
  Bell,
  Mail,
  RefreshCw,
  Zap,
  Globe
} from 'lucide-react';

interface MasterAdminPageProps {
  onNavigateToStock: (symbol: string) => void;
}

export const MasterAdminPage: React.FC<MasterAdminPageProps> = ({ onNavigateToStock }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [userList, setUserList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [statsData, scanData, usersData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminGlobalScan(),
        api.getAdminUsers()
      ]);

      setStats(statsData);
      setOpportunities(scanData.opportunities);
      setUserList(usersData.users);
    } catch (err) {
      console.warn('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRefreshScan = async () => {
    try {
      setScanning(true);
      const scanData = await api.getAdminGlobalScan();
      setOpportunities(scanData.opportunities);
    } catch (e) {
      console.warn(e);
    } finally {
      setScanning(false);
    }
  };

  if (!user?.isOwner) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-rose-950/30 border border-rose-800 rounded-2xl p-8">
          <ShieldCheck className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white">Access Denied</h2>
          <p className="text-sm text-rose-300 mt-1">
            Master Account privileges are required to view this administrative console.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Admin Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  MASTER ACCOUNT CONTROL CENTER
                </h1>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  OWNER ACCESS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Full platform governance, global market scanner, and multi-user alert telemetry
              </p>
            </div>
          </div>

          <button
            onClick={loadAdminData}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Stats</span>
          </button>
        </div>

        {/* System Overview Metrics */}
        {stats && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[10px] text-slate-500 font-mono block">REGISTERED USERS</span>
              <span className="text-xl font-mono font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                <Users className="w-4 h-4 text-emerald-400" />
                {stats.stats.totalUsers}
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[10px] text-slate-500 font-mono block">MONITORED WATCHLIST ITEMS</span>
              <span className="text-xl font-mono font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                <Bookmark className="w-4 h-4 text-sky-400" />
                {stats.stats.totalWatchlistItems}
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[10px] text-slate-500 font-mono block">30-DAY ALERTS GENERATED</span>
              <span className="text-xl font-mono font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                <Bell className="w-4 h-4 text-rose-400" />
                {stats.stats.totalAlertsGenerated}
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[10px] text-slate-500 font-mono block">EMAILS DISPATCHED</span>
              <span className="text-xl font-mono font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                <Mail className="w-4 h-4 text-amber-400" />
                {stats.stats.totalEmailsDispatched}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Global Multi-Market Scanner */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-400" />
              <span>GLOBAL MULTI-MARKET ACTIVE ORDER BLOCKS</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live scanner identifying institutional zones across India, USA, Canada, UK, Japan, Germany, and Australia
            </p>
          </div>

          <button
            onClick={handleRefreshScan}
            disabled={scanning}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/30"
          >
            <Zap className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>Scan Global Universe</span>
          </button>
        </div>

        {opportunities.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                <tr>
                  <th className="py-2.5 px-3">STOCK / COUNTRY</th>
                  <th className="py-2.5 px-3">CURRENT PRICE</th>
                  <th className="py-2.5 px-3">TIMEFRAME</th>
                  <th className="py-2.5 px-3">ORDER BLOCK TYPE</th>
                  <th className="py-2.5 px-3">ZONE RANGE</th>
                  <th className="py-2.5 px-3">MARKET STRUCTURE</th>
                  <th className="py-2.5 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {opportunities.map((op, i) => {
                  const isBull = op.obType === 'Bullish';
                  return (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{op.flag}</span>
                          <div>
                            <span className="font-bold text-white block">{op.symbol}</span>
                            <span className="text-[10px] text-slate-400">{op.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-100">
                        {op.currencySymbol}{op.currentPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-300">
                        {op.timeframe === '1D' ? 'DAILY' : 'WEEKLY'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full text-[10px] inline-block ${
                            isBull
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isBull ? '🟢 Bullish OB' : '🔴 Bearish OB'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-200">
                        {op.obZone}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px] truncate max-w-xs">
                        {op.marketStructure}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onNavigateToStock(op.symbol)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 rounded-lg font-bold text-[11px] transition-all"
                        >
                          Chart
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl">
            No active setups found at this exact instant. Click Scan Global Universe to scan all markets.
          </div>
        )}
      </div>

      {/* User Accounts Overview */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-sky-400" />
          <span>REGISTERED TRADER ACCOUNTS</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
              <tr>
                <th className="py-2.5 px-3">USER ID</th>
                <th className="py-2.5 px-3">NAME & EMAIL</th>
                <th className="py-2.5 px-3">ROLE</th>
                <th className="py-2.5 px-3">WATCHLIST STOCKS</th>
                <th className="py-2.5 px-3">TOTAL ALERTS</th>
                <th className="py-2.5 px-3">JOINED DATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {userList.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-mono text-slate-400">#{u.id}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-white block">{u.name}</span>
                    <span className="text-[11px] font-mono text-slate-400">{u.email}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        u.isOwner ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {u.isOwner ? 'MASTER OWNER' : 'TRADER'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-200">
                    {u.watchlistCount} / 30
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-200">
                    {u.notificationsCount}
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
