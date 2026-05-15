import { create } from 'zustand';

const getMessageId = (message) => String(message?.id ?? message?._id ?? '');

const getMessageTimestamp = (message) => {
  const raw = message?.created_at ?? message?.createdAt;
  const date = raw ? new Date(raw) : null;
  return Number.isNaN(date?.getTime()) ? 0 : date.getTime();
};

const mergeMessages = (existing = [], incoming = []) => {
  const map = new Map();

  [...existing, ...incoming].forEach((message) => {
    if (!message || typeof message !== 'object') {
      return;
    }

    const id = getMessageId(message);
    if (!id) {
      return;
    }

    map.set(id, message);
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
        chat.id === chatId
          ? { ...chat, last_message: lastMessage.message, last_message_time: lastMessage.created_at }
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
