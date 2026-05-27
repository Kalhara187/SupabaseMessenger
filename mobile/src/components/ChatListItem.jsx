import React from 'react';
import { Image, Pressable, View, Text } from 'react-native';
import { getApiHost } from '../services/api';

const resolveImageUri = (value) => {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${getApiHost()}${value.startsWith('/') ? '' : '/'}${value}`;
};

const ChatListItem = ({ chat, onPress }) => {
  const title = chat.type === 'direct'
    ? chat.other_user?.username || chat.other_user?.name || ''
    : chat.title || 'Group Chat';
  const avatarUri = resolveImageUri(chat.other_user?.avatar || chat.profile_image || chat.group_image);
  const lastMessageTime = chat.last_message_time
    ? new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'now';
  const isDirect = chat.type === 'direct';
  const isOnline = Boolean(chat.other_participant_is_online);
  const presenceLabel = isDirect
    ? isOnline
      ? 'Online'
      : chat.other_participant_last_seen
        ? `Last seen ${new Date(chat.other_participant_last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'Offline'
    : 'Group chat';

  return (
    <Pressable
      onPress={onPress}
      className="bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-800"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 rounded-full bg-slate-800 overflow-hidden items-center justify-center">
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} className="h-12 w-12" resizeMode="cover" />
          ) : (
            <Text className="text-slate-300 font-semibold">{title.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-slate-100 font-semibold text-base" numberOfLines={1}>
              {title}
            </Text>
            <Text className="text-xs text-slate-400">{lastMessageTime}</Text>
          </View>
          <View className="flex-row items-center mt-1">
            <View className={`h-2 w-2 rounded-full mr-2 ${isDirect && isOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            <Text className="text-xs text-slate-400" numberOfLines={1}>
              {presenceLabel}
            </Text>
          </View>
          <View className="flex-row items-center justify-between mt-1">
            <Text className="text-slate-400 flex-1 pr-3" numberOfLines={1}>
              {chat.last_message || 'No messages yet'}
            </Text>
            {Number(chat.unread_count) > 0 ? (
              <View className="bg-brand-500 rounded-full px-2 py-1 min-w-[28px] items-center">
                <Text className="text-white text-xs font-semibold">{chat.unread_count}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default ChatListItem;
