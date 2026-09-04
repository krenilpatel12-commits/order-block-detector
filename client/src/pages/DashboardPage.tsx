import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { StockOverview, WatchlistStockItem, NotificationRecord } from '../types';
import {
  Search,
  Bookmark,
  Bell,
  Zap,
  Activity,
  Layers,
  ChevronRight,
  X,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface DashboardPageProps {
  onNavigateToStock: (symbol: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateToStock, onNavigateToTab }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockOverview[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchlistStockItem[]>([]);
  const [watchlistCount, setWatchlistCount] = useState<number>(0);
  const [recentAlerts, setRecentAlerts] = useState<NotificationRecord[]>([]);
  const [activeSetups, setActiveSetups] = useState<any[]>([]);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Indian Market Indices for live ticker
  const globalIndices = [
    { symbol: 'NIFTY 50', country: 'NSE', flag: '🇮🇳', price: '₹23,950.00', change: '+0.45%', isUp: true },
    { symbol: 'BANK NIFTY', country: 'NSE', flag: '🇮🇳', price: '₹51,200.00', change: '+0.62%', isUp: true },
    { symbol: 'SENSEX', country: 'BSE', flag: '🇮🇳', price: '₹78,500.00', change: '+0.38%', isUp: true },
    { symbol: 'FIN NIFTY', country: 'NSE', flag: '🇮🇳', price: '₹23,800.00', change: '+0.25%', isUp: true },
    { symbol: 'MIDCAP NIFTY', country: 'NSE', flag: '🇮🇳', price: '₹12,400.00', change: '+0.85%', isUp: true },
    { symbol: 'INDIA VIX', country: 'NSE', flag: '🇮🇳', price: '14.20', change: '-1.40%', isUp: false }
  ];

  const loadDashboardData = async () => {
    try {
      // 1. Fetch Watchlist
      const wlData = await api.getWatchlist();
      setWatchlist(Array.isArray(wlData?.watchlist) ? wlData.watchlist : []);
      setWatchlistCount(typeof wlData?.count === 'number' ? wlData.count : 0);

      // 2. Fetch Notifications
      const notifData = await api.getNotifications();
      setRecentAlerts(Array.isArray(notifData?.notifications) ? notifData.notifications.slice(0, 5) : []);

      // 3. Scan for active setups across popular Indian market leaders
      const popular = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'SUZLON', 'IRFC', 'HAL', 'TATAPOWER'];
      const setups: any[] = [];

      for (const sym of popular) {
        try {
          const analysis = await api.getStockAnalysis(sym, '1D');
          if (analysis && Array.isArray(analysis.activeOrderBlocks) && analysis.activeOrderBlocks.length > 0) {
            for (const ob of analysis.activeOrderBlocks) {
              setups.push({
                stock: analysis.stock,
                orderBlock: ob,
                timeframe: '1D'
              });
            }
          }
        } catch (e) {
          // ignore per stock scan errors
        }
      }
      setActiveSetups(setups.slice(0, 6));
    } catch (err) {
      console.warn('Dashboard load error:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handle Search Input
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setIsSearching(true);
        setIsDropdownOpen(true);
        try {
          const data = await api.searchStocks(searchQuery);
          setSearchResults(data.results.slice(0, 8));
        } catch (e) {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setIsDropdownOpen(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectStock = (symbol: string) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    onNavigateToStock(symbol);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-7">
      {/* Hero Welcome & Search Banner */}
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-[#0f172a] to-[#090d16] border border-slate-800 p-6 sm:p-8 shadow-2xl">
        {/* Background Glows (isolated in overflow-hidden container so dropdown is never clipped) */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>🇮🇳 INSTITUTIONAL ORDER BLOCK ENGINE • 100% FREE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Indian Stock Market <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">
              Bullish & Bearish Order Block Detector
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-medium">
            Search and monitor all 5,000+ Indian stocks across NSE (Large, Mid, Small, SME) and BSE. Detect institutional supply & demand Order Blocks automatically in INR (₹).
          </p>

          {/* Quick Search Bar with Floating Autocomplete */}
          <div ref={searchContainerRef} className="mt-5 relative z-30">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Indian stocks (e.g. Reliance, Suzlon, C2C, IRFC, HAL, Tata Motors)..."
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim().length > 0) setIsDropdownOpen(true);
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-slate-950/90 border border-slate-700/80 focus:border-emerald-500 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-inner transition-all font-medium"
              />
              {searchQuery.length > 0 && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsDropdownOpen(false);
                  }}
                  className="absolute right-3.5 p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Autocomplete Results Floating Dropdown */}
            {isDropdownOpen && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#0d131f] border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-800/80 backdrop-blur-2xl ring-1 ring-white/10 max-h-80 overflow-y-auto">
                {isSearching ? (
                  <div className="p-5 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Searching Indian stocks...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((s) => {
                    const isUp = s.change >= 0;
                    return (
                      <div
                        key={s.symbol}
                        onClick={() => handleSelectStock(s.symbol)}
                        className="p-3.5 hover:bg-slate-800/90 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl p-1 bg-slate-950 rounded-lg border border-slate-800">{s.flag}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-white group-hover:text-emerald-400 transition-colors">
                                {s.symbol}
                              </span>
                              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                {s.exchange}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-1 font-medium">{s.name}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-sm text-slate-100 block">
                            {s.currencySymbol}{s.currentPrice.toFixed(2)}
                          </span>
                          <span
                            className={`text-xs font-mono font-semibold flex items-center justify-end gap-0.5 ${
                              isUp ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isUp ? `+${s.changePercent}%` : `${s.changePercent}%`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No matching Indian stocks found for "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Market Indices Ticker Bar */}
      <div className="overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-3 min-w-max">
          {globalIndices.map((idx) => (
            <div
              key={idx.symbol}
              className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800/80 px-3.5 py-2 rounded-xl text-xs shadow-md"
            >
              <span className="text-base">{idx.flag}</span>
              <div>
                <span className="font-bold text-slate-200">{idx.symbol}</span>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-slate-400">{idx.price}</span>
                  <span className={idx.isUp ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {idx.change}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Watchlist on Left, Alerts & Opportunities on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Watchlist & Active Setups */}
        <div className="lg:col-span-2 space-y-6">
          {/* Watchlist Section */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white tracking-tight">MY WATCHLIST</h3>
                  <p className="text-xs text-slate-400 font-medium">Automatic NSE & BSE Order Block monitoring</p>
                </div>
              </div>

              {/* Live Watchlist Count Badge */}
              <div className="flex items-center gap-2">
                <span className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-bold px-2.5 py-1 rounded-lg">
                  {watchlistCount} / 30 STOCKS
                </span>
                <button
                  onClick={() => onNavigateToTab('watchlist')}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                >
                  <span>View All</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Watchlist Items Grid */}
            {watchlist.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {watchlist.slice(0, 6).map((item) => (
                  <div
                    key={item.symbol}
                    onClick={() => onNavigateToStock(item.symbol)}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{item.flag}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white">{item.symbol}</span>
                          <span className="text-[10px] font-mono px-1 rounded bg-slate-800 text-slate-400">
                            {item.exchange}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate max-w-[120px]">{item.stockName}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-slate-100">
                        {item.currencySymbol}{item.currentPrice.toFixed(2)}
                      </span>
                      {/* Active OB Badge */}
                      <div className="mt-0.5">
                        {item.hasActiveOB ? (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full inline-block ${
                              item.activeOBType === 'Bullish'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {item.activeOBType === 'Bullish' ? '🟢 Bullish OB' : '🔴 Bearish OB'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-medium">No Active OB</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
                <Bookmark className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">Your watchlist is empty</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Search Indian stocks and add up to 30 stocks to monitor Bullish and Bearish Order Blocks in INR (₹).
                </p>
                <button
                  onClick={() => onNavigateToTab('search')}
                  className="mt-3 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Explore Stocks
                </button>
              </div>
            )}
          </div>

          {/* Active Opportunities (Price Inside Order Block) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white tracking-tight">ACTIVE ORDER BLOCKS NOW</h3>
                  <p className="text-xs text-slate-400 font-medium">Stocks currently inside institutional zones</p>
                </div>
              </div>
            </div>

            {activeSetups.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeSetups.map((item, idx) => {
                  const isBull = item.orderBlock.type === 'Bullish';
                  return (
                    <div
                      key={idx}
                      onClick={() => onNavigateToStock(item.stock.symbol)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isBull
                          ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/70'
                          : 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{item.stock.flag}</span>
                          <span className="font-bold text-sm text-white">{item.stock.symbol}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isBull ? 'bg-emerald-500 text-slate-950 font-extrabold' : 'bg-rose-500 text-white font-extrabold'
                          }`}
                        >
                          {isBull ? '🟢 BULLISH OB' : '🔴 BEARISH OB'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-800/80">
                        <span className="text-slate-400">Zone:</span>
                        <span className="font-mono font-bold text-slate-200">
                          {item.stock.currencySymbol}{item.orderBlock.low.toFixed(2)} – {item.stock.currencySymbol}{item.orderBlock.high.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-slate-400">Current Price:</span>
                        <span className="font-mono font-bold text-sky-400">
                          {item.stock.currencySymbol}{item.stock.currentPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl">
                Scanning global universe for live active order block entries...
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Alerts Stream & Method Info */}
        <div className="space-y-6">
          {/* Recent Alerts Feed */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white tracking-tight">RECENT ALERTS</h3>
                  <p className="text-xs text-slate-400 font-medium">30-day retention history</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('notifications')}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
              >
                <span>History</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {recentAlerts.length > 0 ? (
              <div className="space-y-2.5">
                {recentAlerts.map((notif) => {
                  const isBull = notif.obType === 'Bullish';
                  return (
                    <div
                      key={notif.id}
                      onClick={() => onNavigateToStock(notif.symbol)}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white">{notif.symbol}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              isBull ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {notif.timeframe} {notif.obType}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-1">{notif.message}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-xl">
                No recent alerts. Monitored watchlist stocks will generate alerts when entering OB zones.
              </div>
            )}
          </div>

          {/* Quick Info: Smart Order Block Methodology */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 text-xs text-slate-400 space-y-3">
            <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Institutional Order Blocks</span>
            </h4>
            <p>
              Order Blocks mark the price zones where institutional traders and market makers accumulated large volume before a significant Break of Structure (BOS).
            </p>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span><strong>Bullish OB:</strong> Last down-candle before structural displacement upward.</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span><strong>Bearish OB:</strong> Last up-candle before structural displacement downward.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
