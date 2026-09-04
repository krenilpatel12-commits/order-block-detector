import { Candle, StockOverview, Timeframe } from '../types/index.js';
import { aggregateToWeekly } from './orderBlockDetector.js';

export const YAHOO_TICKER_MAP: Record<string, string> = {
  // Benchmark & Sectoral Indices
  'NIFTY50': '^NSEI',
  'NIFTY': '^NSEI',
  'SENSEX': '^BSESN',
  'BANKNIFTY': '^NSEBANK',
  'FINNIFTY': 'NIFTY_FIN_SERVICE.NS',
  'MIDCPNIFTY': 'NIFTY_MID_SELECT.NS',
  'INDIAVIX': '^INDIAVIX',

  // Special tickers & SME equities
  'C2C': 'C2C-SM.NS',
  'APSISAERO': 'APSISAERO-SM.NS',
  'CFF': 'CFF.BO',
  'ZOMATO': 'ZOMATO.BO',
  'M&M': 'M&M.NS',
  'BAJAJ-AUTO': 'BAJAJ-AUTO.NS',
  'MCDOWELL-N': 'MCDOWELL-N.NS'
};

export function getCurrencySymbol(curr?: string): string {
  return '₹';
}

interface CacheEntry {
  candles: Candle[];
  lastFetched: number;
  livePrice?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  currency?: string;
  currencySymbol?: string;
  longName?: string;
  exchangeName?: string;
}

const liveCandleCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 1000; // 5 seconds ultra-fast live cache

export function getYahooTicker(symbol: string): string {
  const sym = symbol.toUpperCase().trim();
  if (YAHOO_TICKER_MAP[sym]) return YAHOO_TICKER_MAP[sym];

  // If already specified with exchange suffix (.NS or .BO), return as is
  if (sym.includes('.') || sym.startsWith('^')) {
    return sym;
  }

  // Default every Indian stock to National Stock Exchange of India (.NS)
  return `${sym}.NS`;
}

/**
 * Fetch 100% Real Live Market Candles from Yahoo Finance API
 */
export async function fetchLiveYahooCandles(symbol: string, forceRefresh: boolean = false): Promise<Candle[]> {
  const sym = symbol.toUpperCase().trim();
  const cached = liveCandleCache.get(sym);
  const now = Date.now();

  if (!forceRefresh && cached && (now - cached.lastFetched < CACHE_TTL_MS) && cached.candles.length > 0) {
    return cached.candles;
  }

  const primaryTicker = getYahooTicker(sym);
  // Candidates to try: primary ticker, then -SM.NS (SME), .BO (BSE), -ST.NS
  const candidates = [primaryTicker];
  if (!sym.includes('.') && !sym.startsWith('^')) {
    if (!candidates.includes(`${sym}-SM.NS`)) candidates.push(`${sym}-SM.NS`);
    if (!candidates.includes(`${sym}.BO`)) candidates.push(`${sym}.BO`);
    if (!candidates.includes(`${sym}-ST.NS`)) candidates.push(`${sym}-ST.NS`);
  }

  let lastErr: any = null;

  for (const ticker of candidates) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1y&interval=1d&includePrePost=false`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        continue;
      }

      const data: any = await res.json();
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        continue;
      }

      const result = data.chart.result[0];
      const meta = result.meta;
      const timestamps: number[] = result.timestamp || [];
      const quote = result.indicators?.quote?.[0];

      if (!quote || timestamps.length === 0) {
        continue;
      }

      const candles: Candle[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        const open = quote.open?.[i];
        const high = quote.high?.[i];
        const low = quote.low?.[i];
        const close = quote.close?.[i];
        const volume = quote.volume?.[i] || 0;

        // Filter out null or NaN values that occur on non-trading days
        if (
          open === null || open === undefined || isNaN(open) ||
          high === null || high === undefined || isNaN(high) ||
          low === null || low === undefined || isNaN(low) ||
          close === null || close === undefined || isNaN(close)
        ) {
          continue;
        }

        const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];

        candles.push({
          time: dateStr,
          timestamp: timestamps[i] * 1000,
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume: Math.round(volume)
        });
      }

      if (candles.length === 0) {
        continue;
      }

      // If we found a working ticker that wasn't the default, save it in the ticker map
      if (ticker !== primaryTicker) {
        YAHOO_TICKER_MAP[sym] = ticker;
      }

      const lastCandle = candles[candles.length - 1];
      const prevCandle = candles.length > 1 ? candles[candles.length - 2] : lastCandle;
      const livePrice = Number((meta.regularMarketPrice ?? lastCandle.close).toFixed(2));
      
      // Sync live traded price directly into current candle
      lastCandle.close = livePrice;
      if (meta.regularMarketDayHigh != null) lastCandle.high = Math.max(lastCandle.high, meta.regularMarketDayHigh, livePrice);
      if (meta.regularMarketDayLow != null) lastCandle.low = Math.min(lastCandle.low, meta.regularMarketDayLow, livePrice);
      if (meta.regularMarketVolume != null) lastCandle.volume = meta.regularMarketVolume;

      // Yesterday's actual closing price from previous session candle
      const previousClose = Number((meta.chartPreviousClose ?? prevCandle.close).toFixed(2));
      const change = meta.regularMarketChange != null
        ? Number(meta.regularMarketChange.toFixed(2))
        : Number((livePrice - previousClose).toFixed(2));
      const changePercent = meta.regularMarketChangePercent != null
        ? Number(meta.regularMarketChangePercent.toFixed(2))
        : Number(((change / previousClose) * 100).toFixed(2));

      const high24h = Number((meta.regularMarketDayHigh ?? lastCandle.high).toFixed(2));
      const low24h = Number((meta.regularMarketDayLow ?? lastCandle.low).toFixed(2));
      const volume24h = meta.regularMarketVolume ?? lastCandle.volume;
      const currency = meta.currency || (sym.endsWith('.NS') || sym.endsWith('.BO') ? 'INR' : 'USD');
      const currencySymbol = getCurrencySymbol(currency);
      const longName = meta.longName || meta.shortName;
      const exchangeName = meta.fullExchangeName || meta.exchangeName || (currency === 'INR' ? 'NSE' : 'GLOBAL');

      liveCandleCache.set(sym, {
        candles,
        lastFetched: now,
        livePrice,
        previousClose,
        change,
        changePercent,
        high24h,
        low24h,
        volume24h,
        currency,
        currencySymbol,
        longName,
        exchangeName
      });

      console.log(`📡 [YahooFinance] Live data synced for ${sym} (${ticker}) -> Price: ${currencySymbol}${livePrice} | Prev Close: ${currencySymbol}${previousClose} | Change: ${change} (${changePercent}%)`);
      return candles;
    } catch (err: any) {
      lastErr = err;
      continue;
    }
  }

  if (cached && cached.candles.length > 0) {
    return cached.candles;
  }
  return [];
}

/**
 * Get live overview with real market statistics
 */
export function getLiveCachedOverview(symbol: string) {
  const sym = symbol.toUpperCase().trim();
  return liveCandleCache.get(sym);
}

/**
 * Bulk Warm-up for top global stocks on server startup
 */
export async function warmUpYahooFinanceCache(symbols: string[]): Promise<void> {
  console.log(`🌐 [YahooFinance] Initializing Live Real-Time Market Data Engine for ${symbols.length} stocks...`);
  
  // Warm up in small parallel batches to respect rate limits
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(sym => fetchLiveYahooCandles(sym))
    );
  }

  console.log(`✅ [YahooFinance] Live Real-Time Market Data Engine synchronized successfully!`);
}
