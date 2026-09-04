import { Router, Response } from 'express';
import { dbGet, dbQuery } from '../db/db.js';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/authMiddleware.js';
import { GLOBAL_STOCK_UNIVERSE, getStockCandles, getStockOverview } from '../engine/marketData.js';
import { detectOrderBlocks } from '../engine/orderBlockDetector.js';

export const adminRouter = Router();

// Master Account Admin Overview
adminRouter.get('/stats', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const userCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM users')?.count || 0;
    const watchlistCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM watchlists')?.count || 0;
    const notifCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM notifications')?.count || 0;
    const emailCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM sent_emails')?.count || 0;
    const alertStateCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM alert_states')?.count || 0;

    res.json({
      system: {
        appName: 'ORDER BLOCK DETECTOR',
        version: '1.0.0',
        masterAccount: req.user!.email,
        serverTime: new Date().toISOString(),
        totalGlobalStocksSupported: GLOBAL_STOCK_UNIVERSE.length,
        retentionPolicyDays: 30,
        accessModel: 'FREE_INITIAL_LAUNCH'
      },
      stats: {
        totalUsers: userCount,
        totalWatchlistItems: watchlistCount,
        totalAlertsGenerated: notifCount,
        totalEmailsDispatched: emailCount,
        activeMonitoredStates: alertStateCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve admin stats.' });
  }
});

// Master Account: Global Multi-Market Scanner
adminRouter.get('/global-scan', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const activeOpportunities: any[] = [];

    for (const meta of GLOBAL_STOCK_UNIVERSE) {
      const overview = getStockOverview(meta.symbol);
      const currentPrice = overview.currentPrice;

      // Scan Daily
      const dailyCandles = getStockCandles(meta.symbol, '1D');
      const dailyOBs = detectOrderBlocks(meta.symbol, dailyCandles, '1D', currentPrice, overview.currencySymbol);

      for (const ob of dailyOBs.bullishOBs) {
        if (ob.status === 'ACTIVE') {
          activeOpportunities.push({
            symbol: meta.symbol,
            name: meta.name,
            country: meta.country,
            flag: meta.flag,
            exchange: meta.exchange,
            currency: meta.currency,
            currencySymbol: meta.currencySymbol,
            currentPrice,
            timeframe: '1D',
            obType: 'Bullish',
            obZone: `${overview.currencySymbol}${ob.low} – ${overview.currencySymbol}${ob.high}`,
            status: 'ACTIVE',
            marketStructure: ob.marketStructureInfo
          });
        }
      }

      for (const ob of dailyOBs.bearishOBs) {
        if (ob.status === 'ACTIVE') {
          activeOpportunities.push({
            symbol: meta.symbol,
            name: meta.name,
            country: meta.country,
            flag: meta.flag,
            exchange: meta.exchange,
            currency: meta.currency,
            currencySymbol: meta.currencySymbol,
            currentPrice,
            timeframe: '1D',
            obType: 'Bearish',
            obZone: `${overview.currencySymbol}${ob.low} – ${overview.currencySymbol}${ob.high}`,
            status: 'ACTIVE',
            marketStructure: ob.marketStructureInfo
          });
        }
      }

      // Scan Weekly
      const weeklyCandles = getStockCandles(meta.symbol, '1W');
      const weeklyOBs = detectOrderBlocks(meta.symbol, weeklyCandles, '1W', currentPrice, overview.currencySymbol);

      for (const ob of weeklyOBs.bullishOBs) {
        if (ob.status === 'ACTIVE') {
          activeOpportunities.push({
            symbol: meta.symbol,
            name: meta.name,
            country: meta.country,
            flag: meta.flag,
            exchange: meta.exchange,
            currency: meta.currency,
            currencySymbol: meta.currencySymbol,
            currentPrice,
            timeframe: '1W',
            obType: 'Bullish',
            obZone: `${overview.currencySymbol}${ob.low} – ${overview.currencySymbol}${ob.high}`,
            status: 'ACTIVE',
            marketStructure: ob.marketStructureInfo
          });
        }
      }

      for (const ob of weeklyOBs.bearishOBs) {
        if (ob.status === 'ACTIVE') {
          activeOpportunities.push({
            symbol: meta.symbol,
            name: meta.name,
            country: meta.country,
            flag: meta.flag,
            exchange: meta.exchange,
            currency: meta.currency,
            currencySymbol: meta.currencySymbol,
            currentPrice,
            timeframe: '1W',
            obType: 'Bearish',
            obZone: `${overview.currencySymbol}${ob.low} – ${overview.currencySymbol}${ob.high}`,
            status: 'ACTIVE',
            marketStructure: ob.marketStructureInfo
          });
        }
      }
    }

    res.json({
      opportunities: activeOpportunities,
      totalActiveOBs: activeOpportunities.length,
      scannedMarketsCount: GLOBAL_STOCK_UNIVERSE.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run global market scanner.' });
  }
});

// Master Account: Users List
adminRouter.get('/users', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const users = dbQuery<{
      id: number;
      email: string;
      name: string;
      role: string;
      is_owner: number;
      created_at: string;
    }>('SELECT id, email, name, role, is_owner, created_at FROM users ORDER BY id DESC');

    const mapped = users.map(u => {
      const watchlistCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM watchlists WHERE user_id = ?', [u.id])?.count || 0;
      const notifCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?', [u.id])?.count || 0;
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isOwner: u.is_owner === 1,
        watchlistCount,
        notificationsCount: notifCount,
        createdAt: u.created_at
      };
    });

    res.json({ users: mapped });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});
