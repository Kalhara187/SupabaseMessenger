import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GiftedChat, Bubble } from 'react-native-gifted-chat';
import { useAuth } from '../context/AuthContext';
import useChatStore from '../store/chatStore';
import {
  clearPendingMessage,
  fetchMessages,
  markSeen,
  queuePendingMessage,
  sendMessage,
} from '../services/chatService';
import { getSocket } from '../services/socketService';

const mapToGiftedMessage = (item) => ({
  _id: String(item.id ?? item._id ?? ''),
  text: item.message || '',
  createdAt: item.created_at ? new Date(item.created_at) : new Date(),
  user: {
    _id: String(item.sender_id ?? ''),
    name: item.sender_name || item.sender_username || 'User',
    avatar: item.sender_image || undefined,
  },
  status: item.status || 'sent',
  clientMessageId: item.client_message_id || item.clientMessageId || null,
});

const ChatScreen = ({ route, navigation }) => {
  const { chat, participant } = route.params;
  const { user } = useAuth();
  const {
    messagesByChat,
    setMessages,
    addMessage,
    replaceMessageByClientId,
    upsertChatPreview,
    markMessageStatus,
  } = useChatStore();
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

  const currentUserId = String(user?.id ?? '');

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      if (!chatId) {
        return;
      }

      const fetchedMessages = await fetchMessages(chatId);
      setMessages(chatId, fetchedMessages);

      const socket = getSocket();
      socket?.emit('join_chat', chatId);

      try {
        await markSeen(chatId);
      } catch {
        // ignore seen failures while loading
      }
    } catch (error) {
      console.warn('[CHAT-SCREEN] Could not load messages', error?.message || error);
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

      const clientMessageId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const optimisticMessage = {
        _id: clientMessageId,
        text: first.text.trim(),
        created_at: new Date().toISOString(),
        createdAt: new Date(),
        client_message_id: clientMessageId,
        status: 'sending',
        user: {
          _id: currentUserId,
          name: user?.full_name || user?.username || 'Me',
          avatar: user?.profile_image || undefined,
        },
      };

      const handlePendingSuccess = (created, pending) => {
        clearPendingMessage(pending.clientMessageId);
        replaceMessageByClientId(pending.chatId, pending.clientMessageId, { ...created, status: 'sent' });
        upsertChatPreview(pending.chatId, created);
      };

      const handlePendingFailure = () => {
        markMessageStatus(chatId, clientMessageId, 'failed');
      };

      addMessage(chatId, optimisticMessage);
      queuePendingMessage({
        chatId,
        text: optimisticMessage.text,
        messageType: 'text',
        clientMessageId,
        onSuccess: handlePendingSuccess,
        onFailure: handlePendingFailure,
      });

      try {
        const created = await sendMessage({
          chatId,
          text: optimisticMessage.text,
          messageType: 'text',
          clientMessageId,
        });

        if (created?.id || created?._id) {
          handlePendingSuccess(created, { chatId, clientMessageId });
        }
      } catch (error) {
        handlePendingFailure();
      }
    },
    [addMessage, chatId, clearPendingMessage, currentUserId, markMessageStatus, replaceMessageByClientId, upsertChatPreview, user?.full_name, user?.profile_image, user?.username]
  );

  const renderBubble = useCallback(
    (props) => {
      const isFailed = props?.currentMessage?.status === 'failed';

      return (
        <Bubble
          {...props}
          wrapperStyle={{
            right: { backgroundColor: isFailed ? '#7F1D1D' : '#1DAA61' },
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

  const renderTime = useCallback(
    (props) => {
      const isOwnMessage = String(props.currentMessage?.user?._id ?? '') === currentUserId;
      const status = props.currentMessage?.status;
      const timeLabel = props.currentMessage?.createdAt
        ? new Date(props.currentMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      const statusLabel = status === 'sending' ? 'Sending…' : status === 'failed' ? 'Failed' : 'Sent';

      return (
        <View style={{ alignItems: isOwnMessage ? 'flex-end' : 'flex-start', marginTop: 4 }}>
          <Text style={{ color: '#94A3B8', fontSize: 11 }}>
            {isOwnMessage ? `${statusLabel} · ${timeLabel}` : timeLabel}
          </Text>
        </View>
      );
    },
    [currentUserId]
  );

  return (
    <View className="flex-1 bg-ink">
      {loading && messages.length === 0 ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <ActivityIndicator size="large" color="#1DAA61" />
        </View>
      ) : null}
      <GiftedChat
        messages={messages}
        onSend={(newMessages) => onSend(newMessages)}
        user={{ _id: currentUserId }}
        isLoadingEarlier={loading}
        renderBubble={renderBubble}
        renderTime={renderTime}
        keyExtractor={(item) => String(item._id)}
        placeholder="Write a message"
        alwaysShowSend
        scrollToBottom
      />
    </View>
  );
};

export default ChatScreen;
