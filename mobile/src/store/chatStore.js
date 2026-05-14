import { create } from 'zustand';

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
  setMessages: (chatId, messages) =>
    set((state) => ({
      messagesByChat: { ...state.messagesByChat, [chatId]: messages },
    })),
  addMessage: (chatId, message) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: [...(state.messagesByChat[chatId] || []), message],
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
