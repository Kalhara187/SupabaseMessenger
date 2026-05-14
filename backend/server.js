require('dotenv').config();

const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const initDb = require('./initDb');

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

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/chats', chatRoutes);
  app.use('/api/messages', messageRoutes);

  app.use(errorHandler);

  const PORT = Number(process.env.PORT || 5000);

  server.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server', err.message || err);
  process.exit(1);
});
