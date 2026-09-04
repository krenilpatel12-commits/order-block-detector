import React from 'react';
import { useAuth } from '../context/AuthContext';
import { X, ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';

export const AlertToastContainer: React.FC<{ onNavigateToStock: (symbol: string) => void }> = ({ onNavigateToStock }) => {
  const { toasts, removeToast } = useAuth();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => {
        const isBullish = t.obType === 'Bullish';
        const curr = t.currencySymbol || '$';

        return (
          <div
            key={t.toastId}
            className={`pointer-events-auto p-4 rounded-xl border shadow-2xl backdrop-blur-xl transition-all duration-300 transform translate-y-0 ${
              isBullish
                ? 'bg-slate-900/95 border-emerald-500/50 shadow-emerald-950/50'
                : 'bg-slate-900/95 border-rose-500/50 shadow-rose-950/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                    isBullish ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {isBullish ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-sm tracking-wide">{t.symbol}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isBullish
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {t.timeframe === '1D' ? 'DAILY' : 'WEEKLY'} {t.obType.toUpperCase()} OB
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium line-clamp-1">{t.stockName}</p>
                </div>
              </div>

              <button
                onClick={() => removeToast(t.toastId)}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                aria-label="Close alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Zone: </span>
                <span className="font-mono font-semibold text-slate-200">
                  {curr}{t.obLow.toFixed(2)} – {curr}{t.obHigh.toFixed(2)}
                </span>
              </div>
              <div className="font-mono font-bold text-sky-400">
                {curr}{t.currentPrice.toFixed(2)}
              </div>
            </div>

            <button
              onClick={() => {
                onNavigateToStock(t.symbol);
                removeToast(t.toastId);
              }}
              className={`mt-2.5 w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                isBullish
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              <span>Analyze Chart</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
