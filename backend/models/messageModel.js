const pool = require('../config/db');

const createMessage = async ({ chatId, senderId, message, messageType, mediaUrl = null, replyTo = null }) => {
  console.log('[MESSAGE-MODEL] createMessage called with:', { chatId, senderId, messageType });

  try {
    const [result] = await pool.execute(
      `INSERT INTO messages (chat_id, sender_id, message, message_type, media_url, reply_to)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [chatId, senderId, message, messageType, mediaUrl, replyTo]
    );

    console.log('[MESSAGE-MODEL] Message inserted with ID:', result.insertId);
    return result.insertId;
  } catch (error) {
    console.error('[MESSAGE-MODEL] Failed to create message:', error.message);
    throw error;
  }
};

const getMessagesByChat = async (chatId, limit = 30, offset = 0) => {
  console.log('[MESSAGE-MODEL] getMessagesByChat called with:', { chatId, limit, offset });

  try {
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 30, 1), 100);
    const safeOffset = Math.max(Number.parseInt(offset, 10) || 0, 0);

    const [rows] = await pool.execute(
      `SELECT m.*, u.full_name AS sender_name, u.username AS sender_username, u.profile_image AS sender_image
       FROM messages m
       INNER JOIN users u ON u.id = m.sender_id
       WHERE m.chat_id = ?
       ORDER BY m.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [chatId]
    );

    console.log('[MESSAGE-MODEL] Retrieved', rows.length, 'messages for chat', chatId);
    return rows.reverse();
  } catch (error) {
    console.error('[MESSAGE-MODEL] Failed to fetch messages:', error.message);
    throw error;
  }
};

const findMessageById = async (messageId) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM messages WHERE id = ? LIMIT 1', [messageId]);
    return rows[0] || null;
  } catch (error) {
    console.error('[MESSAGE-MODEL] Failed to find message:', error.message);
    throw error;
  }
};

const deleteMessageById = async (messageId) => {
  try {
    await pool.execute('DELETE FROM messages WHERE id = ?', [messageId]);
  } catch (error) {
    console.error('[MESSAGE-MODEL] Failed to delete message:', error.message);
    throw error;
  }
};

const markChatSeenForUser = async (chatId, userId) => {
  console.log('[MESSAGE-MODEL] markChatSeenForUser:', { chatId, userId });

  try {
    await pool.execute(
      'UPDATE messages SET seen = true WHERE chat_id = ? AND sender_id <> ?',
      [chatId, userId]
    );
    console.log('[MESSAGE-MODEL] Marked messages as seen');
  } catch (error) {
    console.error('[MESSAGE-MODEL] Failed to mark messages as seen:', error.message);
    throw error;
  }
};

module.exports = {
  createMessage,
  getMessagesByChat,
  findMessageById,
  deleteMessageById,
  markChatSeenForUser,
};
