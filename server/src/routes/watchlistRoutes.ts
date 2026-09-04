import { Router, Response } from 'express';
import { dbGet, dbQuery, dbRun } from '../db/db.js';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware.js';
import { getStockCandles, getStockOverview } from '../engine/marketData.js';
import { detectOrderBlocks } from '../engine/orderBlockDetector.js';
import { WatchlistStockItem } from '../types/index.js';

export const watchlistRouter = Router();

const MAX_WATCHLIST_LIMIT = 30;

// Get User Watchlist
watchlistRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const rows = dbQuery<{ id: number; symbol: string; stock_name: string; created_at: string }>(
      'SELECT id, symbol, stock_name, created_at FROM watchlists WHERE user_id = ? ORDER BY id DESC',
      [userId]
    );

    const items: WatchlistStockItem[] = [];

    for (const r of rows) {
      const overview = getStockOverview(r.symbol);
      
      // Check Daily OBs
      const dailyCandles = getStockCandles(r.symbol, '1D');
      const dailyOBs = detectOrderBlocks(r.symbol, dailyCandles, '1D', overview.currentPrice, overview.currencySymbol);
      const activeDailyBull = dailyOBs.bullishOBs.filter(b => b.status === 'ACTIVE');
      const activeDailyBear = dailyOBs.bearishOBs.filter(b => b.status === 'ACTIVE');

      // Check Weekly OBs
      const weeklyCandles = getStockCandles(r.symbol, '1W');
      const weeklyOBs = detectOrderBlocks(r.symbol, weeklyCandles, '1W', overview.currentPrice, overview.currencySymbol);
      const activeWeeklyBull = weeklyOBs.bullishOBs.filter(b => b.status === 'ACTIVE');
      const activeWeeklyBear = weeklyOBs.bearishOBs.filter(b => b.status === 'ACTIVE');

      const hasActive = activeDailyBull.length > 0 || activeDailyBear.length > 0 || activeWeeklyBull.length > 0 || activeWeeklyBear.length > 0;
      let activeType: 'Bullish' | 'Bearish' | undefined = undefined;
      let activeTf: '1D' | '1W' | undefined = undefined;

      if (activeDailyBull.length > 0) {
        activeType = 'Bullish';
        activeTf = '1D';
      } else if (activeDailyBear.length > 0) {
        activeType = 'Bearish';
        activeTf = '1D';
      } else if (activeWeeklyBull.length > 0) {
        activeType = 'Bullish';
        activeTf = '1W';
      } else if (activeWeeklyBear.length > 0) {
        activeType = 'Bearish';
        activeTf = '1W';
      }

      items.push({
        id: r.id,
        userId,
        symbol: r.symbol,
        stockName: r.stock_name || overview.name,
        country: overview.country,
        flag: overview.flag,
        exchange: overview.exchange,
        currency: overview.currency,
        currencySymbol: overview.currencySymbol,
        currentPrice: overview.currentPrice,
        changePercent: overview.changePercent,
        dailyBullishOBCount: dailyOBs.bullishOBs.length,
        dailyBearishOBCount: dailyOBs.bearishOBs.length,
        weeklyBullishOBCount: weeklyOBs.bullishOBs.length,
        weeklyBearishOBCount: weeklyOBs.bearishOBs.length,
        hasActiveOB: hasActive,
        activeOBType: activeType,
        activeOBTimeframe: activeTf,
        addedAt: r.created_at
      });
    }

    res.json({
      watchlist: items,
      count: items.length,
      maxLimit: MAX_WATCHLIST_LIMIT,
      isLimitReached: items.length >= MAX_WATCHLIST_LIMIT
    });
  } catch (err: any) {
    console.error('Error fetching watchlist:', err);
    res.status(500).json({ error: 'Failed to retrieve user watchlist.' });
  }
});

// Add Stock to Watchlist
watchlistRouter.post('/add', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { symbol } = req.body;

    if (!symbol) {
      res.status(400).json({ error: 'Stock symbol is required.' });
      return;
    }

    const sym = symbol.toUpperCase().trim();
    const overview = getStockOverview(sym);

    // Check 30-stock maximum limit
    const countRes = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM watchlists WHERE user_id = ?', [userId]);
    const currentCount = countRes ? countRes.count : 0;

    if (currentCount >= MAX_WATCHLIST_LIMIT) {
      res.status(400).json({
        error: 'Watchlist limit reached. You can monitor a maximum of 30 stocks.',
        count: currentCount,
        maxLimit: MAX_WATCHLIST_LIMIT
      });
      return;
    }

    // Check if already in watchlist
    const existing = dbGet('SELECT id FROM watchlists WHERE user_id = ? AND symbol = ?', [userId, sym]);
    if (existing) {
      res.status(400).json({ error: `${sym} is already in your watchlist.` });
      return;
    }

    const now = new Date().toISOString();
    const result = dbRun(
      'INSERT INTO watchlists (user_id, symbol, stock_name, created_at) VALUES (?, ?, ?, ?)',
      [userId, sym, overview.name, now]
    );

    res.status(201).json({
      message: `${sym} added to your watchlist.`,
      id: result.lastInsertRowid,
      symbol: sym,
      stockName: overview.name,
      country: overview.country,
      flag: overview.flag,
      count: currentCount + 1,
      maxLimit: MAX_WATCHLIST_LIMIT
    });
  } catch (err: any) {
    console.error('Error adding stock to watchlist:', err);
    res.status(500).json({ error: 'Failed to add stock to watchlist.' });
  }
});

// Remove Stock from Watchlist
watchlistRouter.delete('/:symbol', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const rawSymbol = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
    const symbol = (rawSymbol || '').toUpperCase().trim();

    dbRun('DELETE FROM watchlists WHERE user_id = ? AND symbol = ?', [userId, symbol]);
    
    // Also clean up alert states for this stock
    dbRun('DELETE FROM alert_states WHERE user_id = ? AND symbol = ?', [userId, symbol]);

    const countRes = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM watchlists WHERE user_id = ?', [userId]);
    const newCount = countRes ? countRes.count : 0;

    res.json({
      message: `${symbol} removed from your watchlist.`,
      symbol,
      count: newCount,
      maxLimit: MAX_WATCHLIST_LIMIT
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove stock from watchlist.' });
  }
});

// Check if stock is in user's watchlist
watchlistRouter.get('/check/:symbol', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const rawSymbol = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  const symbol = (rawSymbol || '').toUpperCase().trim();

  const existing = dbGet('SELECT id FROM watchlists WHERE user_id = ? AND symbol = ?', [userId, symbol]);
  const countRes = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM watchlists WHERE user_id = ?', [userId]);

  res.json({
    inWatchlist: !!existing,
    count: countRes ? countRes.count : 0,
    maxLimit: MAX_WATCHLIST_LIMIT
  });
});
