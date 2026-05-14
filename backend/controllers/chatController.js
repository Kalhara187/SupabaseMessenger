const { createChat, getUserChats, getChatParticipants } = require('../models/chatModel');

const listChats = async (req, res, next) => {
  try {
    const chats = await getUserChats(req.user.id);
    return res.json(chats);
  } catch (error) {
    return next(error);
  }
};

const createNewChat = async (req, res, next) => {
  try {
    const { type = 'direct', title = null } = req.body;
    const rawParticipantIds = req.body.participantIds;
    const participantIds = Array.isArray(rawParticipantIds)
      ? rawParticipantIds
      : JSON.parse(rawParticipantIds || '[]');
    const mergedParticipants = Array.from(new Set([req.user.id, ...participantIds.map(Number)]));

    if (mergedParticipants.length < 2) {
      return res.status(400).json({ message: 'A chat requires at least 2 participants' });
    }

    const groupImage = req.file ? `/uploads/${req.file.filename}` : null;

    const chatId = await createChat(
      { type, title, groupImage },
      mergedParticipants
    );

    const participants = await getChatParticipants(chatId);

    return res.status(201).json({
      id: chatId,
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
  createNewChat,
};
