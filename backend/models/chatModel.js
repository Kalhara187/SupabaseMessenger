const pool = require('../config/db');

const createChat = async ({ type, title = null, groupImage = null }, participantIds = []) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [chatResult] = await connection.execute(
      'INSERT INTO chats (type, title, group_image) VALUES (?, ?, ?)',
      [type, title, groupImage]
    );

    const chatId = chatResult.insertId;

    for (const userId of participantIds) {
      await connection.execute(
        'INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)',
        [chatId, userId]
      );
    }

    await connection.commit();
    return chatId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getUserChats = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT
      c.id,
      c.type,
      c.title,
      c.group_image,
      c.created_at,
      m.message AS last_message,
      m.created_at AS last_message_time,
      (
        SELECT COUNT(*)
        FROM messages um
        WHERE um.chat_id = c.id AND um.seen = 0 AND um.sender_id <> ?
      ) AS unread_count
    FROM chats c
    INNER JOIN chat_participants cp ON cp.chat_id = c.id
    LEFT JOIN messages m ON m.id = (
      SELECT id FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1
    )
    WHERE cp.user_id = ?
    ORDER BY COALESCE(m.created_at, c.created_at) DESC`,
    [userId, userId]
  );

  return rows;
};

const isUserInChat = async (chatId, userId) => {
  const [rows] = await pool.execute(
    'SELECT id FROM chat_participants WHERE chat_id = ? AND user_id = ? LIMIT 1',
    [chatId, userId]
  );
  return Boolean(rows[0]);
};

const getChatParticipants = async (chatId) => {
  const [rows] = await pool.execute(
    `SELECT u.id, u.full_name, u.username, u.profile_image, u.is_online
     FROM chat_participants cp
     INNER JOIN users u ON u.id = cp.user_id
     WHERE cp.chat_id = ?`,
    [chatId]
  );
  return rows;
};

module.exports = {
  createChat,
  getUserChats,
  isUserInChat,
  getChatParticipants,
};
