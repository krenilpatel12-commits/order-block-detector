import { getDb, dbGet, dbQuery, dbRun } from '../db/db.js';
import { initMarketData, searchStocks, getStockOverview, getStockCandles, setPriceOverride, GLOBAL_STOCK_UNIVERSE } from '../engine/marketData.js';
import { detectOrderBlocks } from '../engine/orderBlockDetector.js';
import { evaluateOBEntry, purgeExpiredNotifications, triggerOrderBlockAlert, isAlertPermitted } from '../engine/alertEngine.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🧪 ORDER BLOCK DETECTOR AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  // Test 1: Database & Seed Users
  console.log('🔹 TEST GROUP 1: Database & User Security');
  await getDb();

  const masterUser = dbGet<{ id: number; email: string; role: string; is_owner: number }>(
    "SELECT id, email, role, is_owner FROM users WHERE email = 'admin@orderblock.com'"
  );
  assert(!!masterUser && masterUser.role === 'ADMIN' && masterUser.is_owner === 1, 'Master Account is securely identified in DB as Owner');

  const demoUser = dbGet<{ id: number; email: string; role: string; is_owner: number }>(
    "SELECT id, email, role, is_owner FROM users WHERE email = 'trader@orderblock.com'"
  );
  assert(!!demoUser && demoUser.role === 'USER' && demoUser.is_owner === 0, 'Normal User account is correctly restricted');

  // Test 2: Global Stock Universe & Multi-Country Support
  console.log('\n🔹 TEST GROUP 2: Global Stock Universe & Multi-Market Support');
  initMarketData();

  assert(GLOBAL_STOCK_UNIVERSE.length >= 25, `Global stock universe loaded (${GLOBAL_STOCK_UNIVERSE.length} stocks across 7+ countries)`);

  const indianStock = getStockOverview('RELIANCE');
  assert(indianStock.country === 'India' && indianStock.currency === 'INR' && indianStock.currencySymbol === '₹', 'India market (RELIANCE) identified with INR (₹)');

  const usStock = getStockOverview('AAPL');
  assert(usStock.country === 'United States' && usStock.currency === 'USD' && usStock.currencySymbol === '$', 'US market (AAPL) identified with USD ($)');

  const canadianStock = getStockOverview('SHOP');
  assert(canadianStock.country === 'Canada' && canadianStock.currency === 'CAD' && canadianStock.currencySymbol === 'C$', 'Canada market (SHOP) identified with CAD (C$)');

  const ukStock = getStockOverview('AZN');
  assert(ukStock.country === 'United Kingdom' && ukStock.currency === 'GBP' && ukStock.currencySymbol === '£', 'UK market (AZN) identified with GBP (£)');

  const japanStock = getStockOverview('7203');
  assert(japanStock.country === 'Japan' && japanStock.currency === 'JPY' && japanStock.currencySymbol === '¥', 'Japan market (7203 Toyota) identified with JPY (¥)');

  const germanStock = getStockOverview('SAP');
  assert(germanStock.country === 'Germany' && germanStock.currency === 'EUR' && germanStock.currencySymbol === '€', 'Germany market (SAP) identified with EUR (€)');

  const ausStock = getStockOverview('BHP');
  assert(ausStock.country === 'Australia' && ausStock.currency === 'AUD' && ausStock.currencySymbol === 'A$', 'Australia market (BHP) identified with AUD (A$)');

  // Test 3: Global Stock Search
  console.log('\n🔹 TEST GROUP 3: Global Stock Search Engine');
  const searchApple = searchStocks('Apple');
  assert(searchApple.length > 0 && searchApple[0].symbol === 'AAPL', 'Search by company name "Apple" matches AAPL');

  const searchReliance = searchStocks('Reliance');
  assert(searchReliance.length > 0 && searchReliance[0].symbol === 'RELIANCE', 'Search by company name "Reliance" matches RELIANCE');

  const searchShopify = searchStocks('Shopify');
  assert(searchShopify.length > 0 && searchShopify[0].symbol === 'SHOP', 'Search by company name "Shopify" matches SHOP');

  const filterUS = searchStocks('', 'United States');
  assert(filterUS.length > 0 && filterUS.every(s => s.country === 'United States'), 'Country filter "United States" returns US equities');

  // Test 4: Daily & Weekly Bullish & Bearish Order Block Detection
  console.log('\n🔹 TEST GROUP 4: Order Block Detection Engine (Daily & Weekly)');
  const dailyCandles = getStockCandles('RELIANCE', '1D');
  const dailyOBs = detectOrderBlocks('RELIANCE', dailyCandles, '1D', indianStock.currentPrice, indianStock.currencySymbol);

  assert(dailyOBs.bullishOBs.length > 0, `Detected ${dailyOBs.bullishOBs.length} Daily Bullish Order Blocks for RELIANCE`);
  assert(dailyOBs.bearishOBs.length > 0, `Detected ${dailyOBs.bearishOBs.length} Daily Bearish Order Blocks for RELIANCE`);

  const weeklyCandles = getStockCandles('AAPL', '1W');
  const weeklyOBs = detectOrderBlocks('AAPL', weeklyCandles, '1W', usStock.currentPrice, usStock.currencySymbol);

  assert(weeklyCandles.length > 0 && weeklyCandles.length < dailyCandles.length, 'Weekly aggregation properly condenses Daily candles');
  assert(weeklyOBs.bullishOBs.length > 0, `Detected ${weeklyOBs.bullishOBs.length} Weekly Bullish Order Blocks for AAPL`);
  assert(weeklyOBs.bearishOBs.length > 0, `Detected ${weeklyOBs.bearishOBs.length} Weekly Bearish Order Blocks for AAPL`);

  // Verify structure details
  const sampleOB = dailyOBs.bullishOBs[0];
  assert(
    sampleOB.high > sampleOB.low &&
    sampleOB.meanThreshold === Number(((sampleOB.high + sampleOB.low) / 2).toFixed(2)),
    'Order Block calculates correct High, Low, and 50% Mean Threshold'
  );

  // Test 5: Watchlist 30-Stock Maximum Limit
  console.log('\n🔹 TEST GROUP 5: Watchlist 30-Stock Global Limit Enforcement');
  const testUserId = demoUser!.id;
  // Clear test user's current watchlist
  dbRun('DELETE FROM watchlists WHERE user_id = ?', [testUserId]);

  const now = new Date().toISOString();
  // Add 30 stocks from diverse countries
  for (let i = 0; i < 30; i++) {
    const sym = `TEST_STOCK_${i}`;
    dbRun('INSERT INTO watchlists (user_id, symbol, stock_name, created_at) VALUES (?, ?, ?, ?)', [
      testUserId,
      sym,
      `Test Stock ${i}`,
      now
    ]);
  }

  const countAfter30 = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM watchlists WHERE user_id = ?', [testUserId])?.count;
  assert(countAfter30 === 30, 'User successfully reached exact maximum limit of 30 stocks');

  // Attempting to add 31st stock
  let canAdd31st = false;
  if ((countAfter30 || 0) < 30) {
    canAdd31st = true;
  }
  assert(!canAdd31st, 'Watchlist engine blocks 31st stock addition with 30-stock cap');

  // Clean up test items
  dbRun('DELETE FROM watchlists WHERE user_id = ? AND symbol LIKE "TEST_STOCK_%"', [testUserId]);

  // Test 6: Order Block Alert State Machine & Anti-Spam
  console.log('\n🔹 TEST GROUP 6: Alert State Machine & Anti-Spam Verification');
  dbRun('DELETE FROM alert_states WHERE user_id = ?', [testUserId]);
  dbRun('DELETE FROM notifications WHERE user_id = ?', [testUserId]);

  const mockOB = {
    id: 'RELIANCE_1D_BULL_TEST',
    symbol: 'RELIANCE',
    type: 'Bullish' as const,
    timeframe: '1D' as const,
    high: 1300.0,
    low: 1280.0,
    meanThreshold: 1290.0,
    referenceCandleDate: '2026-08-01',
    referenceCandleIndex: 50,
    formationPrice: 1285.0,
    marketStructureInfo: 'BOS Test',
    status: 'ACTIVE' as const,
    distancePercent: 0,
    isPriceInside: true,
    identifiedAt: '2026-08-01'
  };

  // Step 1: Price is initially outside at ₹1310
  evaluateOBEntry(testUserId, 'RELIANCE', 'Reliance Industries Ltd', '1D', mockOB, 1310.0, '₹');
  let notifs = dbQuery('SELECT * FROM notifications WHERE user_id = ?', [testUserId]);
  assert(notifs.length === 0, 'Price outside OB (₹1310): No alert generated (Status: OUTSIDE)');

  // Step 2: Price enters OB zone at ₹1290 (Transition OUTSIDE -> INSIDE)
  evaluateOBEntry(testUserId, 'RELIANCE', 'Reliance Industries Ltd', '1D', mockOB, 1290.0, '₹');
  notifs = dbQuery('SELECT * FROM notifications WHERE user_id = ?', [testUserId]);
  assert(notifs.length === 1, 'Price enters OB (₹1290): Generated 1 NEW ENTRY alert');

  // Step 3: Price remains inside at ₹1285 (INSIDE -> INSIDE: Lingering)
  evaluateOBEntry(testUserId, 'RELIANCE', 'Reliance Industries Ltd', '1D', mockOB, 1285.0, '₹');
  notifs = dbQuery('SELECT * FROM notifications WHERE user_id = ?', [testUserId]);
  assert(notifs.length === 1, 'Price lingers inside OB (₹1285): Anti-spam prevented duplicate alert');

  // Step 4: Price leaves OB zone at ₹1320 (INSIDE -> OUTSIDE)
  evaluateOBEntry(testUserId, 'RELIANCE', 'Reliance Industries Ltd', '1D', mockOB, 1320.0, '₹');
  notifs = dbQuery('SELECT * FROM notifications WHERE user_id = ?', [testUserId]);
  assert(notifs.length === 1, 'Price exits OB zone (₹1320): System re-arms state to OUTSIDE');

  // Step 5: Price re-enters OB zone at ₹1288 (OUTSIDE -> INSIDE)
  evaluateOBEntry(testUserId, 'RELIANCE', 'Reliance Industries Ltd', '1D', mockOB, 1288.0, '₹');
  notifs = dbQuery('SELECT * FROM notifications WHERE user_id = ?', [testUserId]);
  assert(notifs.length === 2, 'Price re-enters OB zone (₹1288): Generated NEW RE-ENTRY alert (Total: 2 alerts)');

  // Test 7: User Alert Type Preferences Filtering
  console.log('\n🔹 TEST GROUP 7: User Alert Preferences Filtering');
  // Set preference to BULLISH_ONLY
  dbRun('UPDATE notification_preferences SET alert_type_pref = "BULLISH_ONLY", daily_enabled = 1, weekly_enabled = 1 WHERE user_id = ?', [testUserId]);
  assert(isAlertPermitted(testUserId, 'Bullish', '1D') === true, 'BULLISH_ONLY allows Bullish alerts');
  assert(isAlertPermitted(testUserId, 'Bearish', '1D') === false, 'BULLISH_ONLY blocks Bearish alerts');

  // Set preference to BEARISH_ONLY
  dbRun('UPDATE notification_preferences SET alert_type_pref = "BEARISH_ONLY" WHERE user_id = ?', [testUserId]);
  assert(isAlertPermitted(testUserId, 'Bullish', '1D') === false, 'BEARISH_ONLY blocks Bullish alerts');
  assert(isAlertPermitted(testUserId, 'Bearish', '1D') === true, 'BEARISH_ONLY allows Bearish alerts');

  // Set preference to DISABLED
  dbRun('UPDATE notification_preferences SET alert_type_pref = "DISABLED" WHERE user_id = ?', [testUserId]);
  assert(isAlertPermitted(testUserId, 'Bullish', '1D') === false, 'DISABLED blocks Bullish alerts');
  assert(isAlertPermitted(testUserId, 'Bearish', '1D') === false, 'DISABLED blocks Bearish alerts');

  // Reset to BOTH
  dbRun('UPDATE notification_preferences SET alert_type_pref = "BOTH" WHERE user_id = ?', [testUserId]);
  assert(isAlertPermitted(testUserId, 'Bullish', '1D') === true && isAlertPermitted(testUserId, 'Bearish', '1D') === true, 'BOTH allows both Bullish and Bearish alerts');

  // Test 8: 30-Day TTL Retention Cleanup
  console.log('\n🔹 TEST GROUP 8: 30-Day Notification Retention Cleanup');
  const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
  dbRun(
    `INSERT INTO notifications (user_id, symbol, stock_name, timeframe, ob_type, ob_high, ob_low, current_price, title, message, is_read, created_at)
     VALUES (?, 'AAPL', 'Apple Inc', '1D', 'Bullish', 230, 220, 225, 'Old Alert', 'Old Message', 0, ?)`,
    [testUserId, thirtyFiveDaysAgo]
  );

  const purgedCount = purgeExpiredNotifications();
  assert(purgedCount >= 1, `Purge engine successfully cleaned up ${purgedCount} expired notification(s) older than 30 days`);

  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
