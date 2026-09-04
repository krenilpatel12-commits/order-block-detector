import React, { useRef, useEffect, useState } from 'react';
import { Candle, OrderBlock, Timeframe } from '../types';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface InteractiveChartProps {
  candles: Candle[];
  bullishOrderBlocks: OrderBlock[];
  bearishOrderBlocks: OrderBlock[];
  timeframe: Timeframe;
  currencySymbol?: string;
  currentPrice: number;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  candles,
  bullishOrderBlocks,
  bearishOrderBlocks,
  timeframe,
  currencySymbol = '$',
  currentPrice,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [visibleCount, setVisibleCount] = useState<number>(45);
  const [offsetIndex, setOffsetIndex] = useState<number>(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);

  // Reset view when timeframe or stock changes
  useEffect(() => {
    setVisibleCount(Math.min(45, candles.length));
    setOffsetIndex(0);
    setHoverIndex(null);
  }, [candles, timeframe]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, height);

    const paddingRight = 65;
    const paddingBottom = 28;
    const chartWidth = width - paddingRight;
    const chartHeight = height - paddingBottom;
    const volumeHeight = chartHeight * 0.18;
    const candleChartHeight = chartHeight - volumeHeight;

    // Slice visible slice of candles
    const total = candles.length;
    const count = Math.min(visibleCount, total);
    const startIndex = Math.max(0, total - count - offsetIndex);
    const endIndex = Math.min(total, startIndex + count);
    const visibleCandles = candles.slice(startIndex, endIndex);

    if (visibleCandles.length === 0) return;

    // Calculate High / Low price ranges
    let minPrice = Math.min(...visibleCandles.map((c) => c.low));
    let maxPrice = Math.max(...visibleCandles.map((c) => c.high));

    // Also factor in Order Block high/lows so they fit comfortably
    for (const ob of [...bullishOrderBlocks, ...bearishOrderBlocks]) {
      if (ob.status !== 'INVALID') {
        minPrice = Math.min(minPrice, ob.low);
        maxPrice = Math.max(maxPrice, ob.high);
      }
    }

    const pricePadding = (maxPrice - minPrice) * 0.08 || 1;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    const priceRange = maxPrice - minPrice;

    // Max Volume for scale
    const maxVolume = Math.max(...visibleCandles.map((c) => c.volume), 1);

    const priceToY = (price: number) => {
      return candleChartHeight - ((price - minPrice) / priceRange) * candleChartHeight;
    };

    const yToPrice = (y: number) => {
      return maxPrice - (y / candleChartHeight) * priceRange;
    };

    const candleWidth = Math.max(2, (chartWidth / visibleCandles.length) * 0.7);
    const candleSpacing = chartWidth / visibleCandles.length;

    // 1. Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    // Horizontal Price Grids (5 levels)
    const priceSteps = 5;
    for (let i = 0; i <= priceSteps; i++) {
      const p = minPrice + (priceRange / priceSteps) * i;
      const y = priceToY(p);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price text label on right margin
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${currencySymbol}${p.toFixed(2)}`, chartWidth + 6, y + 3);
    }

    // 2. Draw Order Block Zones
    // Bullish Order Blocks (🟢 Shaded Green)
    for (const ob of bullishOrderBlocks) {
      if (ob.status === 'INVALID') continue;

      const yHigh = priceToY(ob.high);
      const yLow = priceToY(ob.low);
      const zoneH = Math.max(2, yLow - yHigh);
      const yMean = priceToY(ob.meanThreshold);

      // Gradient zone background
      const obGrad = ctx.createLinearGradient(0, yHigh, 0, yLow);
      obGrad.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
      obGrad.addColorStop(1, 'rgba(16, 185, 129, 0.08)');

      ctx.fillStyle = obGrad;
      ctx.fillRect(0, yHigh, chartWidth, zoneH);

      // Border outline
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(0, yHigh, chartWidth, zoneH);

      // Mean Threshold Dotted Line (50% Equilibrium)
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
      ctx.beginPath();
      ctx.moveTo(0, yMean);
      ctx.lineTo(chartWidth, yMean);
      ctx.stroke();
      ctx.restore();

      // Zone Label
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`🟢 BULLISH OB [${currencySymbol}${ob.low.toFixed(1)} – ${currencySymbol}${ob.high.toFixed(1)}]`, 8, yHigh + 12);
    }

    // Bearish Order Blocks (🔴 Shaded Red)
    for (const ob of bearishOrderBlocks) {
      if (ob.status === 'INVALID') continue;

      const yHigh = priceToY(ob.high);
      const yLow = priceToY(ob.low);
      const zoneH = Math.max(2, yLow - yHigh);
      const yMean = priceToY(ob.meanThreshold);

      // Gradient zone background
      const obGrad = ctx.createLinearGradient(0, yHigh, 0, yLow);
      obGrad.addColorStop(0, 'rgba(239, 68, 68, 0.22)');
      obGrad.addColorStop(1, 'rgba(239, 68, 68, 0.08)');

      ctx.fillStyle = obGrad;
      ctx.fillRect(0, yHigh, chartWidth, zoneH);

      // Border outline
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(0, yHigh, chartWidth, zoneH);

      // Mean Threshold Dotted Line (50% Equilibrium)
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.beginPath();
      ctx.moveTo(0, yMean);
      ctx.lineTo(chartWidth, yMean);
      ctx.stroke();
      ctx.restore();

      // Zone Label
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`🔴 BEARISH OB [${currencySymbol}${ob.low.toFixed(1)} – ${currencySymbol}${ob.high.toFixed(1)}]`, 8, yHigh + 12);
    }

    // 3. Draw Volume Histogram
    for (let i = 0; i < visibleCandles.length; i++) {
      const c = visibleCandles[i];
      const x = i * candleSpacing + candleSpacing / 2;
      const vHeight = (c.volume / maxVolume) * volumeHeight;
      const vY = chartHeight - vHeight;
      const isGreen = c.close >= c.open;

      ctx.fillStyle = isGreen ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)';
      ctx.fillRect(x - candleWidth / 2, vY, candleWidth, vHeight);
    }

    // 4. Draw Candlesticks & Wicks
    for (let i = 0; i < visibleCandles.length; i++) {
      const c = visibleCandles[i];
      const x = i * candleSpacing + candleSpacing / 2;
      const yOpen = priceToY(c.open);
      const yClose = priceToY(c.close);
      const yHigh = priceToY(c.high);
      const yLow = priceToY(c.low);
      const isGreen = c.close >= c.open;

      const bodyColor = isGreen ? '#10b981' : '#ef4444';
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));

      // Draw Wick Line
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Draw Candle Body
      ctx.fillStyle = bodyColor;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      // Date ticks on bottom axis every few candles
      if (i % Math.ceil(visibleCandles.length / 5) === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        const formattedDate = c.time.slice(5); // MM-DD
        ctx.fillText(formattedDate, x, height - 8);
      }
    }

    // 5. Current Price Line
    const currentPriceY = priceToY(currentPrice);
    if (currentPriceY >= 0 && currentPriceY <= candleChartHeight) {
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, currentPriceY);
      ctx.lineTo(chartWidth, currentPriceY);
      ctx.stroke();

      // Current Price Badge on Right
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(chartWidth + 2, currentPriceY - 8, paddingRight - 4, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${currencySymbol}${currentPrice.toFixed(2)}`, chartWidth + 5, currentPriceY + 3);
      ctx.restore();
    }

    // 6. Interactive Hover Crosshairs & Tooltip
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < visibleCandles.length) {
      const hCandle = visibleCandles[hoverIndex];
      const hX = hoverIndex * candleSpacing + candleSpacing / 2;
      const hY = hoverY !== null ? Math.min(candleChartHeight, Math.max(0, hoverY)) : priceToY(hCandle.close);
      const hPrice = yToPrice(hY);

      // Draw crosshairs
      ctx.save();
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;

      // Vertical Line
      ctx.beginPath();
      ctx.moveTo(hX, 0);
      ctx.lineTo(hX, chartHeight);
      ctx.stroke();

      // Horizontal Line
      ctx.beginPath();
      ctx.moveTo(0, hY);
      ctx.lineTo(chartWidth, hY);
      ctx.stroke();
      ctx.restore();

      // Bottom date tag
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(hX - 35, chartHeight + 2, 70, 16);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(hX - 35, chartHeight + 2, 70, 16);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hCandle.time, hX, chartHeight + 13);

      // Right price tag
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(chartWidth + 2, hY - 8, paddingRight - 4, 16);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(chartWidth + 2, hY - 8, paddingRight - 4, 16);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${currencySymbol}${hPrice.toFixed(2)}`, chartWidth + 5, hY + 3);
    }
  }, [candles, bullishOrderBlocks, bearishOrderBlocks, visibleCount, offsetIndex, hoverIndex, hoverY, currentPrice, currencySymbol]);

  // Handle Mouse/Touch Interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const paddingRight = 65;
    const chartWidth = canvas.clientWidth - paddingRight;

    if (x >= 0 && x <= chartWidth) {
      const total = candles.length;
      const count = Math.min(visibleCount, total);
      const candleSpacing = chartWidth / count;
      const idx = Math.floor(x / candleSpacing);
      setHoverIndex(Math.max(0, Math.min(count - 1, idx)));
      setHoverY(y);
    } else {
      setHoverIndex(null);
      setHoverY(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setHoverY(null);
  };

  // Zoom Controls
  const handleZoomIn = () => {
    setVisibleCount((prev) => Math.max(15, prev - 8));
  };

  const handleZoomOut = () => {
    setVisibleCount((prev) => Math.min(candles.length, prev + 10));
  };

  const handleReset = () => {
    setVisibleCount(Math.min(45, candles.length));
    setOffsetIndex(0);
  };

  // Active Candle for top readout
  const total = candles.length;
  const count = Math.min(visibleCount, total);
  const startIndex = Math.max(0, total - count - offsetIndex);
  const visibleCandles = candles.slice(startIndex, startIndex + count);
  const activeCandle =
    hoverIndex !== null && hoverIndex < visibleCandles.length
      ? visibleCandles[hoverIndex]
      : visibleCandles[visibleCandles.length - 1];

  const isGreen = activeCandle ? activeCandle.close >= activeCandle.open : true;

  return (
    <div ref={containerRef} className="relative w-full bg-[#0b0f19] rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
      {/* Top Chart Stats Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/80 text-xs">
        {activeCandle && (
          <div className="flex flex-wrap items-center gap-3 font-mono">
            <span className="text-slate-400 font-sans font-semibold text-[11px]">{activeCandle.time}</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">O: <span className="text-slate-200">{currencySymbol}{activeCandle.open.toFixed(2)}</span></span>
              <span className="text-slate-400">H: <span className="text-emerald-400">{currencySymbol}{activeCandle.high.toFixed(2)}</span></span>
              <span className="text-slate-400">L: <span className="text-rose-400">{currencySymbol}{activeCandle.low.toFixed(2)}</span></span>
              <span className="text-slate-400">C: <span className={isGreen ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{currencySymbol}{activeCandle.close.toFixed(2)}</span></span>
              <span className="text-slate-400 hidden sm:inline">Vol: <span className="text-slate-300">{(activeCandle.volume / 1000).toFixed(1)}K</span></span>
            </div>
          </div>
        )}

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomIn}
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-[320px] sm:h-[400px] cursor-crosshair block"
      />

      {/* Legend Badge */}
      <div className="absolute bottom-9 left-3 flex items-center gap-2 pointer-events-none bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-mono">
        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
          <span className="w-2 h-2 rounded bg-emerald-500 inline-block"></span>
          Bullish OB
        </span>
        <span className="text-slate-600">|</span>
        <span className="flex items-center gap-1 text-rose-400 font-semibold">
          <span className="w-2 h-2 rounded bg-rose-500 inline-block"></span>
          Bearish OB
        </span>
      </div>
    </div>
  );
};
