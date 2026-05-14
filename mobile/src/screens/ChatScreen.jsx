import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { GiftedChat, Bubble } from 'react-native-gifted-chat';
import { useAuth } from '../context/AuthContext';
import useChatStore from '../store/chatStore';
import { fetchMessages, sendMessage } from '../services/chatService';
import { getSocket } from '../services/socketService';

const mapToGiftedMessage = (item) => ({
  _id: item.id,
  text: item.message || '',
  createdAt: item.created_at,
  user: {
    _id: item.sender_id,
    name: item.sender_name || item.sender_username || 'User',
    avatar: item.sender_image || undefined,
  },
});

const ChatScreen = ({ route }) => {
  const { chat } = route.params;
  const { user } = useAuth();
  const { messagesByChat, setMessages } = useChatStore();
  const [loading, setLoading] = useState(false);

  const messages = useMemo(
    () => (messagesByChat[chat.id] || []).map(mapToGiftedMessage).reverse(),
    [messagesByChat, chat.id]
  );

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchMessages(chat.id);
      setMessages(chat.id, data);

      const socket = getSocket();
      socket?.emit('join_chat', chat.id);
    } catch (error) {
      Alert.alert('Could not load messages', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [chat.id, setMessages]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const onSend = useCallback(
    async (newMessages = []) => {
      const [first] = newMessages;
      try {
        await sendMessage({
          chatId: chat.id,
          text: first.text,
          messageType: 'text',
        });
      } catch (error) {
        Alert.alert('Send failed', 'Message could not be sent.');
      }
    },
    [chat.id]
  );

  return (
    <View className="flex-1 bg-ink">
      <GiftedChat
        messages={messages}
        onSend={(newMessages) => onSend(newMessages)}
        user={{ _id: user.id }}
        isLoadingEarlier={loading}
        renderBubble={(props) => (
          <Bubble
            {...props}
            wrapperStyle={{
              right: { backgroundColor: '#1DAA61' },
              left: { backgroundColor: '#334155' },
            }}
            textStyle={{
              right: { color: '#FFFFFF' },
              left: { color: '#F8FAFC' },
            }}
          />
        )}
        placeholder="Write a message"
      />
    </View>
  );
};

export default ChatScreen;
