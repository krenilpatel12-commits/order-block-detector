import React from 'react';
import { OrderBlock } from '../types';
import { TrendingUp, TrendingDown, Target, Activity } from 'lucide-react';

interface OrderBlockCardProps {
  orderBlock: OrderBlock;
  currencySymbol?: string;
  currentPrice: number;
}

export const OrderBlockCard: React.FC<OrderBlockCardProps> = ({
  orderBlock,
  currencySymbol = '$',
  currentPrice,
}) => {
  const isBullish = orderBlock.type === 'Bullish';
  const isActive = orderBlock.status === 'ACTIVE';

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        isActive
          ? isBullish
            ? 'bg-emerald-950/25 border-emerald-500/60 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
            : 'bg-rose-950/25 border-rose-500/60 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/30'
          : isBullish
          ? 'bg-slate-900/60 border-emerald-500/20 hover:border-emerald-500/40'
          : 'bg-slate-900/60 border-rose-500/20 hover:border-rose-500/40'
      }`}
    >
      {/* Header with Type & Status */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isBullish ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {isBullish ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </span>
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>{orderBlock.type} Order Block</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {orderBlock.timeframe === '1D' ? 'DAILY' : 'WEEKLY'}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 font-mono">Ref Candle: {orderBlock.referenceCandleDate}</p>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider ${
            isActive
              ? isBullish
                ? 'bg-emerald-500 text-slate-950 animate-pulse font-extrabold'
                : 'bg-rose-500 text-white animate-pulse font-extrabold'
              : orderBlock.status === 'BELOW'
              ? 'bg-slate-800 text-slate-300 border border-slate-700'
              : orderBlock.status === 'ABOVE'
              ? 'bg-slate-800 text-slate-300 border border-slate-700'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {isActive && <Activity className="w-3 h-3" />}
          {orderBlock.status}
        </span>
      </div>

      {/* Zone Details Grid */}
      <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 mb-3 text-xs">
        <div>
          <span className="text-slate-400 text-[11px]">OB Zone:</span>
          <p className="font-mono font-bold text-slate-100 mt-0.5">
            {currencySymbol}{orderBlock.low.toFixed(2)} – {currencySymbol}{orderBlock.high.toFixed(2)}
          </p>
        </div>
        <div>
          <span className="text-slate-400 text-[11px]">50% Equilibrium:</span>
          <p className="font-mono font-bold text-sky-400 mt-0.5">
            {currencySymbol}{orderBlock.meanThreshold.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Break of Structure (BOS) details */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded-md border border-slate-800">
        <Target className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate">{orderBlock.marketStructureInfo}</span>
      </div>

      {/* Distance feedback */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
        <span>Current Price: {currencySymbol}{currentPrice.toFixed(2)}</span>
        <span className={orderBlock.distancePercent < 0 ? 'text-rose-400' : 'text-emerald-400'}>
          {orderBlock.distancePercent > 0 ? `+${orderBlock.distancePercent}%` : `${orderBlock.distancePercent}%`} from zone
        </span>
      </div>
    </div>
  );
};
