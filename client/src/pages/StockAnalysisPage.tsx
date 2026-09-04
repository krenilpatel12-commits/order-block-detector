import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StockAnalysis, Timeframe } from '../types';
import { InteractiveChart } from '../components/InteractiveChart';
import { OrderBlockCard } from '../components/OrderBlockCard';
import { useAuth } from '../context/AuthContext';
import {
  Bookmark,
  BookmarkCheck,
  TrendingUp,
  TrendingDown,
  Sliders,
  AlertCircle,
  RotateCw,
  Share2
} from 'lucide-react';
import { ShareModal } from '../components/ShareModal';

interface StockAnalysisPageProps {
  symbol: string;
  onBack?: () => void;
}

export const StockAnalysisPage: React.FC<StockAnalysisPageProps> = ({ symbol }) => {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [inWatchlist, setInWatchlist] = useState<boolean>(false);
  const [watchlistCount, setWatchlistCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshingLive, setIsRefreshingLive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [overrideInput, setOverrideInput] = useState<string>('');
  const [isOverriding, setIsOverriding] = useState<boolean>(false);
  const [lastLiveTick, setLastLiveTick] = useState<string>('');
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);

  const fetchAnalysis = async (sym: string, tf: Timeframe, isBackground: boolean = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setIsRefreshingLive(true);
      setErrorMsg(null);

      const data = await api.getStockAnalysis(sym, tf);
      setAnalysis(data);
      setLastLiveTick(new Date().toLocaleTimeString());

      // Check watchlist state
      if (user && !isBackground) {
        const wlCheck = await api.checkWatchlist(sym);
        setInWatchlist(wlCheck.inWatchlist);
        setWatchlistCount(wlCheck.count);
      }
    } catch (err: any) {
      if (!isBackground) {
        setErrorMsg(err.message || 'Failed to load stock analysis.');
      }
    } finally {
      if (!isBackground) setLoading(false);
      setIsRefreshingLive(false);
    }
  };

  useEffect(() => {
    fetchAnalysis(symbol, timeframe, false);

    // Live real-time market data polling every 5 seconds
    const interval = setInterval(() => {
      fetchAnalysis(symbol, timeframe, true);
    }, 5000);

    return () => clearInterval(interval);
  }, [symbol, timeframe, user]);

  const handleToggleWatchlist = async () => {
    if (!analysis) return;
    try {
      if (inWatchlist) {
        const res = await api.removeFromWatchlist(analysis.stock.symbol);
        setInWatchlist(false);
        setWatchlistCount(res.count);
      } else {
        const res = await api.addToWatchlist(analysis.stock.symbol);
        setInWatchlist(true);
        setWatchlistCount(res.count);
      }
    } catch (err: any) {
      alert(err.message || 'Could not update watchlist.');
    }
  };

  const handleApplyPriceOverride = async (priceVal: number | null) => {
    if (!analysis) return;
    try {
      setIsOverriding(true);
      await api.overridePrice(analysis.stock.symbol, priceVal);
      // Reload analysis with new price
      await fetchAnalysis(analysis.stock.symbol, timeframe);
    } catch (err: any) {
      alert(err.message || 'Price simulation error.');
    } finally {
      setIsOverriding(false);
    }
  };

  if (loading && !analysis) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-semibold text-slate-300">Loading {symbol} institutional chart & order blocks...</p>
      </div>
    );
  }

  if (errorMsg || !analysis) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-rose-950/30 border border-rose-800/80 rounded-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Error Loading Stock Analysis</h3>
          <p className="text-sm text-rose-300 mt-1">{errorMsg}</p>
          <button
            onClick={() => fetchAnalysis(symbol, timeframe)}
            className="mt-4 px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const stock = analysis.stock;
  const isUp = stock.change >= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Stock Info */}
          <div className="flex items-start gap-3.5">
            <span className="text-3xl p-1 bg-slate-950 rounded-xl border border-slate-800 shadow-inner">
              {stock.flag}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">{stock.symbol}</h1>
                <span className="bg-slate-800 text-slate-300 text-xs font-mono font-semibold px-2 py-0.5 rounded">
                  {stock.exchange}
                </span>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
                  • {stock.country} ({stock.currency})
                </span>
              </div>
              <p className="text-sm text-slate-400 font-medium">{stock.name}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{stock.sector}</p>
            </div>
          </div>

          {/* Price & Watchlist CTA */}
          <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
            {/* Price Readout & Live Status */}
            <div className="text-left md:text-right space-y-1">
              <div className="flex items-center gap-2 justify-start md:justify-end">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>LIVE MARKET</span>
                </span>
                <button
                  type="button"
                  onClick={() => fetchAnalysis(stock.symbol, timeframe, true)}
                  disabled={isRefreshingLive}
                  className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                  title="Click to force refresh quote"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRefreshingLive ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              </div>

              <div className="text-2xl sm:text-3xl font-mono font-extrabold text-white tracking-tight">
                {stock.currencySymbol}{stock.currentPrice.toFixed(2)}
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold justify-start md:justify-end">
                <span className={isUp ? 'text-emerald-400 flex items-center gap-0.5' : 'text-rose-400 flex items-center gap-0.5'}>
                  {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {isUp ? `+${stock.change.toFixed(2)}` : stock.change.toFixed(2)} ({isUp ? `+${stock.changePercent}%` : `${stock.changePercent}%`})
                </span>
                <span className="text-slate-500 font-normal">Today</span>
              </div>
              {lastLiveTick && (
                <p className="text-[10px] text-slate-500 font-mono">
                  Synced: {lastLiveTick}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Share Setup Button */}
              <button
                type="button"
                onClick={() => setIsShareOpen(true)}
                className="px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-500/40 transition-all shadow-md active:scale-95"
                title={`Share ${stock.symbol} Analysis Setup`}
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Share Setup</span>
              </button>

              {/* Watchlist Toggle Button */}
              <button
                onClick={handleToggleWatchlist}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg ${
                  inWatchlist
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                }`}
              >
                {inWatchlist ? (
                  <>
                    <BookmarkCheck className="w-4 h-4" />
                    <span>In Watchlist ({watchlistCount}/30)</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    <span>Add to Watchlist ({watchlistCount}/30)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Share Modal Dialog */}
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          stockSymbol={stock.symbol}
          title={`${stock.symbol} Order Block Analysis — Order Block Detector`}
          text={`🚨 Check out the institutional Order Block analysis for ${stock.symbol} (${stock.name}) at ₹${stock.currentPrice.toFixed(2)} on Order Block Detector!`}
        />

        {/* 24h Range Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-400 font-mono">
          <div>
            <span className="text-slate-500 block text-[10px]">PREV CLOSE</span>
            <span className="text-slate-200 font-bold">{stock.currencySymbol}{stock.previousClose.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">24H HIGH</span>
            <span className="text-emerald-400 font-bold">{stock.currencySymbol}{stock.high24h.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">24H LOW</span>
            <span className="text-rose-400 font-bold">{stock.currencySymbol}{stock.low24h.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">24H VOLUME</span>
            <span className="text-slate-200 font-bold">{(stock.volume24h / 1000).toFixed(1)}K</span>
          </div>
        </div>
      </div>

      {/* Timeframe Switcher & Chart Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setTimeframe('1D')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                timeframe === '1D'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              DAILY (1D)
            </button>
            <button
              onClick={() => setTimeframe('1W')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                timeframe === '1W'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              WEEKLY (1W)
            </button>
          </div>

          <div className="flex items-center gap-2">
            {analysis.isInBullishOB && (
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                ACTIVE IN BULLISH OB
              </span>
            )}
            {analysis.isInBearishOB && (
              <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[11px] font-bold px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                ACTIVE IN BEARISH OB
              </span>
            )}
          </div>
        </div>

        {/* Candlestick & Order Block Chart */}
        <InteractiveChart
          candles={analysis.candles}
          bullishOrderBlocks={analysis.bullishOrderBlocks}
          bearishOrderBlocks={analysis.bearishOrderBlocks}
          timeframe={timeframe}
          currencySymbol={stock.currencySymbol}
          currentPrice={stock.currentPrice}
        />
      </div>

      {/* Interactive Price Test / Alert Simulator Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4.5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h4 className="font-bold text-xs sm:text-sm text-white">Live Price & Alert Simulator</h4>
            <span className="text-[10px] text-slate-400">(Test Order Block Entry Alerts)</span>
          </div>
          <button
            onClick={() => handleApplyPriceOverride(null)}
            className="text-xs text-slate-400 hover:text-slate-200 underline"
          >
            Reset to Market Price
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Zone Entry Jump Buttons */}
          {analysis.bullishOrderBlocks[0] && (
            <button
              onClick={() => handleApplyPriceOverride(analysis.bullishOrderBlocks[0].meanThreshold)}
              disabled={isOverriding}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Jump into Bullish OB ({stock.currencySymbol}{analysis.bullishOrderBlocks[0].meanThreshold.toFixed(2)})</span>
            </button>
          )}

          {analysis.bearishOrderBlocks[0] && (
            <button
              onClick={() => handleApplyPriceOverride(analysis.bearishOrderBlocks[0].meanThreshold)}
              disabled={isOverriding}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Jump into Bearish OB ({stock.currencySymbol}{analysis.bearishOrderBlocks[0].meanThreshold.toFixed(2)})</span>
            </button>
          )}

          {/* Custom price input */}
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="number"
              placeholder={`Price (${stock.currencySymbol})`}
              value={overrideInput}
              onChange={(e) => setOverrideInput(e.target.value)}
              className="w-28 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={() => {
                const val = parseFloat(overrideInput);
                if (!isNaN(val)) handleApplyPriceOverride(val);
              }}
              disabled={isOverriding || !overrideInput}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Set Price
            </button>
          </div>
        </div>
      </div>

      {/* Bullish & Bearish Order Blocks Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 🟢 Bullish Order Blocks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-emerald-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>{timeframe === '1D' ? 'Daily' : 'Weekly'} Bullish Order Blocks</span>
            </h3>
            <span className="text-xs font-mono font-bold text-slate-400">
              {analysis.bullishOrderBlocks.length} Detected
            </span>
          </div>

          {analysis.bullishOrderBlocks.length > 0 ? (
            <div className="space-y-3">
              {analysis.bullishOrderBlocks.map((ob) => (
                <OrderBlockCard
                  key={ob.id}
                  orderBlock={ob}
                  currencySymbol={stock.currencySymbol}
                  currentPrice={stock.currentPrice}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
              No Bullish Order Blocks identified on this timeframe.
            </div>
          )}
        </div>

        {/* 🔴 Bearish Order Blocks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-rose-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>{timeframe === '1D' ? 'Daily' : 'Weekly'} Bearish Order Blocks</span>
            </h3>
            <span className="text-xs font-mono font-bold text-slate-400">
              {analysis.bearishOrderBlocks.length} Detected
            </span>
          </div>

          {analysis.bearishOrderBlocks.length > 0 ? (
            <div className="space-y-3">
              {analysis.bearishOrderBlocks.map((ob) => (
                <OrderBlockCard
                  key={ob.id}
                  orderBlock={ob}
                  currencySymbol={stock.currencySymbol}
                  currentPrice={stock.currentPrice}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
              No Bearish Order Blocks identified on this timeframe.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
