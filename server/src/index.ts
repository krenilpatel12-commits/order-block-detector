import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { getDb } from './db/db.js';
import { initMarketData } from './engine/marketData.js';
import { runWatchlistScanner, purgeExpiredNotifications, registerClientWs } from './engine/alertEngine.js';
import { authRouter } from './routes/authRoutes.js';
import { stockRouter } from './routes/stockRoutes.js';
import { watchlistRouter } from './routes/watchlistRoutes.js';
import { notificationRouter } from './routes/notificationRoutes.js';
import { adminRouter } from './routes/adminRoutes.js';
import { JWT_SECRET } from './middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/stocks', stockRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ORDER BLOCK DETECTOR',
    version: '1.0.0',
    access: 'FREE_LAUNCH',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static build in production
const possibleClientDistPaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist')
];
const clientDistPath = possibleClientDistPaths.find(p => fs.existsSync(p));
if (clientDistPath) {
  console.log(`📦 Serving static client build from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  // Catch-all route to serve index.html for SPA client-side routing
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// WebSocket connection handling for live In-App alerts
wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
      registerClientWs(decoded.id, ws);
      ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Real-time alert stream connected.' }));
    } catch (e) {
      ws.send(JSON.stringify({ type: 'AUTH_ERROR', message: 'Invalid token for WebSocket connection.' }));
      ws.close();
    }
  } else {
    // Anonymous connection
    ws.send(JSON.stringify({ type: 'CONNECTED_ANONYMOUS', message: 'Connected in guest mode.' }));
  }
});

// Initialize database, market data & start server
async function startServer() {
  try {
    console.log('⚡ Initializing Order Block Detector Database...');
    await getDb();
    console.log('✅ SQLite Database initialized.');

    console.log('📈 Initializing Global Stock Market Universe...');
    initMarketData();
    console.log('✅ Global Market Data Engine loaded.');

    // 30-Day TTL initial cleanup
    purgeExpiredNotifications();

    // Start background Watchlist Scanner daemon (runs every 6 seconds)
    setInterval(async () => {
      try {
        await runWatchlistScanner();
      } catch (err) {
        console.error('Watchlist background scan error:', err);
      }
    }, 6000);

    // Run 30-day notification purge every 1 hour
    setInterval(() => {
      purgeExpiredNotifications();
    }, 60 * 60 * 1000);

    server.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 ORDER BLOCK DETECTOR BACKEND RUNNING ON PORT ${PORT}`);
      console.log(`🌐 REST API: http://localhost:${PORT}/api`);
      console.log(`📡 WebSocket: ws://localhost:${PORT}/ws`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
