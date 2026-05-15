import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
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

const ChatScreen = ({ route, navigation }) => {
  const { chat, participant } = route.params;
  const { user } = useAuth();
  const { messagesByChat, setMessages } = useChatStore();
  const [loading, setLoading] = useState(false);
  const chatId = chat?.id || chat?.chatId;

  useLayoutEffect(() => {
    const title = chat?.title || participant?.full_name || participant?.username || 'Conversation';
    navigation.setOptions({ title });
  }, [chat?.title, navigation, participant?.full_name, participant?.username]);

  const messages = useMemo(
    () => (messagesByChat[chatId] || []).map(mapToGiftedMessage).reverse(),
    [messagesByChat, chatId]
  );

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchMessages(chatId);
      setMessages(chatId, data);

      const socket = getSocket();
      socket?.emit('join_chat', chatId);
    } catch (error) {
      Alert.alert('Could not load messages', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [chatId, setMessages]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const onSend = useCallback(
    async (newMessages = []) => {
      const [first] = newMessages;
      try {
        await sendMessage({
          chatId,
          text: first.text,
          messageType: 'text',
        });
      } catch (error) {
        Alert.alert('Send failed', 'Message could not be sent.');
      }
    },
    [chatId]
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
