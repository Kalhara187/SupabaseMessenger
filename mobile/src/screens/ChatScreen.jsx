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
  createdAt: item.created_at ? new Date(item.created_at) : new Date(),
  user: {
    _id: item.sender_id,
    name: item.sender_name || item.sender_username || 'User',
    avatar: item.sender_image || undefined,
  },
});

const ChatScreen = ({ route, navigation }) => {
  const { chat, participant } = route.params;
  const { user } = useAuth();
  const { messagesByChat, setMessages, addMessage, upsertChatPreview } = useChatStore();
  const [loading, setLoading] = useState(false);
  const chatId = String(chat?.id || chat?.chatId || '');

  useLayoutEffect(() => {
    const title = chat?.title || participant?.full_name || participant?.username || 'Conversation';
    navigation.setOptions({ title });
  }, [chat?.title, navigation, participant?.full_name, participant?.username]);

  const messages = useMemo(
    () => {
      const source = Array.isArray(messagesByChat[chatId]) ? messagesByChat[chatId] : [];
      const mapped = source.map(mapToGiftedMessage).reverse();

      return mapped;
    },
    [messagesByChat, chatId]
  );

  useEffect(() => {
    console.log('[CHAT-SCREEN] messages state updated:', {
      chatId,
      storeCount: Array.isArray(messagesByChat[chatId]) ? messagesByChat[chatId].length : 0,
      giftedCount: messages.length,
      firstId: messages[0]?._id,
    });
  }, [chatId, messages, messagesByChat]);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      if (!chatId) {
        return;
      }

      const fetchedMessages = await fetchMessages(chatId);
      console.log('[CHAT-SCREEN] fetched messages:', {
        chatId,
        count: fetchedMessages.length,
        sampleId: fetchedMessages[0]?.id,
      });
      setMessages(chatId, fetchedMessages);

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
      if (!first?.text?.trim()) {
        return;
      }

      try {
        const created = await sendMessage({
          chatId,
          text: first.text,
          messageType: 'text',
        });

        if (created?.id || created?._id) {
          addMessage(chatId, created);
          upsertChatPreview(chatId, created);
          console.log('[CHAT-SCREEN] appended created message:', {
            chatId,
            id: created.id ?? created._id,
          });
        }
      } catch (error) {
        Alert.alert('Send failed', 'Message could not be sent.');
      }
    },
    [addMessage, chatId, upsertChatPreview]
  );

  const renderBubble = useCallback(
    (props) => {
      if (props?.currentMessage?._id) {
        console.log('[CHAT-SCREEN] renderItem message:', {
          id: props.currentMessage._id,
          chatId,
          text: props.currentMessage.text,
        });
      }

      return (
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
      );
    },
    [chatId]
  );

  return (
    <View className="flex-1 bg-ink">
      <GiftedChat
        messages={messages}
        onSend={(newMessages) => onSend(newMessages)}
        user={{ _id: String(user.id) }}
        isLoadingEarlier={loading}
        renderBubble={renderBubble}
        keyExtractor={(item) => String(item._id)}
        placeholder="Write a message"
      />
    </View>
  );
};

export default ChatScreen;
