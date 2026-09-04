import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StockOverview } from '../types';
import {
  Search,
  Globe,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SearchPageProps {
  onNavigateToStock: (symbol: string) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ onNavigateToStock }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [stocks, setStocks] = useState<StockOverview[]>([]);
  const [watchlistSymbols, setWatchlistSymbols] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);

  const sectorFilters = [
    { label: 'All Indian Stocks', code: 'ALL', flag: '🇮🇳' },
    { label: 'Future Growth Potential', code: 'growth', flag: '🔥' },
    { label: 'Nifty 50 Large Cap', code: 'largecap', flag: '💎' },
    { label: 'Mid & Small Cap', code: 'midcap', flag: '🚀' },
    { label: 'Defense & Aerospace', code: 'defense', flag: '🛡️' },
    { label: 'Railway & PSU Titans', code: 'railway', flag: '🚆' },
    { label: 'Power & Green Energy', code: 'power', flag: '⚡' },
    { label: 'Banking & NBFC', code: 'banking', flag: '🏦' },
    { label: 'IT & Software', code: 'it', flag: '💻' },
    { label: 'Auto & EV', code: 'auto', flag: '🚗' },
    { label: 'Pharma & Health', code: 'pharma', flag: '💊' },
    { label: 'FMCG & Retail', code: 'fmcg', flag: '🛒' },
  ];

  const search = async () => {
    setLoading(true);
    try {
      const data = await api.searchStocks(query, selectedCountry);
      setStocks(Array.isArray(data?.results) ? data.results : []);

      if (user) {
        const wl = await api.getWatchlist();
        setWatchlistSymbols(new Set((Array.isArray(wl?.watchlist) ? wl.watchlist : []).map((w) => w.symbol)));
      }
    } catch (e) {
      console.warn('Search error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      search();
    }, 200);
    return () => clearTimeout(timer);
  }, [query, selectedCountry, user]);

  const handleToggleWatchlist = async (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (watchlistSymbols.has(symbol)) {
        await api.removeFromWatchlist(symbol);
        setWatchlistSymbols((prev) => {
          const next = new Set(prev);
          next.delete(symbol);
          return next;
        });
      } else {
        await api.addToWatchlist(symbol);
        setWatchlistSymbols((prev) => new Set(prev).add(symbol));
      }
    } catch (err: any) {
      alert(err.message || 'Could not update watchlist.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Search Input Box */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-emerald-400" />
            <span>INDIAN STOCK EXPLORER (NSE & BSE)</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Search all Indian Large, Mid, Small & Micro-Cap stocks with live institutional Order Blocks in INR (₹).
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search any Indian stock on NSE/BSE (e.g. Suzlon, IRFC, Zomato, Reliance, Tata Motors, HAL, Mazagon Dock)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
          />
        </div>

        {/* Sector & Market Cap Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {sectorFilters.map((c) => (
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

      {/* Search Results Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-semibold">Scanning Indian stock market (NSE / BSE)...</p>
        </div>
      ) : stocks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stocks.map((s) => {
            const isUp = s.change >= 0;
            const inWatchlist = watchlistSymbols.has(s.symbol);

            return (
              <div
                key={s.symbol}
                onClick={() => onNavigateToStock(s.symbol)}
                className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 cursor-pointer transition-all shadow-lg flex flex-col justify-between"
              >
                <div>
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{s.flag}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-base text-white">{s.symbol}</span>
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            {s.exchange}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium line-clamp-1">{s.name}</p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleToggleWatchlist(s.symbol, e)}
                      className={`p-2 rounded-xl transition-all ${
                        inWatchlist
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                      title={inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                    >
                      {inWatchlist ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1">{s.sector} • {s.country}</p>
                </div>

                {/* Bottom Row: Price & Action */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-mono font-extrabold text-white">
                      {s.currencySymbol}{s.currentPrice.toFixed(2)}
                    </span>
                    <span
                      className={`block text-xs font-mono font-bold ${
                        isUp ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isUp ? `+${s.changePercent}%` : `${s.changePercent}%`}
                    </span>
                  </div>

                  <button
                    onClick={() => onNavigateToStock(s.symbol)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 border border-slate-700 hover:border-emerald-500 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <span>Analyze</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
          <Globe className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-white">No Global Stocks Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try searching for a different company name or ticker symbol.
          </p>
        </div>
      )}
    </div>
  );
};
