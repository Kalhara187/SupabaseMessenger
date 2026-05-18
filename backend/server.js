require('dotenv').config();

// Global safety handlers to avoid the process exiting on unhandled errors.
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason && reason.stack ? reason.stack : reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
});

const path = require('path');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const os = require('os');

const initDb = require('./initDb');

let checkSupabaseConnection = null;
try {
  const supabaseDb = require('./config/supabaseDb');
  checkSupabaseConnection = supabaseDb.checkSupabaseConnection;
} catch (err) {
  console.warn('Supabase pg module not yet installed. Run: npm install');
}

const start = async () => {
  let dbReady = false;

  try {
    await initDb();
    dbReady = true;
  } catch (error) {
    console.error('[SERVER] Database initialization failed, continuing startup so the API stays reachable.', error && error.stack ? error.stack : error);
  }

  const authRoutes = require('./routes/authRoutes');
  const userRoutes = require('./routes/userRoutes');
  const chatRoutes = require('./routes/chatRoutes');
  const messageRoutes = require('./routes/messageRoutes');
  const errorHandler = require('./middleware/errorHandler');
  const configureSocket = require('./sockets');

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

  app.use((req, res, next) => {
    req.io = app.get('io');
    next();
  });

  const healthResponse = (req, res) => {
    res.json({
      status: 'ok',
      databaseReady: dbReady,
      service: 'SQLRealtimeMessenger Backend',
      timestamp: new Date().toISOString(),
      host: '0.0.0.0',
      port: Number(process.env.PORT || 5000),
    });
  };

  app.get('/health', healthResponse);
  app.get('/api/health', healthResponse);

  app.get('/', (req, res) => {
    res.send('Backend server working');
  });

  app.get('/health/supabase', async (req, res) => {
    if (!checkSupabaseConnection) {
      return res.status(503).json({
        service: 'Supabase database',
        connected: false,
        message: 'pg module not installed. Run: npm install',
      });
    }

    const result = await checkSupabaseConnection();
    const statusCode = result.connected ? 200 : 503;

    if (result.connected) {
      console.log('Supabase database connected', {
        latencyMs: result.latencyMs,
        serverTime: result.serverTime,
      });
    } else {
      console.warn('Supabase database connection failed', {
        latencyMs: result.latencyMs,
        message: result.message,
      });
    }

    res.status(statusCode).json({
      service: 'Supabase database',
      ...result,
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/chats', chatRoutes);
  app.use('/api/messages', messageRoutes);

  app.use(errorHandler);

  const PORT = Number(process.env.PORT || 5000);

  const server = app.listen(PORT, '0.0.0.0');
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  app.set('io', io);
  configureSocket(io);

  server.on('listening', () => {
    const networkInterfaces = os.networkInterfaces();
    const localIps = Object.values(networkInterfaces)
      .flat()
      .filter((address) => address && address.family === 'IPv4' && !address.internal)
      .map((address) => address.address);

    const healthUrls = localIps.length > 0
      ? localIps.map((ip) => `http://${ip}:${PORT}/api/health`)
      : [`http://127.0.0.1:${PORT}/api/health`];

    console.log('[SERVER] Running');
    console.log('[SERVER] Bind host: 0.0.0.0');
    console.log('[SERVER] Port:', PORT);
    console.log('[SERVER] Local IPv4 addresses:', localIps.length > 0 ? localIps : ['127.0.0.1']);
    console.log('[SERVER] Health check URLs:', healthUrls);
    console.log('[SERVER] Status: ready');
  });
};

start().catch((err) => {
  console.error('Failed to start server', err.message || err);
  process.exit(1);
});
