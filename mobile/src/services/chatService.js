import api from './api';

const pendingMessageQueue = new Map();

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

const performSendMessage = async ({ chatId, text, messageType = 'text', media, clientMessageId }) => {
  if (!media) {
    const { data } = await api.post('/messages', {
      chatId: String(chatId),
      message: text || '',
      messageType,
      clientMessageId,
    });

    console.log('[CHAT-SERVICE] sendMessage response:', {
      chatId: String(chatId),
      id: data?.message?.id ?? data?.id ?? data?._id,
      senderId: data?.message?.sender_id ?? data?.sender_id,
      hasText: Boolean(data?.message?.message ?? data?.message ?? data?.text),
    });

    return data?.message && typeof data.message === 'object' ? data.message : data;
  }

  const formData = new FormData();
  formData.append('chatId', String(chatId));
  formData.append('message', text || '');
  formData.append('messageType', messageType);
  formData.append('clientMessageId', clientMessageId || '');

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
    id: data?.message?.id ?? data?.id ?? data?._id,
    senderId: data?.message?.sender_id ?? data?.sender_id,
    hasText: Boolean(data?.message?.message ?? data?.message ?? data?.text),
  });

  return data?.message && typeof data.message === 'object' ? data.message : data;
};

export const sendMessage = async (payload) => {
  return performSendMessage(payload);
};

export const queuePendingMessage = (payload) => {
  if (!payload?.clientMessageId) {
    return;
  }

  pendingMessageQueue.set(String(payload.clientMessageId), payload);
};

export const clearPendingMessage = (clientMessageId) => {
  if (!clientMessageId) {
    return;
  }

  pendingMessageQueue.delete(String(clientMessageId));
};

export const retryPendingMessages = async () => {
  const pendingMessages = Array.from(pendingMessageQueue.values());

  for (const pending of pendingMessages) {
    try {
      const created = await performSendMessage(pending);
      pendingMessageQueue.delete(String(pending.clientMessageId));
      pending.onSuccess?.(created, pending);
    } catch (error) {
      pending.onFailure?.(error, pending);
    }
  }
};

export const markSeen = async (chatId) => {
  const { data } = await api.post('/messages/seen', { chatId });
  return data;
};
