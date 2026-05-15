const pool = require('../config/db');

const createMessage = async ({ chatId, senderId, message, messageType, mediaUrl = null, replyTo = null }) => {
  const [result] = await pool.execute(
    `INSERT INTO messages (chat_id, sender_id, message, message_type, media_url, reply_to)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [chatId, senderId, message, messageType, mediaUrl, replyTo]
  );

  return result.insertId;
};

const getMessagesByChat = async (chatId, limit = 30, offset = 0) => {
  const [rows] = await pool.execute(
    `SELECT m.*, u.full_name AS sender_name, u.username AS sender_username, u.profile_image AS sender_image
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     WHERE m.chat_id = ?
     ORDER BY m.created_at DESC
     LIMIT ? OFFSET ?`,
    [chatId, Number(limit), Number(offset)]
  );

  return rows.reverse();
};

const findMessageById = async (messageId) => {
  const [rows] = await pool.execute('SELECT * FROM messages WHERE id = ? LIMIT 1', [messageId]);
  return rows[0] || null;
};

const deleteMessageById = async (messageId) => {
  await pool.execute('DELETE FROM messages WHERE id = ?', [messageId]);
};

const markChatSeenForUser = async (chatId, userId) => {
  await pool.execute(
    'UPDATE messages SET seen = true WHERE chat_id = ? AND sender_id <> ?',
    [chatId, userId]
  );
};

module.exports = {
  createMessage,
  getMessagesByChat,
  findMessageById,
  deleteMessageById,
  markChatSeenForUser,
};
