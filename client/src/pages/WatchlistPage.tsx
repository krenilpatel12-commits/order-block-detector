import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StockOverview, WatchlistStockItem } from '../types';
import {
  Bookmark,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Search,
  X,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

interface WatchlistPageProps {
  onNavigateToStock: (symbol: string) => void;
}

export const WatchlistPage: React.FC<WatchlistPageProps> = ({ onNavigateToStock }) => {
  const [watchlist, setWatchlist] = useState<WatchlistStockItem[]>([]);
  const [watchlistCount, setWatchlistCount] = useState<number>(0);
  const [maxLimit, setMaxLimit] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');

  // Add stock modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [modalSearch, setModalSearch] = useState<string>('');
  const [searchResults, setSearchResults] = useState<StockOverview[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const countries = [
    { label: 'All Stocks', code: 'ALL', flag: '🇮🇳' },
    { label: '🔥 Future Growth', code: 'growth', flag: '🔥' },
    { label: '💎 Nifty 50', code: 'largecap', flag: '💎' },
    { label: '🚀 Mid & Small Cap', code: 'midcap', flag: '🚀' },
    { label: '🛡️ Defense & Aero', code: 'defense', flag: '🛡️' },
    { label: '🚆 Railway & PSU', code: 'railway', flag: '🚆' },
    { label: '🏦 Banking & Finance', code: 'banking', flag: '🏦' },
    { label: '⚡ Power & Energy', code: 'power', flag: '⚡' },
    { label: '💻 IT & Software', code: 'it', flag: '💻' },
    { label: '🚗 Auto & EV', code: 'auto', flag: '🚗' },
  ];

  const loadWatchlist = async () => {
    try {
      setLoading(true);
      const data = await api.getWatchlist();
      setWatchlist(Array.isArray(data?.watchlist) ? data.watchlist : []);
      setWatchlistCount(typeof data?.count === 'number' ? data.count : 0);
      setMaxLimit(typeof data?.maxLimit === 'number' ? data.maxLimit : 30);
    } catch (err) {
      console.warn('Error loading watchlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  // Search inside modal
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (modalSearch.trim().length > 0) {
        setIsSearching(true);
        try {
          const data = await api.searchStocks(modalSearch);
          setSearchResults(data.results);
        } catch (e) {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [modalSearch]);

  const handleAddStock = async (symbol: string) => {
    try {
      await api.addToWatchlist(symbol);
      setIsAddModalOpen(false);
      setModalSearch('');
      await loadWatchlist();
    } catch (err: any) {
      alert(err.message || 'Error adding stock.');
    }
  };

  const handleRemoveStock = async (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.removeFromWatchlist(symbol);
      await loadWatchlist();
    } catch (err: any) {
      alert(err.message || 'Error removing stock.');
    }
  };

  const isLimitReached = watchlistCount >= maxLimit;

  const filteredItems = watchlist.filter((item) => {
    if (selectedCountry === 'ALL') return true;
    return item.country.toLowerCase() === selectedCountry.toLowerCase();
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Watchlist Meter */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Bookmark className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">MY WATCHLIST</h1>
                <p className="text-xs text-slate-400 font-medium">Automatic multi-market monitoring & alerts</p>
              </div>
            </div>
          </div>

          {/* Add Stock Action & 30 Limit Meter */}
          <div className="flex items-center gap-3.5">
            {/* Limit Meter */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-right">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Watchlist Capacity:</span>
                <span className="font-mono font-bold text-sm text-white">
                  {watchlistCount} / {maxLimit} STOCKS
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isLimitReached ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  }`}
                  style={{ width: `${Math.min(100, (watchlistCount / maxLimit) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Add Stock Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={isLimitReached}
              className={`px-4 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all ${
                isLimitReached
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Add Stock</span>
            </button>
          </div>
        </div>

        {/* Limit reached warning alert */}
        {isLimitReached && (
          <div className="mt-4 p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Watchlist limit reached. You can monitor a maximum of 30 stocks.</span>
          </div>
        )}

        {/* Country Filter Chips */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {countries.map((c) => (
            <button
              key={c.code}
              onClick={() => setSelectedCountry(c.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                selectedCountry === c.code
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Watchlist Stock Cards */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-semibold">Loading your monitored watchlist stocks...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isUp = item.changePercent >= 0;
            return (
              <div
                key={item.symbol}
                onClick={() => onNavigateToStock(item.symbol)}
                className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 cursor-pointer transition-all shadow-lg relative group"
              >
                {/* Top Row: Country, Ticker, Exchange & Remove */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{item.flag}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-base text-white">{item.symbol}</span>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {item.exchange}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium line-clamp-1">{item.stockName}</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleRemoveStock(item.symbol, e)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-80 group-hover:opacity-100"
                    title="Remove from watchlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Middle Row: Price & 24h Change */}
                <div className="flex items-center justify-between my-3 pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-500 block">CURRENT PRICE</span>
                    <span className="text-xl font-mono font-extrabold text-white">
                      {item.currencySymbol}{item.currentPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">24H CHANGE</span>
                    <span
                      className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                        isUp ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {isUp ? `+${item.changePercent}%` : `${item.changePercent}%`}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Active Order Block Status Badge */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-[11px]">
                    {item.hasActiveOB ? (
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                          item.activeOBType === 'Bullish'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${item.activeOBType === 'Bullish' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`}></span>
                        <span>ACTIVE {item.activeOBTimeframe} {item.activeOBType?.toUpperCase()} OB</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                        No Active OB Entry
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-semibold text-slate-400 group-hover:text-emerald-400 flex items-center gap-0.5">
                    <span>Chart</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
          <Bookmark className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-white">No Stocks in this Category</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Add global stocks to your watchlist to monitor daily and weekly Bullish and Bearish Order Blocks.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Add Global Stock
          </button>
        </div>
      )}

      {/* Add Stock Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Add Stock to Watchlist</h3>
                <p className="text-xs text-slate-400 font-mono">Current: {watchlistCount} / {maxLimit} stocks</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search symbol or company name (e.g. AAPL, Reliance, Shopify)..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
                autoFocus
              />
            </div>

            {/* Search Results */}
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-800">
              {isSearching ? (
                <div className="py-6 text-center text-xs text-slate-400">Searching global stocks...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((s) => {
                  const isAlreadyIn = watchlist.some((w) => w.symbol === s.symbol);
                  return (
                    <div
                      key={s.symbol}
                      className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-lg"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{s.flag}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white">{s.symbol}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                              {s.exchange}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{s.name}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddStock(s.symbol)}
                        disabled={isAlreadyIn}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isAlreadyIn
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {isAlreadyIn ? 'In Watchlist' : 'Add Stock'}
                      </button>
                    </div>
                  );
                })
              ) : modalSearch.trim() ? (
                <div className="py-6 text-center text-xs text-slate-400">No stocks found.</div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  Type a stock symbol or name to search globally.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
