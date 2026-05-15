import { useEffect } from 'react';
import useChatStore from '../store/chatStore';
import { connectSocket, disconnectSocket } from '../services/socketService';

const useRealtimeSocket = (token) => {
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
    };

    const handleUserOnline = ({ userId }) => {
      useChatStore.getState().setUserOnlineState(userId, true);
    };

    const handleUserOffline = ({ userId }) => {
      useChatStore.getState().setUserOnlineState(userId, false);
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      if (socket) {
        disconnectSocket();
      }
    };
  }, [token]);
};

export default useRealtimeSocket;