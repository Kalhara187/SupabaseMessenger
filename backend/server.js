require('dotenv').config();

const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const initDb = require('./initDb');

let checkSupabaseConnection = null;
try {
  const supabaseDb = require('./config/supabaseDb');
  checkSupabaseConnection = supabaseDb.checkSupabaseConnection;
} catch (err) {
  console.warn('Supabase pg module not yet installed. Run: npm install');
}

const start = async () => {
  await initDb();

  const authRoutes = require('./routes/authRoutes');
  const userRoutes = require('./routes/userRoutes');
  const chatRoutes = require('./routes/chatRoutes');
  const messageRoutes = require('./routes/messageRoutes');
  const errorHandler = require('./middleware/errorHandler');
  const configureSocket = require('./sockets');

  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  configureSocket(io);

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'SQLRealtimeMessenger Backend' });
  });

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

  const HOST = process.env.HOST || '0.0.0.0';
  const PORT = Number(process.env.PORT || 5000);

  server.listen(PORT, HOST, () => {
    console.log(`Backend listening on http://${HOST}:${PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server', err.message || err);
  process.exit(1);
});
