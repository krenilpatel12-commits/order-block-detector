import initSqlJs, { Database, SqlValue } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_FILE_PATH = path.resolve(process.cwd(), 'order_block.sqlite');

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Could not read existing SQLite file, creating fresh database...', e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initSchema(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE_PATH, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

function initSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      is_owner INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watchlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      stock_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, symbol),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      stock_name TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      ob_type TEXT NOT NULL,
      ob_high REAL NOT NULL,
      ob_low REAL NOT NULL,
      current_price REAL NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alert_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      ob_type TEXT NOT NULL,
      ob_id TEXT NOT NULL,
      last_state TEXT NOT NULL, -- 'INSIDE' | 'OUTSIDE'
      last_alerted_at TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, symbol, timeframe, ob_type, ob_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id INTEGER PRIMARY KEY,
      alert_type_pref TEXT NOT NULL DEFAULT 'BOTH', -- 'BOTH' | 'BULLISH_ONLY' | 'BEARISH_ONLY' | 'DISABLED'
      daily_enabled INTEGER NOT NULL DEFAULT 1,
      weekly_enabled INTEGER NOT NULL DEFAULT 1,
      app_notifications_enabled INTEGER NOT NULL DEFAULT 1,
      email_notifications_enabled INTEGER NOT NULL DEFAULT 1,
      email_address TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sent_emails (
      id TEXT PRIMARY KEY,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      html_content TEXT NOT NULL,
      text_content TEXT NOT NULL,
      symbol TEXT NOT NULL,
      sent_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      otp_code TEXT NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      otp_code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Handle migration if columns are missing in notification_preferences
  try {
    const tableInfo = db.exec("PRAGMA table_info(notification_preferences)");
    if (tableInfo.length && tableInfo[0].values) {
      const columns = tableInfo[0].values.map((col: any) => col[1]);
      if (!columns.includes('alert_type_pref')) {
        db.run("ALTER TABLE notification_preferences ADD COLUMN alert_type_pref TEXT NOT NULL DEFAULT 'BOTH'");
      }
      if (!columns.includes('daily_enabled')) {
        db.run("ALTER TABLE notification_preferences ADD COLUMN daily_enabled INTEGER NOT NULL DEFAULT 1");
      }
      if (!columns.includes('weekly_enabled')) {
        db.run("ALTER TABLE notification_preferences ADD COLUMN weekly_enabled INTEGER NOT NULL DEFAULT 1");
      }
    }
  } catch (e) {
    // Ignore migration error if fresh table
  }

  // Seed Admin / Master Account (Owner)
  const adminRes = db.exec("SELECT id FROM users WHERE email = 'admin@orderblock.com'");
  if (!adminRes.length || !adminRes[0].values.length) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    const now = new Date().toISOString();
    db.run(
      "INSERT INTO users (email, password_hash, name, role, is_owner, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      ['admin@orderblock.com', hash, 'Master Account Owner', 'ADMIN', 1, now]
    );

    const adminId = (db.exec("SELECT last_insert_rowid() as id")[0].values[0][0]) as number;
    db.run(
      `INSERT INTO notification_preferences (user_id, alert_type_pref, daily_enabled, weekly_enabled, app_notifications_enabled, email_notifications_enabled, email_address)
       VALUES (?, 'BOTH', 1, 1, 1, 1, ?)`,
      [adminId, 'admin@orderblock.com']
    );

    // Seed sample global watchlist for master account
    const masterWatchlist = [
      { symbol: 'RELIANCE', name: 'Reliance Industries Ltd' },
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'SHOP', name: 'Shopify Inc.' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation' },
      { symbol: 'TCS', name: 'Tata Consultancy Services Ltd' },
      { symbol: 'AZN', name: 'AstraZeneca PLC' },
      { symbol: '7203', name: 'Toyota Motor Corporation' },
      { symbol: 'SAP', name: 'SAP SE' }
    ];

    for (const item of masterWatchlist) {
      db.run(
        "INSERT OR IGNORE INTO watchlists (user_id, symbol, stock_name, created_at) VALUES (?, ?, ?, ?)",
        [adminId, item.symbol, item.name, now]
      );
    }
  }

  // Seed Krenil's Master Account Owner directly
  const krenilRes = db.exec("SELECT id FROM users WHERE email = 'krenilpatel12@gmail.com'");
  if (!krenilRes.length || !krenilRes[0].values.length) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('krenil12014', salt);
    const now = new Date().toISOString();
    db.run(
      "INSERT INTO users (email, password_hash, name, role, is_owner, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      ['krenilpatel12@gmail.com', hash, 'Krenil Patel (Master Owner)', 'ADMIN', 1, now]
    );

    const krenilId = (db.exec("SELECT last_insert_rowid() as id")[0].values[0][0]) as number;
    db.run(
      `INSERT OR IGNORE INTO notification_preferences (user_id, alert_type_pref, daily_enabled, weekly_enabled, app_notifications_enabled, email_notifications_enabled, email_address)
       VALUES (?, 'BOTH', 1, 1, 1, 1, ?)`,
      [krenilId, 'krenilpatel12@gmail.com']
    );

    const defaultIndianWatchlist = [
      { symbol: 'RELIANCE', name: 'Reliance Industries Ltd' },
      { symbol: 'TCS', name: 'Tata Consultancy Services Ltd' },
      { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd' },
      { symbol: 'INFY', name: 'Infosys Ltd' },
      { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd' }
    ];

    for (const item of defaultIndianWatchlist) {
      db.run(
        "INSERT OR IGNORE INTO watchlists (user_id, symbol, stock_name, created_at) VALUES (?, ?, ?, ?)",
        [krenilId, item.symbol, item.name, now]
      );
    }
  } else {
    // If account already exists, update password to krenil12014 and guarantee ADMIN ownership
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('krenil12014', salt);
    db.run("UPDATE users SET password_hash = ?, role = 'ADMIN', is_owner = 1 WHERE email = 'krenilpatel12@gmail.com'", [hash]);
  }

  // Seed Demo Trader User
  const demoRes = db.exec("SELECT id FROM users WHERE email = 'trader@orderblock.com'");
  if (!demoRes.length || !demoRes[0].values.length) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('trader123', salt);
    const now = new Date().toISOString();
    db.run(
      "INSERT INTO users (email, password_hash, name, role, is_owner, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      ['trader@orderblock.com', hash, 'Global Trader Demo', 'USER', 0, now]
    );

    const userId = (db.exec("SELECT last_insert_rowid() as id")[0].values[0][0]) as number;

    db.run(
      `INSERT INTO notification_preferences (user_id, alert_type_pref, daily_enabled, weekly_enabled, app_notifications_enabled, email_notifications_enabled, email_address)
       VALUES (?, 'BOTH', 1, 1, 1, 1, ?)`,
      [userId, 'trader@orderblock.com']
    );

    // Seed diverse multi-country watchlist for demo user
    const defaultWatchlist = [
      { symbol: 'RELIANCE', name: 'Reliance Industries Ltd' },
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation' },
      { symbol: 'TCS', name: 'Tata Consultancy Services Ltd' },
      { symbol: 'SHOP', name: 'Shopify Inc.' },
      { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd' },
      { symbol: 'MSFT', name: 'Microsoft Corporation' },
      { symbol: 'SHEL', name: 'Shell PLC' },
      { symbol: '7203', name: 'Toyota Motor Corporation' },
      { symbol: 'SAP', name: 'SAP SE' },
      { symbol: 'BHP', name: 'BHP Group Ltd' },
      { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd' }
    ];

    for (const item of defaultWatchlist) {
      db.run(
        "INSERT OR IGNORE INTO watchlists (user_id, symbol, stock_name, created_at) VALUES (?, ?, ?, ?)",
        [userId, item.symbol, item.name, now]
      );
    }
  }
}

// Database helper functions
export function dbQuery<T = any>(sql: string, params: SqlValue[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as unknown as T;
    rows.push(row);
  }
  stmt.free();
  return rows;
}

export function dbGet<T = any>(sql: string, params: SqlValue[] = []): T | null {
  const rows = dbQuery<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function dbRun(sql: string, params: SqlValue[] = []): { changes: number; lastInsertRowid: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  saveDb();
  const lastIdRes = dbInstance.exec("SELECT last_insert_rowid() as id");
  const lastId = lastIdRes.length && lastIdRes[0].values.length ? Number(lastIdRes[0].values[0][0]) : 0;
  return { changes: 1, lastInsertRowid: lastId };
}
