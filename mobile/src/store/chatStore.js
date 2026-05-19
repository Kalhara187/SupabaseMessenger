import { create } from 'zustand';

const getMessageId = (message) => String(message?.id ?? message?._id ?? '');

const getClientMessageId = (message) => String(message?.client_message_id ?? message?.clientMessageId ?? '');

const getMessageTimestamp = (message) => {
  const raw = message?.created_at ?? message?.createdAt;
  const date = raw ? new Date(raw) : null;
  return Number.isNaN(date?.getTime()) ? 0 : date.getTime();
};

const getMessageKey = (message) => {
  const serverId = getMessageId(message);
  if (serverId) {
    return `id:${serverId}`;
  }

  const clientId = getClientMessageId(message);
  if (clientId) {
    return `client:${clientId}`;
  }

  return '';
};

const mergeMessages = (existing = [], incoming = []) => {
  const map = new Map();

  [...existing, ...incoming].forEach((message) => {
    if (!message || typeof message !== 'object') {
      return;
    }

    const key = getMessageKey(message);
    if (!key) {
      return;
    }

    const clientId = getClientMessageId(message);
    if (clientId) {
      map.delete(`client:${clientId}`);
    }

    map.set(key, message);
  });

  return Array.from(map.values()).sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
};

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

const useChatStore = create((set) => ({
  chats: [],
  messagesByChat: {},
  onlineUsers: {},
  typingByChat: {},
  setChats: (chats) => set({ chats }),
  upsertChatPreview: (chatId, lastMessage) =>
    set((state) => ({
      chats: state.chats.map((chat) =>
        String(chat.id) === String(chatId)
          ? {
              ...chat,
              last_message: lastMessage.message,
              last_message_time: lastMessage.created_at ?? lastMessage.createdAt,
            }
          : chat
      ),
    })),
  setMessages: (chatId, messagesPayload) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [String(chatId)]: mergeMessages(
          state.messagesByChat[String(chatId)] || [],
          extractMessagesArray(messagesPayload)
        ),
      },
    })),
  addMessage: (chatId, message) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [String(chatId)]: mergeMessages(state.messagesByChat[String(chatId)] || [], [message]),
      },
    })),
  replaceMessageByClientId: (chatId, clientMessageId, nextMessage) =>
    set((state) => {
      const key = String(chatId);
      const currentMessages = state.messagesByChat[key] || [];
      const nextMessages = currentMessages.map((message) => {
        const matchesClient = getClientMessageId(message) === String(clientMessageId);
        const matchesServer = String(message?.id ?? message?._id ?? '') === String(nextMessage?.id ?? nextMessage?._id ?? '');

        if (!matchesClient && !matchesServer) {
          return message;
        }

        return nextMessage;
      });

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [key]: mergeMessages(nextMessages, [nextMessage]),
        },
      };
    }),
  markMessageStatus: (chatId, messageId, status) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [String(chatId)]: (state.messagesByChat[String(chatId)] || []).map((message) =>
          String(message?.id ?? message?._id ?? '') === String(messageId) || getClientMessageId(message) === String(messageId)
            ? { ...message, status }
            : message
        ),
      },
    })),
  setUserOnlineState: (userId, online) =>
    set((state) => ({
      onlineUsers: { ...state.onlineUsers, [userId]: online },
    })),
  setTyping: (chatId, userId, typing) =>
    set((state) => ({
      typingByChat: {
        ...state.typingByChat,
        [chatId]: typing ? userId : null,
      },
    })),
}));

export default useChatStore;
