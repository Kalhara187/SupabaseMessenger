const {
  createChat,
  getUserChats,
  getChatById,
  getChatParticipants,
  findOrCreateDirectChat,
} = require('../models/chatModel');

const parseParticipantIds = (rawParticipantIds) => {
  if (Array.isArray(rawParticipantIds)) {
    return rawParticipantIds;
  }

  if (typeof rawParticipantIds === 'string') {
    return JSON.parse(rawParticipantIds || '[]');
  }

  return [];
};

const serializeChat = async (chatId) => {
  const chat = await getChatById(chatId);
  if (!chat) {
    return null;
  }

  const participants = await getChatParticipants(chatId);
  return {
    ...chat,
    chatId: chat.id,
    participants,
  };
};

const listChats = async (req, res, next) => {
  try {
    const chats = await getUserChats(req.user.id);
    const enriched = await Promise.all(
      chats.map(async (chat) => {
        const participants = await getChatParticipants(chat.id);
        const otherParticipant = participants.find((participant) => participant.id !== req.user.id);

        return {
          ...chat,
          chatId: chat.id,
          participants,
          display_name:
            chat.type === 'direct'
              ? otherParticipant?.full_name || otherParticipant?.username || chat.title || `Chat ${chat.id}`
              : chat.title || `Chat ${chat.id}`,
        };
      })
    );

    return res.json(enriched);
  } catch (error) {
    return next(error);
  }
};

const findOrCreateChat = async (req, res, next) => {
  try {
    const user1 = Number(req.query.user1 || req.user.id);
    const user2 = Number(req.query.user2);

    if (!Number.isInteger(user1) || !Number.isInteger(user2)) {
      return res.status(400).json({ message: 'Both user1 and user2 are required' });
    }

    if (user1 === user2) {
      return res.status(400).json({ message: 'A chat requires two different users' });
    }

    if (req.user.id !== user1 && req.user.id !== user2) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const chat = await findOrCreateDirectChat(user1, user2);
    if (!chat) {
      return res.status(500).json({ message: 'Unable to create chat' });
    }

    const participants = await getChatParticipants(chat.id);

    return res.json({
      ...chat,
      chatId: chat.id,
      participants,
    });
  } catch (error) {
    return next(error);
  }
};

const createNewChat = async (req, res, next) => {
  try {
    const { type = 'direct', title = null } = req.body;
    const participantIds = parseParticipantIds(req.body.participantIds);
    const mergedParticipants = Array.from(new Set([req.user.id, ...participantIds.map(Number)]));

    if (mergedParticipants.length < 2) {
      return res.status(400).json({ message: 'A chat requires at least 2 participants' });
    }

    if (type === 'direct') {
      const chat = await findOrCreateDirectChat(mergedParticipants[0], mergedParticipants[1]);
      if (!chat) {
        return res.status(500).json({ message: 'Unable to create chat' });
      }

      const participants = await getChatParticipants(chat.id);
      return res.status(mergedParticipants.length === 2 ? 200 : 201).json({
        ...chat,
        chatId: chat.id,
        participants,
      });
    }

    const groupImage = req.file ? `/uploads/${req.file.filename}` : null;

    const chatId = await createChat(
      { type, title, groupImage },
      mergedParticipants
    );

    const participants = await getChatParticipants(chatId);

    return res.status(201).json({
      id: chatId,
      chatId,
      type,
      title,
      group_image: groupImage,
      participants,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listChats,
  findOrCreateChat,
  createNewChat,
};
