const { isUserInChat, getChatParticipants } = require('../models/chatModel');
const {
  createMessage,
  getMessagesByChat,
  findMessageById,
  deleteMessageById,
  markChatSeenForUser,
} = require('../models/messageModel');

const getMessages = async (req, res, next) => {
  try {
    const chatId = Number(req.params.chatId);
    const limit = Number(req.query.limit || 30);
    const offset = Number(req.query.offset || 0);

    const allowed = await isUserInChat(chatId, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const messages = await getMessagesByChat(chatId, limit, offset);
    return res.json(messages);
  } catch (error) {
    return next(error);
  }
};

const createNewMessage = async (req, res, next) => {
  try {
    const { chatId, message = '', messageType = 'text', replyTo = null } = req.body;
    const numericChatId = Number(chatId);

    const allowed = await isUserInChat(numericChatId, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!message && !req.file) {
      return res.status(400).json({ message: 'Message content or media is required' });
    }

    const mediaUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const messageId = await createMessage({
      chatId: numericChatId,
      senderId: req.user.id,
      message,
      messageType,
      mediaUrl,
      replyTo,
    });

    const created = await findMessageById(messageId);
    const participants = await getChatParticipants(numericChatId);

    if (req.io) {
      req.io.to(`chat:${numericChatId}`).emit('receive_message', created);
      participants.forEach((participant) => {
        req.io.to(`user:${participant.id}`).emit('receive_message', created);
      });
    }

    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    const existing = await findMessageById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (existing.sender_id !== req.user.id) {
      return res.status(403).json({ message: 'Only sender can delete message' });
    }

    await deleteMessageById(req.params.id);
    return res.json({ message: 'Message deleted' });
  } catch (error) {
    return next(error);
  }
};

const seenMessage = async (req, res, next) => {
  try {
    const chatId = Number(req.body.chatId);
    await markChatSeenForUser(chatId, req.user.id);

    if (req.io) {
      req.io.emit('message_seen', { chatId, userId: req.user.id });
    }

    return res.json({ message: 'Messages marked as seen' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMessages,
  createNewMessage,
  deleteMessage,
  seenMessage,
};
