import api from './api';

const extractMessagesArray = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.messages)) {
    return payload.messages;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
};

export const fetchChats = async () => {
  const { data } = await api.get('/chats');
  return data;
};

export const findOrCreateChat = async ({ user1, user2 }) => {
  const { data } = await api.get('/chats/find-or-create', {
    params: { user1, user2 },
  });

  return data;
};

export const createChat = async ({ type, participantIds, title, groupImage }) => {
  const formData = new FormData();
  formData.append('type', type);
  formData.append('participantIds', JSON.stringify(participantIds));
  if (title) {
    formData.append('title', title);
  }

  if (groupImage) {
    formData.append('groupImage', {
      uri: groupImage,
      name: `group-${Date.now()}.jpg`,
      type: 'image/jpeg',
    });
  }

  const { data } = await api.post('/chats', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const fetchMessages = async (chatId, page = 0, pageSize = 30) => {
  const { data } = await api.get(`/messages/${chatId}?limit=${pageSize}&offset=${page * pageSize}`);
  const messages = extractMessagesArray(data);

  console.log('[CHAT-SERVICE] fetchMessages response shape:', {
    isArray: Array.isArray(data),
    hasMessages: Array.isArray(data?.messages),
    hasData: Array.isArray(data?.data),
    count: messages.length,
    chatId: String(chatId),
  });

  return messages;
};

export const sendMessage = async ({ chatId, text, messageType = 'text', media }) => {
  const formData = new FormData();
  formData.append('chatId', String(chatId));
  formData.append('message', text || '');
  formData.append('messageType', messageType);

  if (media) {
    formData.append('media', {
      uri: media.uri,
      name: media.name || `media-${Date.now()}.jpg`,
      type: media.type || 'application/octet-stream',
    });
  }

  const { data } = await api.post('/messages', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  console.log('[CHAT-SERVICE] sendMessage response:', {
    chatId: String(chatId),
    id: data?.id ?? data?._id,
    senderId: data?.sender_id,
    hasText: Boolean(data?.message),
  });

  return data;
};

export const markSeen = async (chatId) => {
  const { data } = await api.post('/messages/seen', { chatId });
  return data;
};
