import { dbGet, dbQuery, dbRun, saveDb } from '../db/db.js';
import { detectOrderBlocks } from './orderBlockDetector.js';
import { getStockCandles, getStockOverview } from './marketData.js';
import { OrderBlock, OrderBlockType, Timeframe } from '../types/index.js';
import { WebSocket } from 'ws';
import crypto from 'crypto';
import { sendMailDirect } from './emailService.js';

// WebSocket client connection registry
const connectedClients = new Map<number, Set<WebSocket>>();

export function registerClientWs(userId: number, ws: WebSocket): void {
  if (!connectedClients.has(userId)) {
    connectedClients.set(userId, new Set());
  }
  connectedClients.get(userId)!.add(ws);

  ws.on('close', () => {
    connectedClients.get(userId)?.delete(ws);
    if (connectedClients.get(userId)?.size === 0) {
      connectedClients.delete(userId);
    }
  });
}

export function broadcastToUser(userId: number, payload: any): void {
  const clients = connectedClients.get(userId);
  if (clients) {
    const data = JSON.stringify(payload);
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }
}

/**
 * 30-Day TTL Retention Cleanup
 * Automatically purges notifications older than 30 days
 */
export function purgeExpiredNotifications(): number {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const countBefore = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM notifications WHERE created_at < ?', [thirtyDaysAgo]);
    const purged = countBefore ? countBefore.count : 0;
    
    if (purged > 0) {
      dbRun('DELETE FROM notifications WHERE created_at < ?', [thirtyDaysAgo]);
      console.log(`[AlertEngine] Purged ${purged} notifications older than 30 days.`);
    }
    return purged;
  } catch (err) {
    console.error('Error purging expired notifications:', err);
    return 0;
  }
}

/**
 * Sends simulated/live HTML Email notification
 */
export async function sendEmailAlert(
  userId: number,
  symbol: string,
  stockName: string,
  timeframe: Timeframe,
  obType: OrderBlockType,
  currentPrice: number,
  currencySymbol: string,
  obHigh: number,
  obLow: number
): Promise<void> {
  const pref = dbGet<{ email_notifications_enabled: number; email_address: string }>(
    'SELECT email_notifications_enabled, email_address FROM notification_preferences WHERE user_id = ?',
    [userId]
  );

  if (!pref || pref.email_notifications_enabled !== 1) {
    return;
  }

  const user = dbGet<{ email: string; name: string }>('SELECT email, name FROM users WHERE id = ?', [userId]);
  const toEmail = pref.email_address || user?.email || 'trader@orderblock.com';
  const tfLabel = timeframe === '1D' ? 'Daily' : 'Weekly';
  const curr = currencySymbol || '$';
  const subject = `🚨 Order Block Alert — ${symbol}`;

  const textContent = `
ORDER BLOCK DETECTOR ALERT
----------------------------------------
Stock: ${stockName} (${symbol})
Timeframe: ${tfLabel}
Order Block Type: ${obType} Order Block
Current Price: ${curr}${currentPrice.toFixed(2)}
Order Block Zone: ${curr}${obLow.toFixed(2)} – ${curr}${obHigh.toFixed(2)}

${symbol} has entered an identified ${tfLabel} ${obType} Order Block.
`.trim();

  const isBullish = obType === 'Bullish';
  const badgeColor = isBullish ? '#10b981' : '#f43f5e';
  const badgeBg = isBullish ? '#064e3b' : '#881337';
  const iconEmoji = isBullish ? '🟢' : '🔴';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f17; color: #e2e8f0; margin: 0; padding: 24px;">
  <div style="max-width: 540px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 20px; border-bottom: 1px solid #334155;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-weight: 800; font-size: 16px; letter-spacing: 1px; color: #38bdf8;">ORDER BLOCK DETECTOR</span>
        <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; border: 1px solid ${badgeColor};">
          ${iconEmoji} ${tfLabel.toUpperCase()} ${obType.toUpperCase()} OB
        </span>
      </div>
    </div>
    
    <div style="padding: 24px;">
      <div style="margin-bottom: 20px;">
        <div style="font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Alert Triggered</div>
        <h2 style="font-size: 24px; margin: 4px 0 0 0; color: #ffffff;">${symbol} <span style="font-size: 15px; color: #64748b; font-weight: normal;">• ${stockName}</span></h2>
      </div>

      <div style="background: #0b0f17; border-radius: 8px; padding: 18px; border: 1px solid #1e293b; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">
          <span style="color: #94a3b8; font-size: 14px;">Current Market Price</span>
          <span style="color: #38bdf8; font-weight: 700; font-size: 18px;">${curr}${currentPrice.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">
          <span style="color: #94a3b8; font-size: 14px;">Order Block Zone</span>
          <span style="color: ${badgeColor}; font-weight: 700; font-size: 16px;">${curr}${obLow.toFixed(2)} – ${curr}${obHigh.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">
          <span style="color: #94a3b8; font-size: 14px;">Timeframe</span>
          <span style="color: #e2e8f0; font-weight: 600; font-size: 14px;">${tfLabel} (1${timeframe[1]})</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #94a3b8; font-size: 14px;">Zone Status</span>
          <span style="color: #10b981; font-weight: 700; font-size: 14px;">ACTIVE (PRICE INSIDE)</span>
        </div>
      </div>

      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        <strong>${symbol}</strong> has entered the identified <strong>${tfLabel} ${obType} Order Block</strong>. Open the live chart to analyze high-probability trade setups.
      </p>

      <div style="text-align: center; margin-top: 24px;">
        <a href="http://localhost:5173" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Open Stock Analysis
        </a>
      </div>
    </div>

    <div style="background: #080c14; padding: 14px 20px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #1e293b;">
      Order Block Detector • Global Multi-Market Analysis & Alert Platform
    </div>
  </div>
</body>
</html>
`.trim();

  const emailId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Save to database sent_emails log for inbox viewer
  dbRun(
    `INSERT INTO sent_emails (id, to_email, subject, html_content, text_content, symbol, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [emailId, toEmail, subject, htmlContent, textContent, symbol, now]
  );

  // Dispatch live SMTP email (e.g. Gmail) to user's mobile inbox
  sendMailDirect({
    to: toEmail,
    subject,
    html: htmlContent,
    text: textContent
  }).catch(e => console.warn('[AlertEngine] Email dispatch note:', e));
}

/**
 * Checks if user preferences permit an alert for this OB type and timeframe
 */
export function isAlertPermitted(
  userId: number,
  obType: OrderBlockType,
  timeframe: Timeframe
): boolean {
  const pref = dbGet<{
    alert_type_pref: string;
    daily_enabled: number;
    weekly_enabled: number;
    app_notifications_enabled: number;
    email_notifications_enabled: number;
  }>(
    `SELECT alert_type_pref, daily_enabled, weekly_enabled, app_notifications_enabled, email_notifications_enabled
     FROM notification_preferences WHERE user_id = ?`,
    [userId]
  );

  if (!pref) return true;

  // 1. Check Alert Type Preference
  const alertTypePref = pref.alert_type_pref || 'BOTH';
  if (alertTypePref === 'DISABLED') {
    return false;
  }
  if (alertTypePref === 'BULLISH_ONLY' && obType !== 'Bullish') {
    return false;
  }
  if (alertTypePref === 'BEARISH_ONLY' && obType !== 'Bearish') {
    return false;
  }

  // 2. Check Timeframe Preference
  if (timeframe === '1D' && pref.daily_enabled === 0) {
    return false;
  }
  if (timeframe === '1W' && pref.weekly_enabled === 0) {
    return false;
  }

  // 3. At least one delivery channel must be active
  if (pref.app_notifications_enabled === 0 && pref.email_notifications_enabled === 0) {
    return false;
  }

  return true;
}

/**
 * Processes an individual Order Block check for a user watchlist item
 */
export function evaluateOBEntry(
  userId: number,
  symbol: string,
  stockName: string,
  timeframe: Timeframe,
  ob: OrderBlock,
  currentPrice: number,
  currencySymbol: string
): void {
  const isInside = currentPrice >= ob.low && currentPrice <= ob.high;
  const currentState = isInside ? 'INSIDE' : 'OUTSIDE';
  const now = new Date().toISOString();

  // Fetch prior state from alert_states
  const existingState = dbGet<{
    id: number;
    last_state: string;
    last_alerted_at: string;
  }>(
    `SELECT id, last_state, last_alerted_at FROM alert_states 
     WHERE user_id = ? AND symbol = ? AND timeframe = ? AND ob_type = ? AND ob_id = ?`,
    [userId, symbol, timeframe, ob.type, ob.id]
  );

  if (!existingState) {
    // Initial state registration
    dbRun(
      `INSERT INTO alert_states (user_id, symbol, timeframe, ob_type, ob_id, last_state, last_alerted_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, symbol, timeframe, ob.type, ob.id, currentState, isInside ? now : null, now]
    );

    // If inside on initial registration, trigger alert if preferences allow
    if (isInside && isAlertPermitted(userId, ob.type, timeframe)) {
      triggerOrderBlockAlert(userId, symbol, stockName, timeframe, ob, currentPrice, currencySymbol, 'FIRST_ENTRY');
    }
  } else {
    const prevState = existingState.last_state;

    if (prevState === 'OUTSIDE' && currentState === 'INSIDE') {
      // Transition: OUTSIDE -> INSIDE (New Entry or Re-Entry): TRIGGER ALERT!
      dbRun(
        `UPDATE alert_states SET last_state = 'INSIDE', last_alerted_at = ?, updated_at = ? WHERE id = ?`,
        [now, now, existingState.id]
      );
      if (isAlertPermitted(userId, ob.type, timeframe)) {
        triggerOrderBlockAlert(userId, symbol, stockName, timeframe, ob, currentPrice, currencySymbol, 'RE_ENTRY');
      }
    } else if (prevState === 'INSIDE' && currentState === 'INSIDE') {
      // Lingering inside: DO NOT DUPLICATE ALERT (Anti-Spam)
      dbRun(`UPDATE alert_states SET updated_at = ? WHERE id = ?`, [now, existingState.id]);
    } else if (prevState === 'INSIDE' && currentState === 'OUTSIDE') {
      // Price exited the zone: update state to OUTSIDE to re-arm for future re-entry
      dbRun(`UPDATE alert_states SET last_state = 'OUTSIDE', updated_at = ? WHERE id = ?`, [now, existingState.id]);
    }
  }
}

/**
 * Triggers the alert (In-App Notification + Push + Email)
 */
export async function triggerOrderBlockAlert(
  userId: number,
  symbol: string,
  stockName: string,
  timeframe: Timeframe,
  ob: OrderBlock,
  currentPrice: number,
  currencySymbol: string,
  reason: 'FIRST_ENTRY' | 'RE_ENTRY'
): Promise<void> {
  const tfLabel = timeframe === '1D' ? 'Daily' : 'Weekly';
  const curr = currencySymbol || '$';
  const iconEmoji = ob.type === 'Bullish' ? '🟢' : '🔴';
  const title = `🚨 ${symbol} Entered ${tfLabel} ${ob.type} Order Block`;
  const message = `${symbol} has entered ${tfLabel} ${ob.type} OB zone (${curr}${ob.low.toFixed(2)} – ${curr}${ob.high.toFixed(2)}) at current price ${curr}${currentPrice.toFixed(2)}`;
  const now = new Date().toISOString();

  // Check In-App Notification preference
  const pref = dbGet<{ app_notifications_enabled: number; email_notifications_enabled: number }>(
    'SELECT app_notifications_enabled, email_notifications_enabled FROM notification_preferences WHERE user_id = ?',
    [userId]
  );

  const appEnabled = pref ? pref.app_notifications_enabled === 1 : true;
  const emailEnabled = pref ? pref.email_notifications_enabled === 1 : true;

  if (appEnabled) {
    // Insert into notifications table (retained for 30 days)
    const insertRes = dbRun(
      `INSERT INTO notifications (user_id, symbol, stock_name, timeframe, ob_type, ob_high, ob_low, current_price, title, message, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [userId, symbol, stockName, timeframe, ob.type, ob.high, ob.low, currentPrice, title, message, now]
    );

    // Broadcast live WebSocket event to active user sessions
    broadcastToUser(userId, {
      type: 'ORDER_BLOCK_ALERT',
      data: {
        id: insertRes.lastInsertRowid,
        symbol,
        stockName,
        timeframe,
        obType: ob.type,
        obHigh: ob.high,
        obLow: ob.low,
        currentPrice,
        currencySymbol: curr,
        title,
        message,
        createdAt: now,
        isRead: false
      }
    });
  }

  // Send Email Notification if enabled
  if (emailEnabled) {
    await sendEmailAlert(userId, symbol, stockName, timeframe, ob.type, currentPrice, curr, ob.high, ob.low);
  }
}

/**
 * Watchlist Scanner: Iterates through all users' watchlists and checks for OB entries
 */
export async function runWatchlistScanner(): Promise<{ scannedUsers: number; scannedStocks: number }> {
  const watchlists = dbQuery<{ user_id: number; symbol: string; stock_name: string }>(
    `SELECT w.user_id, w.symbol, w.stock_name 
     FROM watchlists w
     JOIN users u ON u.id = w.user_id`
  );

  let scannedCount = 0;
  const userSet = new Set<number>();

  for (const item of watchlists) {
    userSet.add(item.user_id);
    scannedCount++;

    const overview = getStockOverview(item.symbol);
    const currentPrice = overview.currentPrice;
    const currencySymbol = overview.currencySymbol;

    // 1. Check Daily (1D) Order Blocks
    const dailyCandles = getStockCandles(item.symbol, '1D');
    const dailyOBs = detectOrderBlocks(item.symbol, dailyCandles, '1D', currentPrice, currencySymbol);

    for (const ob of [...dailyOBs.bullishOBs, ...dailyOBs.bearishOBs]) {
      if (ob.status !== 'INVALID') {
        evaluateOBEntry(item.user_id, item.symbol, item.stock_name, '1D', ob, currentPrice, currencySymbol);
      }
    }

    // 2. Check Weekly (1W) Order Blocks
    const weeklyCandles = getStockCandles(item.symbol, '1W');
    const weeklyOBs = detectOrderBlocks(item.symbol, weeklyCandles, '1W', currentPrice, currencySymbol);

    for (const ob of [...weeklyOBs.bullishOBs, ...weeklyOBs.bearishOBs]) {
      if (ob.status !== 'INVALID') {
        evaluateOBEntry(item.user_id, item.symbol, item.stock_name, '1W', ob, currentPrice, currencySymbol);
      }
    }
  }

  saveDb();
  return { scannedUsers: userSet.size, scannedStocks: scannedCount };
}

/**
 * Manually trigger a simulated alert for testing
 */
export async function triggerManualTestAlert(userId: number, symbol: string, timeframe: Timeframe, obType: OrderBlockType): Promise<any> {
  const overview = getStockOverview(symbol);
  const candles = getStockCandles(symbol, timeframe);
  const obs = detectOrderBlocks(symbol, candles, timeframe, overview.currentPrice, overview.currencySymbol);
  const list = obType === 'Bullish' ? obs.bullishOBs : obs.bearishOBs;

  const targetOB = list[0] || {
    id: `${symbol}_${timeframe}_${obType}_TEST`,
    symbol,
    type: obType,
    timeframe,
    high: overview.currentPrice * 1.01,
    low: overview.currentPrice * 0.99,
    meanThreshold: overview.currentPrice,
    referenceCandleDate: new Date().toISOString().split('T')[0],
    referenceCandleIndex: 100,
    formationPrice: overview.currentPrice,
    marketStructureInfo: `Manual Test BOS (${obType})`,
    status: 'ACTIVE',
    distancePercent: 0,
    isPriceInside: true,
    identifiedAt: new Date().toISOString()
  };

  await triggerOrderBlockAlert(userId, symbol, overview.name, timeframe, targetOB, overview.currentPrice, overview.currencySymbol, 'FIRST_ENTRY');
  return targetOB;
}
