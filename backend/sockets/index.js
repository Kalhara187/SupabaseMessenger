const jwt = require('jsonwebtoken');
const { updateOnlineStatus } = require('../models/userModel');
const { getChatParticipants, isUserInChat } = require('../models/chatModel');

const socketToUserMap = new Map();

const configureSocket = (io) => {
  const emitToChatParticipants = async (chatId, eventName, payload, excludeUserId = null) => {
    const participants = await getChatParticipants(chatId);

    participants.forEach((participant) => {
      if (excludeUserId && String(participant.id) === String(excludeUserId)) {
        return;
      }

      io.to(`user:${participant.id}`).emit(eventName, payload);
    });
  };

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

    socket.on('join_chat', async (chatId, ack) => {
      try {
        if (!chatId) {
          ack?.({ ok: false, message: 'chatId is required' });
          return;
        }

        const allowed = await isUserInChat(chatId, userId);
        if (!allowed) {
          ack?.({ ok: false, message: 'Forbidden' });
          return;
        }

        socket.join(`chat:${chatId}`);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, message: error.message || 'Failed to join chat' });
      }
    });

    socket.on('send_message', async (payload) => {
      if (!payload?.chatId) {
        return;
      }

      try {
        await emitToChatParticipants(payload.chatId, 'receive_message', payload, userId);
      } catch (error) {
        console.error('[SOCKET] Failed to forward message:', error.message);
      }
    });

    socket.on('typing', async ({ chatId }) => {
      if (!chatId) {
        return;
      }

      try {
        await emitToChatParticipants(chatId, 'typing', { chatId, userId }, userId);
      } catch (error) {
        console.error('[SOCKET] Failed to forward typing state:', error.message);
      }
    });

    socket.on('stop_typing', async ({ chatId }) => {
      if (!chatId) {
        return;
      }

      try {
        await emitToChatParticipants(chatId, 'stop_typing', { chatId, userId }, userId);
      } catch (error) {
        console.error('[SOCKET] Failed to forward typing stop:', error.message);
      }
    });

    socket.on('message_seen', async ({ chatId }) => {
      if (!chatId) {
        return;
      }

      try {
        await emitToChatParticipants(chatId, 'message_seen', { chatId, userId }, userId);
      } catch (error) {
        console.error('[SOCKET] Failed to forward seen state:', error.message);
      }
    });

    socket.on('disconnect', async () => {
      socketToUserMap.delete(socket.id);
      await updateOnlineStatus(userId, false);
      io.emit('user_offline', { userId });
    });
  });
};

module.exports = configureSocket;
