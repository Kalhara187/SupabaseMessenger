const {
  createChat,
  getUserChats,
  getChatById,
  getChatParticipants,
  findOrCreateDirectChat,
} = require('../models/chatModel');

/**
 * Parse participant IDs from various formats (array, JSON string, etc.)
 */
const parseParticipantIds = (rawParticipantIds) => {
  if (Array.isArray(rawParticipantIds)) {
    return rawParticipantIds.filter(id => id);
  }

  if (typeof rawParticipantIds === 'string') {
    try {
      const parsed = JSON.parse(rawParticipantIds || '[]');
      return Array.isArray(parsed) ? parsed.filter(id => id) : [];
    } catch {
      return [];
    }
  }

  return [];
};

/**
 * Validate user ID format
 */
const isValidUserId = (userId) => {
  if (!userId) return false;
  const trimmed = String(userId).trim();
  return trimmed.length > 0;
};

const buildOtherUserPayload = (participant, fallbackTitle = null) => {
  if (!participant) {
    return null;
  }

  return {
    id: participant.id,
    username: participant.username || participant.full_name || participant.email || fallbackTitle || `User ${participant.id}`,
    name: participant.username || participant.full_name || participant.email || fallbackTitle || `User ${participant.id}`,
    avatar: participant.profile_image || null,
  };
};

/**
 * List all chats for the logged-in user
 * GET /api/chats
 */
const listChats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log('[CHAT] listChats for user:', userId);

    const chats = await getUserChats(userId);
    
    const enriched = await Promise.all(
      chats.map(async (chat) => {
        const participants = await getChatParticipants(chat.id);
        const otherParticipant = participants.find(p => String(p.id) !== String(userId));
        const otherUser = buildOtherUserPayload(otherParticipant, chat.title);
        const displayName = otherUser?.name || chat.title || `Chat ${chat.id}`;

        return {
          id: chat.id,
          chat_id: chat.id,
          chatId: chat.id,
          type: chat.type,
          title: chat.title,
          group_image: chat.group_image,
          profile_image: otherParticipant?.profile_image || chat.group_image || null,
          other_user: otherUser,
          other_participant: otherParticipant || null,
          other_participant_is_online: Boolean(otherParticipant?.is_online),
          other_participant_last_seen: otherParticipant?.last_seen || null,
          created_at: chat.created_at,
          updated_at: chat.last_message_time || chat.created_at,
          last_message: chat.last_message,
          last_message_time: chat.last_message_time,
          unread_count: chat.unread_count || 0,
          participants,
          display_name: chat.type === 'direct' ? displayName : chat.title || 'Group Chat',
        };
      })
    );

    console.log('[CHAT] Returning', enriched.length, 'chats');
    return res.json(enriched);
  } catch (error) {
    console.error('[CHAT] listChats error:', error.message);
    return next(error);
  }
};

/**
 * Get a single chat the current user belongs to
 * GET /api/chats/:id
 */
const getChat = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const currentUserId = String(req.user.id);

    if (!isValidUserId(chatId)) {
      return res.status(400).json({ message: 'Chat ID is required' });
    }

    const chat = await getChatById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const participants = await getChatParticipants(chat.id);
    const isMember = participants.some((participant) => String(participant.id) === currentUserId);
    if (!isMember) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return res.json({
      id: chat.id,
      chat_id: chat.id,
      chatId: chat.id,
      type: chat.type,
      title: chat.title,
      group_image: chat.group_image,
      created_at: chat.created_at,
      updated_at: chat.last_message_time || chat.created_at,
      last_message: chat.last_message,
      last_message_time: chat.last_message_time,
      unread_count: chat.unread_count || 0,
      participants,
      other_participant: participants.find((participant) => String(participant.id) !== currentUserId) || null,
      other_user: buildOtherUserPayload(participants.find((participant) => String(participant.id) !== currentUserId), chat.title),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Find existing or create new direct chat between two users
 * GET /api/chats/find-or-create?user1=ID&user2=ID
 */
const findOrCreateChat = async (req, res, next) => {
  try {
    // Extract user IDs from query params
    const user1 = req.query.user1 ? String(req.query.user1).trim() : null;
    const user2 = req.query.user2 ? String(req.query.user2).trim() : null;
    const currentUserId = String(req.user.id);

    console.log('[CHAT] find-or-create request:', { user1, user2, currentUserId });

    // VALIDATION: Check user1 is provided and valid
    if (!isValidUserId(user1)) {
      console.error('[CHAT] Invalid user1 provided:', user1);
      return res.status(400).json({
        message: 'user1 (first user ID) is required and must be a non-empty string',
      });
    }

    // VALIDATION: Check user2 is provided and valid
    if (!isValidUserId(user2)) {
      console.error('[CHAT] Invalid user2 provided:', user2);
      return res.status(400).json({
        message: 'user2 (second user ID) is required and must be a non-empty string',
      });
    }

    // VALIDATION: Ensure users are different
    if (user1 === user2) {
      console.error('[CHAT] Self-chat attempt:', user1);
      return res.status(400).json({
        message: 'Cannot create a chat with the same user',
      });
    }

    // VALIDATION: Ensure current user is one of the two participants
    if (currentUserId !== user1 && currentUserId !== user2) {
      console.error('[CHAT] Authorization violation:', { currentUserId, user1, user2 });
      return res.status(403).json({
        message: 'Forbidden: you can only create chats involving yourself',
      });
    }

    // BUSINESS LOGIC: Find or create the direct chat
    console.log('[CHAT] Finding or creating direct chat between', user1, 'and', user2);
    const chat = await findOrCreateDirectChat(user1, user2);

    if (!chat) {
      console.error('[CHAT] Failed to create/find chat');
      return res.status(500).json({
        message: 'Failed to create or retrieve chat',
      });
    }

    // RESPONSE: Fetch participants and return complete chat object
    const participants = await getChatParticipants(chat.id);

    const response = {
      id: chat.id,
      chatId: chat.id,
      type: chat.type,
      title: chat.title,
      group_image: chat.group_image,
      created_at: chat.created_at,
      participants,
    };

    console.log('[CHAT] Returning chat:', { chatId: chat.id, participantCount: participants.length });
    return res.json(response);
  } catch (error) {
    console.error('[CHAT] find-or-create error:', error.message);
    console.error('[CHAT] Stack:', error.stack);
    return next(error);
  }
};


/**
 * Create a new group chat
 * POST /api/chats
 */
const createNewChat = async (req, res, next) => {
  try {
    const { type = 'direct', title = null, participantIds: rawParticipantIds } = req.body;
    const currentUserId = String(req.user.id);

    console.log('[CHAT] createNewChat request:', { type, title, hasFile: !!req.file });

    // VALIDATION: Check chat type
    if (!type || !['direct', 'group'].includes(type)) {
      return res.status(400).json({
        message: 'Chat type must be "direct" or "group"',
      });
    }

    // Parse and validate participant IDs
    const participantIds = parseParticipantIds(rawParticipantIds);
    const allParticipants = Array.from(
      new Set([currentUserId, ...participantIds.map(String)])
    ).filter(isValidUserId);

    // VALIDATION: Ensure at least 2 participants
    if (allParticipants.length < 2) {
      return res.status(400).json({
        message: 'A chat requires at least 2 participants',
      });
    }

    // BUSINESS LOGIC: Direct chats use find-or-create
    if (type === 'direct') {
      if (allParticipants.length !== 2) {
        return res.status(400).json({
          message: 'Direct chats must have exactly 2 participants',
        });
      }

      const [user1, user2] = allParticipants;
      console.log('[CHAT] Creating/finding direct chat between', user1, 'and', user2);

      const chat = await findOrCreateDirectChat(user1, user2);
      if (!chat) {
        return res.status(500).json({
          message: 'Failed to create or retrieve direct chat',
        });
      }

      const participants = await getChatParticipants(chat.id);
      return res.status(200).json({
        id: chat.id,
        chat_id: chat.id,
        chatId: chat.id,
        type: chat.type,
        title: chat.title,
        group_image: chat.group_image,
        profile_image: chat.group_image || null,
        created_at: chat.created_at,
        updated_at: chat.last_message_time || chat.created_at,
        participants,
        other_user: buildOtherUserPayload(participants.find((participant) => String(participant.id) !== currentUserId), chat.title),
      });
    }

    // BUSINESS LOGIC: Group chats are always created new
    if (type === 'group') {
      if (!title || String(title).trim().length === 0) {
        return res.status(400).json({
          message: 'Group chats must have a title',
        });
      }

      const groupImage = req.file ? `/uploads/${req.file.filename}` : null;

      console.log('[CHAT] Creating new group chat:', { title, participantCount: allParticipants.length });

      const chatId = await createChat(
        { type: 'group', title: String(title).trim(), groupImage },
        allParticipants
      );

      if (!chatId) {
        return res.status(500).json({
          message: 'Failed to create group chat',
        });
      }

      const participants = await getChatParticipants(chatId);

      return res.status(201).json({
        id: chatId,
        chat_id: chatId,
        chatId,
        type: 'group',
        title: String(title).trim(),
        group_image: groupImage,
        profile_image: groupImage,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        participants,
        other_user: null,
      });
    }
  } catch (error) {
    console.error('[CHAT] createNewChat error:', error.message);
    console.error('[CHAT] Stack:', error.stack);
    return next(error);
  }
};

module.exports = {
  listChats,
  getChat,
  findOrCreateChat,
  createNewChat,
};
