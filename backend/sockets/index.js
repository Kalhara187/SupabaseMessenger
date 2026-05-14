const jwt = require('jsonwebtoken');
const { updateOnlineStatus } = require('../models/userModel');

const socketToUserMap = new Map();

const configureSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Unauthorized'));
    }

    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = user;
      return next();
    } catch (error) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    socketToUserMap.set(socket.id, userId);
    socket.join(`user:${userId}`);

    await updateOnlineStatus(userId, true);
    io.emit('user_online', { userId });

    socket.on('send_message', (payload) => {
      io.to(`chat:${payload.chatId}`).emit('receive_message', payload);
    });

    socket.on('join_chat', (chatId) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('typing', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing', { chatId, userId });
    });

    socket.on('stop_typing', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('stop_typing', { chatId, userId });
    });

    socket.on('message_seen', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('message_seen', { chatId, userId });
    });

    socket.on('disconnect', async () => {
      socketToUserMap.delete(socket.id);
      await updateOnlineStatus(userId, false);
      io.emit('user_offline', { userId });
    });
  });
};

module.exports = configureSocket;
