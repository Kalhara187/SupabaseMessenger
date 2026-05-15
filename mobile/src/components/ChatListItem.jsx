import React from 'react';
import { Pressable, View, Text } from 'react-native';

const ChatListItem = ({ chat, onPress }) => {
  const title = chat.display_name || chat.title || (chat.type === 'group' ? 'Group Chat' : `Chat #${chat.id}`);

  return (
    <Pressable
      onPress={onPress}
      className="bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-800"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-slate-100 font-semibold text-base">{title}</Text>
        <Text className="text-xs text-slate-400">
          {chat.last_message_time ? new Date(chat.last_message_time).toLocaleTimeString() : 'now'}
        </Text>
      </View>
      <Text className="text-slate-400 mt-2" numberOfLines={1}>
        {chat.last_message || 'Start the conversation'}
      </Text>
      {Number(chat.unread_count) > 0 ? (
        <View className="self-end mt-2 bg-brand-500 rounded-full px-3 py-1">
          <Text className="text-white text-xs">{chat.unread_count} unread</Text>
        </View>
      ) : null}
    </Pressable>
  );
};

export default ChatListItem;
