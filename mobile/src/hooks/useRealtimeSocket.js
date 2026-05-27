import { useEffect } from 'react';
import useChatStore from '../store/chatStore';
import { connectSocket, disconnectSocket } from '../services/socketService';

const useRealtimeSocket = (token, currentUserId = null) => {
  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return undefined;
    }

    const socket = connectSocket(token);
    const handleReceiveMessage = (message) => {
      const chatId = message.chat_id ?? message.chatId;
      if (!chatId) {
        return;
      }

      const chatStore = useChatStore.getState();
      chatStore.addMessage(chatId, message);
      chatStore.upsertChatPreview(chatId, message);

      if (currentUserId && String(message.sender_id ?? message.senderId ?? '') !== String(currentUserId)) {
        chatStore.incrementUnreadCount(chatId);
      }
    };

    const handleUserOnline = ({ userId }) => {
      useChatStore.getState().setUserOnlineState(userId, true);
    };

    const handleUserOffline = ({ userId }) => {
      useChatStore.getState().setUserOnlineState(userId, false);
    };

    const handleTyping = ({ chatId, userId }) => {
      useChatStore.getState().setTyping(chatId, userId, true);
    };

    const handleStopTyping = ({ chatId, userId }) => {
      const state = useChatStore.getState();
      if (String(state.typingByChat[String(chatId)] ?? '') === String(userId)) {
        state.setTyping(chatId, userId, false);
      }
    };

    const handleMessageSeen = ({ chatId, userId }) => {
      const state = useChatStore.getState();
      if (currentUserId && String(userId) !== String(currentUserId)) {
        state.markMessagesSeenByUser(chatId, currentUserId);
      }
      state.markChatRead(chatId);
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('message_seen', handleMessageSeen);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('message_seen', handleMessageSeen);
      if (socket) {
        disconnectSocket();
      }
    };
  }, [currentUserId, token]);
};

export default useRealtimeSocket;