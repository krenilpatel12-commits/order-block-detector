import { Router, Request, Response } from 'express';
import { 
  getStockCandles, 
  getStockOverview, 
  fetchStockOverviewAsync, 
  fetchStockCandlesAsync, 
  searchStocks, 
  searchStocksAsync,
  setPriceOverride, 
  tickLivePrice, 
  GLOBAL_STOCK_UNIVERSE 
} from '../engine/marketData.js';
import { detectOrderBlocks } from '../engine/orderBlockDetector.js';
import { StockAnalysis, Timeframe } from '../types/index.js';

export const stockRouter = Router();

// Search stocks across all 5,000+ Indian NSE & BSE stocks dynamically
stockRouter.get('/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  const country = (req.query.country as string) || 'ALL';
  const results = await searchStocksAsync(query, country);
  res.json({ results });
});

// List all supported Indian Market Sectors & Segments
stockRouter.get('/markets', (req: Request, res: Response) => {
  const sectors = [
    { name: 'All Indian Stocks', code: 'ALL', flag: '🇮🇳', exchange: 'NSE / BSE', currency: 'INR (₹)', count: GLOBAL_STOCK_UNIVERSE.length },
    { name: 'Future Growth Potential', code: 'growth', flag: '🔥', exchange: 'NSE / BSE', currency: 'INR (₹)' },
    { name: 'Nifty 50 Large Cap', code: 'largecap', flag: '💎', exchange: 'NSE', currency: 'INR (₹)' },
    { name: 'Mid & Small Cap Gems', code: 'midcap', flag: '🚀', exchange: 'NSE', currency: 'INR (₹)' },
    { name: 'Defense & Aerospace', code: 'defense', flag: '🛡️', exchange: 'NSE', currency: 'INR (₹)' },
    { name: 'Railway & PSU Titans', code: 'railway', flag: '🚆', exchange: 'NSE', currency: 'INR (₹)' },
    { name: 'Banking & NBFC', code: 'banking', flag: '🏦', exchange: 'NSE', currency: 'INR (₹)' },
    { name: 'Power & Green Energy', code: 'power', flag: '⚡', exchange: 'NSE', currency: 'INR (₹)' },
    { name: 'IT & Software', code: 'it', flag: '💻', exchange: 'NSE', currency: 'INR (₹)' },
    { name: 'Automobile & EV', code: 'auto', flag: '🚗', exchange: 'NSE', currency: 'INR (₹)' },
    { name: 'Pharma & Healthcare', code: 'pharma', flag: '💊', exchange: 'NSE', currency: 'INR (₹)' },
    { name: 'FMCG & Consumption', code: 'fmcg', flag: '🛒', exchange: 'NSE', currency: 'INR (₹)' }
  ];

  res.json({ markets: sectors });
});

// Get single stock overview with fresh live tick
stockRouter.get('/:symbol/overview', async (req: Request, res: Response) => {
  const rawSymbol = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  const symbol = (rawSymbol || '').toUpperCase();
  const overview = await fetchStockOverviewAsync(symbol);
  res.json({ stock: overview });
});

// Comprehensive Stock Analysis with 1D/1W Bullish & Bearish Order Blocks and 100% Live Price
stockRouter.get('/:symbol/analysis', async (req: Request, res: Response) => {
  const rawSymbol = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  const symbol = (rawSymbol || '').toUpperCase();
  const timeframe = ((req.query.timeframe as string)?.toUpperCase() === '1W' ? '1W' : '1D') as Timeframe;

  const stock = await fetchStockOverviewAsync(symbol);
  const candles = await fetchStockCandlesAsync(symbol, timeframe);
  const { bullishOBs, bearishOBs } = detectOrderBlocks(symbol, candles, timeframe, stock.currentPrice, stock.currencySymbol);

  const activeBullish = bullishOBs.filter(b => b.status === 'ACTIVE');
  const activeBearish = bearishOBs.filter(b => b.status === 'ACTIVE');
  const activeOrderBlocks = [...activeBullish, ...activeBearish];

  const analysis: StockAnalysis = {
    stock,
    timeframe,
    candles,
    bullishOrderBlocks: bullishOBs,
    bearishOrderBlocks: bearishOBs,
    activeOrderBlocks,
    isInBullishOB: activeBullish.length > 0,
    isInBearishOB: activeBearish.length > 0
  };

  res.json(analysis);
});

// Simulate Live Price Tick
stockRouter.post('/:symbol/tick', (req: Request, res: Response) => {
  const rawSymbol = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  const symbol = (rawSymbol || '').toUpperCase();
  const newPrice = tickLivePrice(symbol);
  const overview = getStockOverview(symbol);
  res.json({ symbol, currentPrice: newPrice, stock: overview });
});

// Price Override / Zone Entry Simulator for testing
stockRouter.post('/:symbol/override-price', (req: Request, res: Response) => {
  const rawSymbol = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  const symbol = (rawSymbol || '').toUpperCase();
  const { price } = req.body;
  
  if (price === undefined || price === null) {
    setPriceOverride(symbol, null);
    const overview = getStockOverview(symbol);
    res.json({ message: `Price override cleared for ${symbol}`, currentPrice: overview.currentPrice });
  } else {
    const numPrice = Number(price);
    setPriceOverride(symbol, numPrice);
    res.json({ message: `Price override set to ${numPrice} for ${symbol}`, currentPrice: numPrice });
  }
});
