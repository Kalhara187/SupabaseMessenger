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

const getChatById = async (chatId) => {
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
        WHERE um.chat_id = c.id AND um.seen = false
      ) AS unread_count
    FROM chats c
    LEFT JOIN messages m ON m.id = (
      SELECT id FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1
    )
    WHERE c.id = ?
    LIMIT 1`,
    [chatId]
  );

  return rows[0] || null;
};

const findDirectChatBetweenUsers = async (userA, userB) => {
  // Normalize: ensure consistent user order (smaller ID first) to prevent duplicates
  const userIds = [String(userA), String(userB)].sort();
  const [user1, user2] = userIds;

  console.log(`[CHAT] Finding direct chat between ${user1} and ${user2}`);

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
        WHERE um.chat_id = c.id AND um.seen = false AND um.sender_id <> ?
      ) AS unread_count
    FROM chats c
    INNER JOIN chat_participants cp1 ON cp1.chat_id = c.id AND cp1.user_id = ?
    INNER JOIN chat_participants cp2 ON cp2.chat_id = c.id AND cp2.user_id = ?
    LEFT JOIN messages m ON m.id = (
      SELECT id FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1
    )
    WHERE c.type = 'direct'
      AND NOT EXISTS (
        SELECT 1
        FROM chat_participants cp3
        WHERE cp3.chat_id = c.id AND cp3.user_id NOT IN (?, ?)
      )
    ORDER BY c.created_at DESC
    LIMIT 1`,
    [user1, user1, user2, user1, user2]
  );

  const chat = rows[0] || null;
  if (chat) {
    console.log(`[CHAT] Found existing direct chat ${chat.id} between ${user1} and ${user2}`);
  } else {
    console.log(`[CHAT] No existing direct chat found between ${user1} and ${user2}`);
  }
  return chat;
};

const findOrCreateDirectChat = async (userA, userB) => {
  // Validate inputs
  const user1 = String(userA);
  const user2 = String(userB);

  if (!user1 || !user2) {
    console.error('[CHAT] Invalid user IDs:', { user1, user2 });
    throw new Error('Both user1 and user2 are required');
  }

  if (user1 === user2) {
    console.error('[CHAT] Cannot create chat with same user:', user1);
    throw new Error('Cannot create a chat with the same user');
  }

  console.log(`[CHAT] findOrCreateDirectChat called with users: ${user1}, ${user2}`);

  const existing = await findDirectChatBetweenUsers(user1, user2);
  if (existing) {
    console.log(`[CHAT] Returning existing chat ${existing.id}`);
    return existing;
  }

  console.log(`[CHAT] Creating new direct chat between ${user1} and ${user2}`);
  const chatId = await createChat({ type: 'direct' }, [user1, user2]);
  const newChat = await getChatById(chatId);

  if (newChat) {
    console.log(`[CHAT] Created new chat ${newChat.id} successfully`);
  }
  return newChat;
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
        WHERE um.chat_id = c.id AND um.seen = false AND um.sender_id <> ?
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
  console.log('[CHAT-MODEL] isUserInChat check:', { chatId, userId, chatIdType: typeof chatId, userIdType: typeof userId });

  try {
    const [rows] = await pool.execute(
      'SELECT id FROM chat_participants WHERE chat_id = ? AND user_id = ? LIMIT 1',
      [chatId, userId]
    );

    const isInChat = Boolean(rows[0]);
    console.log('[CHAT-MODEL] isUserInChat result:', isInChat);
    return isInChat;
  } catch (error) {
    console.error('[CHAT-MODEL] Error checking if user in chat:', error.message);
    throw error;
  }
};

const getChatParticipants = async (chatId) => {
  console.log('[CHAT-MODEL] getChatParticipants called with:', { chatId, chatIdType: typeof chatId });

  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.full_name, u.username, u.profile_image, u.is_online
       FROM chat_participants cp
       INNER JOIN users u ON u.id = cp.user_id
       WHERE cp.chat_id = ?`,
      [chatId]
    );

    console.log('[CHAT-MODEL] Found', rows.length, 'participants for chat', chatId);
    return rows;
  } catch (error) {
    console.error('[CHAT-MODEL] Error fetching participants:', error.message);
    throw error;
  }
};

module.exports = {
  createChat,
  getChatById,
  findDirectChatBetweenUsers,
  findOrCreateDirectChat,
  getUserChats,
  isUserInChat,
  getChatParticipants,
};
