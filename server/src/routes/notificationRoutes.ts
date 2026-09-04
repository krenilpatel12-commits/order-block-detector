import { Router, Response } from 'express';
import { dbGet, dbQuery, dbRun } from '../db/db.js';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware.js';
import { NotificationPreferences, NotificationRecord, OrderBlockType, SentEmailLog, Timeframe } from '../types/index.js';
import { triggerManualTestAlert, purgeExpiredNotifications } from '../engine/alertEngine.js';

export const notificationRouter = Router();

// Get User Alert & Notification Preferences
notificationRouter.get('/preferences', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  let pref = dbGet<{
    alert_type_pref: string;
    daily_enabled: number;
    weekly_enabled: number;
    app_notifications_enabled: number;
    email_notifications_enabled: number;
    email_address: string;
  }>('SELECT * FROM notification_preferences WHERE user_id = ?', [userId]);

  if (!pref) {
    dbRun(
      `INSERT INTO notification_preferences (user_id, alert_type_pref, daily_enabled, weekly_enabled, app_notifications_enabled, email_notifications_enabled, email_address)
       VALUES (?, 'BOTH', 1, 1, 1, 1, ?)`,
      [userId, req.user!.email]
    );
    pref = {
      alert_type_pref: 'BOTH',
      daily_enabled: 1,
      weekly_enabled: 1,
      app_notifications_enabled: 1,
      email_notifications_enabled: 1,
      email_address: req.user!.email
    };
  }

  const response: NotificationPreferences = {
    userId,
    alertTypePreference: (pref.alert_type_pref as any) || 'BOTH',
    dailyAlertsEnabled: pref.daily_enabled === 1,
    weeklyAlertsEnabled: pref.weekly_enabled === 1,
    appNotificationsEnabled: pref.app_notifications_enabled === 1,
    emailNotificationsEnabled: pref.email_notifications_enabled === 1,
    emailAddress: pref.email_address || req.user!.email
  };

  res.json({ preferences: response });
});

// Update Notification Preferences
notificationRouter.put('/preferences', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      alertTypePreference,
      dailyAlertsEnabled,
      weeklyAlertsEnabled,
      appNotificationsEnabled,
      emailNotificationsEnabled,
      emailAddress
    } = req.body;

    const current = dbGet('SELECT user_id FROM notification_preferences WHERE user_id = ?', [userId]);

    const alertType = ['BOTH', 'BULLISH_ONLY', 'BEARISH_ONLY', 'DISABLED'].includes(alertTypePreference)
      ? alertTypePreference
      : 'BOTH';
    const daily = dailyAlertsEnabled !== undefined ? (dailyAlertsEnabled ? 1 : 0) : 1;
    const weekly = weeklyAlertsEnabled !== undefined ? (weeklyAlertsEnabled ? 1 : 0) : 1;
    const app = appNotificationsEnabled !== undefined ? (appNotificationsEnabled ? 1 : 0) : 1;
    const email = emailNotificationsEnabled !== undefined ? (emailNotificationsEnabled ? 1 : 0) : 1;
    const addr = emailAddress ? emailAddress.trim().toLowerCase() : req.user!.email;

    if (current) {
      dbRun(
        `UPDATE notification_preferences 
         SET alert_type_pref = ?, daily_enabled = ?, weekly_enabled = ?, app_notifications_enabled = ?, email_notifications_enabled = ?, email_address = ?
         WHERE user_id = ?`,
        [alertType, daily, weekly, app, email, addr, userId]
      );
    } else {
      dbRun(
        `INSERT INTO notification_preferences (user_id, alert_type_pref, daily_enabled, weekly_enabled, app_notifications_enabled, email_notifications_enabled, email_address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, alertType, daily, weekly, app, email, addr]
      );
    }

    res.json({
      message: 'Alert & notification preferences updated successfully.',
      preferences: {
        userId,
        alertTypePreference: alertType,
        dailyAlertsEnabled: daily === 1,
        weeklyAlertsEnabled: weekly === 1,
        appNotificationsEnabled: app === 1,
        emailNotificationsEnabled: email === 1,
        emailAddress: addr
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences.' });
  }
});

// Get Notification History (Retained within 30 days)
notificationRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    // Auto cleanup expired older than 30 days
    purgeExpiredNotifications();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const rows = dbQuery<{
      id: number;
      user_id: number;
      symbol: string;
      stock_name: string;
      timeframe: string;
      ob_type: string;
      ob_high: number;
      ob_low: number;
      current_price: number;
      title: string;
      message: string;
      is_read: number;
      created_at: string;
    }>(
      `SELECT * FROM notifications 
       WHERE user_id = ? AND created_at >= ?
       ORDER BY id DESC LIMIT 100`,
      [userId, thirtyDaysAgo]
    );

    const unreadCountRes = dbGet<{ count: number }>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0 AND created_at >= ?',
      [userId, thirtyDaysAgo]
    );

    const notifications: NotificationRecord[] = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      symbol: r.symbol,
      stockName: r.stock_name,
      timeframe: r.timeframe as Timeframe,
      obType: r.ob_type as OrderBlockType,
      obHigh: r.ob_high,
      obLow: r.ob_low,
      currentPrice: r.current_price,
      currencySymbol: '$',
      title: r.title,
      message: r.message,
      isRead: r.is_read === 1,
      createdAt: r.created_at
    }));

    res.json({
      notifications,
      unreadCount: unreadCountRes ? unreadCountRes.count : 0,
      retentionDays: 30
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

// Mark Single Notification as Read
notificationRouter.put('/:id/read', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const notifId = Number(req.params.id);

  dbRun('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notifId, userId]);
  res.json({ message: 'Notification marked as read.', id: notifId });
});

// Mark All Notifications as Read
notificationRouter.put('/read-all', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  dbRun('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  res.json({ message: 'All notifications marked as read.' });
});

// Clear All Notification History
notificationRouter.delete('/clear', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  dbRun('DELETE FROM notifications WHERE user_id = ?', [userId]);
  res.json({ message: 'Notification history cleared.' });
});

// Trigger Manual Test Alert
notificationRouter.post('/test', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { symbol = 'RELIANCE', timeframe = '1D', obType = 'Bullish' } = req.body;

    const ob = await triggerManualTestAlert(userId, symbol, timeframe as Timeframe, obType as OrderBlockType);
    res.json({ message: `Simulated ${timeframe} ${obType} alert triggered for ${symbol}.`, orderBlock: ob });
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger test alert.' });
  }
});

// Get Sent Email Alerts Log (Simulated Email Inbox Viewer)
notificationRouter.get('/emails', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userEmail = req.user!.email;
    const rows = dbQuery<{
      id: string;
      to_email: string;
      subject: string;
      html_content: string;
      text_content: string;
      symbol: string;
      sent_at: string;
    }>(
      `SELECT * FROM sent_emails WHERE to_email = ? OR to_email = 'trader@orderblock.com' ORDER BY sent_at DESC LIMIT 50`,
      [userEmail]
    );

    const emails: SentEmailLog[] = rows.map(r => ({
      id: r.id,
      to: r.to_email,
      subject: r.subject,
      html: r.html_content,
      text: r.text_content,
      symbol: r.symbol,
      sentAt: r.sent_at
    }));

    res.json({ emails, count: emails.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve sent emails.' });
  }
});
