import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { GiftedChat, Bubble } from 'react-native-gifted-chat';
import { useAuth } from '../context/AuthContext';
import { getApiHost } from '../services/api';
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

const resolveImageUri = (value) => {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${getApiHost()}${value.startsWith('/') ? '' : '/'}${value}`;
};

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
    markChatRead,
    setTyping,
  } = useChatStore();
  const [loading, setLoading] = useState(false);
  const chatId = String(chat?.id || chat?.chatId || '');
  const typingTimerRef = useRef(null);
  const hasActiveTypingRef = useRef(false);

  const chatParticipant = useMemo(() => {
    if (participant) {
      return participant;
    }

    return chat?.other_user || chat?.other_participant || chat?.participants?.find((item) => String(item.id) !== String(user?.id ?? '')) || null;
  }, [chat?.other_participant, chat?.other_user, chat?.participants, participant, user?.id]);

  const chatDisplayName = chatParticipant?.username || chatParticipant?.name || chatParticipant?.full_name || chat?.display_name || chat?.title || 'Chat';
  const chatAvatarUri = resolveImageUri(chatParticipant?.avatar || chatParticipant?.profile_image || chat?.profile_image || chat?.group_image);
  const chatPresenceLabel = chatParticipant?.is_online
    ? 'Online'
    : chatParticipant?.last_seen
      ? `Last seen ${new Date(chatParticipant.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : 'Offline';

  const messages = useMemo(
    () => {
      const source = Array.isArray(messagesByChat[chatId]) ? messagesByChat[chatId] : [];
      const mapped = source.map(mapToGiftedMessage).reverse();

      return mapped;
    },
    [messagesByChat, chatId]
  );

  const currentUserId = String(user?.id ?? '');
  const typingPartnerId = useChatStore((state) => state.typingByChat[chatId]);
  const isPartnerTyping = Boolean(typingPartnerId && String(typingPartnerId) !== currentUserId);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      if (!chatId) {
        return;
      }

      const fetchedMessages = await fetchMessages(chatId);
      setMessages(chatId, fetchedMessages);

      const socket = getSocket();
      socket?.emit('join_chat', chatId, (result) => {
        if (!result?.ok) {
          console.warn('[CHAT-SCREEN] Could not join chat room', result?.message || 'Unknown error');
        }
      });

      try {
        await markSeen(chatId);
        markChatRead(chatId);
      } catch {
        // ignore seen failures while loading
      }
    } catch (error) {
      console.warn('[CHAT-SCREEN] Could not load messages', error?.message || error);
    } finally {
      setLoading(false);
    }
  }, [chatId, markChatRead, setMessages]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }

      if (hasActiveTypingRef.current) {
        const socket = getSocket();
        socket?.emit('stop_typing', { chatId });
      }
    };
  }, [chatId]);

  const sendTypingState = useCallback(
    (text) => {
      const socket = getSocket();
      if (!socket || !chatId) {
        return;
      }

      const trimmed = String(text || '').trim();

      if (!trimmed) {
        if (hasActiveTypingRef.current) {
          socket.emit('stop_typing', { chatId });
          hasActiveTypingRef.current = false;
        }

        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current);
        }
        return;
      }

      if (!hasActiveTypingRef.current) {
        socket.emit('typing', { chatId });
        hasActiveTypingRef.current = true;
      }

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }

      typingTimerRef.current = setTimeout(() => {
        socket.emit('stop_typing', { chatId });
        hasActiveTypingRef.current = false;
      }, 1200);
    },
    [chatId]
  );

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
      sendTypingState('');
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
    [addMessage, chatId, clearPendingMessage, currentUserId, markMessageStatus, replaceMessageByClientId, sendTypingState, upsertChatPreview, user?.full_name, user?.profile_image, user?.username]
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

  const renderAvatar = useCallback(
    (props) => {
      const avatarUri = resolveImageUri(props?.currentMessage?.user?.avatar);
      const initials = String(props?.currentMessage?.user?.name || 'U').slice(0, 1).toUpperCase();

      return (
        <View style={{ marginHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, overflow: 'hidden', backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' }}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: 30, height: 30 }} />
            ) : (
              <Text style={{ color: '#E2E8F0', fontSize: 12, fontWeight: '700' }}>{initials}</Text>
            )}
          </View>
        </View>
      );
    },
    []
  );

  const renderTime = useCallback(
    (props) => {
      const isOwnMessage = String(props.currentMessage?.user?._id ?? '') === currentUserId;
      const status = props.currentMessage?.status;
      const timeLabel = props.currentMessage?.createdAt
        ? new Date(props.currentMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      const seen = Boolean(props.currentMessage?.seen);
      const statusLabel = status === 'sending'
        ? 'Sending'
        : status === 'failed'
          ? 'Failed'
          : isOwnMessage
            ? seen
              ? 'Read'
              : 'Delivered'
            : '';

      return (
        <View style={{ alignItems: isOwnMessage ? 'flex-end' : 'flex-start', marginTop: 4 }}>
          <Text style={{ color: '#94A3B8', fontSize: 11 }}>
            {isOwnMessage ? `${statusLabel}${timeLabel ? ` · ${timeLabel}` : ''}` : timeLabel}
          </Text>
        </View>
      );
    },
    [currentUserId]
  );

  const renderFooter = useCallback(() => {
    if (!isPartnerTyping) {
      return null;
    }

    const typingName = chatParticipant?.full_name || chatParticipant?.username || 'User';

    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
        <Text style={{ color: '#94A3B8', fontSize: 12 }}>{typingName} is typing...</Text>
      </View>
    );
  }, [chatParticipant?.full_name, chatParticipant?.username, isPartnerTyping]);

  return (
    <View className="flex-1 bg-ink">
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1E293B', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#E2E8F0', fontSize: 18, fontWeight: '700' }}>‹</Text>
        </Pressable>
        <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' }}>
          {chatAvatarUri ? (
            <Image source={{ uri: chatAvatarUri }} style={{ width: 40, height: 40 }} />
          ) : (
            <Text style={{ color: '#E2E8F0', fontWeight: '700' }}>{chatDisplayName.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#E2E8F0', fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
            {chatDisplayName}
          </Text>
          <Text style={{ color: '#94A3B8', fontSize: 12 }} numberOfLines={1}>
            {chatPresenceLabel}
          </Text>
        </View>
      </View>

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
        renderAvatar={renderAvatar}
        renderTime={renderTime}
        renderFooter={renderFooter}
        onInputTextChanged={sendTypingState}
        keyExtractor={(item) => String(item._id)}
        placeholder="Write a message"
        alwaysShowSend
        scrollToBottom
        showUserAvatar
        renderUsernameOnMessage
      />
    </View>
  );
};

export default ChatScreen;
