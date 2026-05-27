import React, { useMemo, useState } from 'react';
import { FlatList, TextInput, Text, View } from 'react-native';
import useChatStore from '../store/chatStore';

const SearchScreen = () => {
  const { chats } = useChatStore();
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => chats.filter((chat) => {
      const label = String(chat.other_user?.username || chat.other_user?.name || chat.display_name || chat.title || '').toLowerCase();
      return label.includes(query.toLowerCase());
    }),
    [chats, query]
  );

  return (
    <View className="flex-1 bg-ink px-6 py-6">
      <TextInput
        className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-slate-100"
        placeholder="Search chats, users, groups"
        placeholderTextColor="#94A3B8"
        value={query}
        onChangeText={setQuery}
      />

      <FlatList
        className="mt-4"
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-2">
            <Text className="text-slate-100">{item.other_user?.username || item.other_user?.name || item.display_name || item.title || 'Chat'}</Text>
            <Text className="text-slate-400 mt-1" numberOfLines={1}>{item.last_message || 'No messages yet'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text className="text-slate-400 mt-4">No results</Text>}
      />
    </View>
  );
};

export default SearchScreen;
