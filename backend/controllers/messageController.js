const { isUserInChat, getChatParticipants } = require('../models/chatModel');
const {
  createMessage,
  getMessagesByChat,
  findMessageById,
  deleteMessageById,
  markChatSeenForUser,
} = require('../models/messageModel');

/**
 * Validate that a value is a valid non-empty string ID
 */
const isValidId = (id) => {
  if (!id) return false;
  const trimmed = String(id).trim();
  return trimmed.length > 0;
};

/**
 * Get messages for a specific chat
 * GET /api/messages/:chatId?limit=30&offset=0
 */
const getMessages = async (req, res, next) => {
  try {
    const chatId = req.params.chatId;
    const limit = Math.min(Number(req.query.limit || 30), 100);
    const offset = Math.max(Number(req.query.offset || 0), 0);

    console.log('[MSG] Fetching messages:', { chatId, limit, offset });

    if (!isValidId(chatId)) {
      console.error('[MSG] Invalid chatId:', chatId);
      return res.status(400).json({
        message: 'Chat ID is required and must be a non-empty string',
      });
    }

    if (!Number.isInteger(limit) || limit < 1) {
      return res.status(400).json({ message: 'Limit must be a positive integer' });
    }

    if (!Number.isInteger(offset) || offset < 0) {
      return res.status(400).json({ message: 'Offset must be a non-negative integer' });
    }

    const allowed = await isUserInChat(chatId, req.user.id);
    if (!allowed) {
      console.error('[MSG] User not authorized:', { userId: req.user.id, chatId });
      return res.status(403).json({ message: 'You are not a member of this chat' });
    }

    console.log('[MSG] Fetching from database:', { chatId, limit, offset });
    const messages = await getMessagesByChat(chatId, limit, offset);

    console.log('[MSG] Retrieved', messages.length, 'messages');
    return res.json(messages || []);
  } catch (error) {
    console.error('[MSG] getMessages error:', error.message);
    console.error('[MSG] Stack:', error.stack);
    return next(error);
  }
};

/**
 * Create a new message in a chat
 * POST /api/messages
 */
const createNewMessage = async (req, res, next) => {
  try {
    const { chatId, message = '', messageType = 'text', replyTo = null, clientMessageId = null } = req.body;
    const senderId = req.user.id;
    const mediaUrl = req.file ? `/uploads/${req.file.filename}` : null;

    console.log('[MSG] createNewMessage request body:', req.body);
    console.log('[MSG] createNewMessage auth user:', req.user);
    console.log('[MSG] Creating message:', { chatId, messageType, hasText: !!message, hasFile: !!req.file });

    if (!isValidId(chatId)) {
      console.error('[MSG] Invalid chatId:', chatId);
      return res.status(400).json({ message: 'Chat ID is required and must be a non-empty string' });
    }

    const trimmedMessage = String(message || '').trim();
    if (!trimmedMessage && !mediaUrl) {
      return res.status(400).json({ message: 'Message content or media is required' });
    }

    const validTypes = ['text', 'image', 'video', 'voice', 'file'];
    if (!validTypes.includes(messageType)) {
      return res.status(400).json({ message: `Message type must be one of: ${validTypes.join(', ')}` });
    }

    const allowed = await isUserInChat(chatId, senderId);
    if (!allowed) {
      console.error('[MSG] User not authorized:', { senderId, chatId });
      return res.status(403).json({ message: 'You are not a member of this chat' });
    }

    console.log('[MSG] Inserting message:', { chatId, senderId, type: messageType });
    const messageId = await createMessage({
      chatId,
      senderId,
      message: trimmedMessage,
      messageType,
      mediaUrl,
      replyTo,
    });

    if (!messageId) {
      console.error('[MSG] Failed to create message');
      return res.status(500).json({ success: false, error: 'Failed to create message' });
    }

    const created = await findMessageById(messageId);
    if (!created) {
      console.error('[MSG] Could not retrieve created message:', messageId);
      const fallbackMessage = {
        id: messageId,
        chat_id: Number(chatId),
        sender_id: Number(senderId),
        message: trimmedMessage,
        message_type: messageType,
        media_url: mediaUrl,
        reply_to: replyTo,
        created_at: new Date().toISOString(),
        sender_name: null,
        sender_username: null,
        sender_image: null,
        client_message_id: clientMessageId,
      };

      return res.status(201).json({
        success: true,
        message: fallbackMessage,
      });
    }

    created.client_message_id = clientMessageId;

    const ioPayload = {
      ...created,
      client_message_id: clientMessageId,
    };

    if (req.io) {
      try {
        const participants = await getChatParticipants(chatId);
        console.log('[MSG] Emitting to', participants.length, 'participants');
        participants.forEach((participant) => {
          req.io.to(`user:${participant.id}`).emit('receive_message', ioPayload);
        });

        req.io.to(`chat:${chatId}`).emit('message_sent', ioPayload);
      } catch (emitError) {
        console.error('[MSG] Error emitting message:', emitError.message);
      }
    }

    console.log('[MSG] Message created successfully:', messageId);
    console.log('[MSG] SQL query result / created row:', ioPayload);
    return res.status(201).json({
      success: true,
      message: ioPayload,
    });
  } catch (error) {
    console.error('[MSG] createNewMessage error:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      sql: error.sql,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Delete a message (only sender can delete)
 * DELETE /api/messages/:id
 */
const deleteMessage = async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    console.log('[MSG] Deleting message:', { messageId, userId });

    if (!isValidId(messageId)) {
      return res.status(400).json({ message: 'Message ID is required' });
    }

    const message = await findMessageById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (String(message.sender_id) !== String(userId)) {
      console.error('[MSG] Unauthorized delete:', { messageId, userId, senderId: message.sender_id });
      return res.status(403).json({ message: 'Only the message sender can delete this message' });
    }

    await deleteMessageById(messageId);
    console.log('[MSG] Message deleted successfully');
    return res.json({ message: 'Message deleted successfully', id: messageId });
  } catch (error) {
    console.error('[MSG] deleteMessage error:', error.message);
    return next(error);
  }
};

/**
 * Mark all messages in a chat as seen by current user
 * POST /api/messages/seen
 */
const seenMessage = async (req, res, next) => {
  try {
    const { chatId } = req.body;
    const userId = req.user.id;

    console.log('[MSG] Marking as seen:', { chatId, userId });

    if (!isValidId(chatId)) {
      return res.status(400).json({ message: 'Chat ID is required and must be a non-empty string' });
    }

    const allowed = await isUserInChat(chatId, userId);
    if (!allowed) {
      console.error('[MSG] User not authorized:', { userId, chatId });
      return res.status(403).json({ message: 'You are not a member of this chat' });
    }

    await markChatSeenForUser(chatId, userId);
    console.log('[MSG] Messages marked as seen for chat:', chatId);

    if (req.io) {
      try {
        const participants = await getChatParticipants(chatId);
        participants.forEach((participant) => {
          if (String(participant.id) === String(userId)) {
            return;
          }

          req.io.to(`user:${participant.id}`).emit('message_seen', { chatId, userId });
        });

        req.io.to(`chat:${chatId}`).emit('message_seen', { chatId, userId });
      } catch (emitError) {
        console.error('[MSG] Error emitting seen event:', emitError.message);
      }
    }

    return res.json({ message: 'Messages marked as seen', chatId });
  } catch (error) {
    console.error('[MSG] seenMessage error:', error.message);
    return next(error);
  }
};

module.exports = {
  getMessages,
  createNewMessage,
  deleteMessage,
  seenMessage,
};
