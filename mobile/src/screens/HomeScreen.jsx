import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ChatListItem from '../components/ChatListItem';
import { fetchChats } from '../services/chatService';
import useChatStore from '../store/chatStore';

const HomeScreen = ({ navigation }) => {
  const { chats, setChats } = useChatStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadChats = useCallback(async () => {
    try {
      const list = await fetchChats();
      setChats(list);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setChats]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [loadChats])
  );

  if (loading) {
    return (
      <View className="flex-1 bg-ink items-center justify-center">
        <ActivityIndicator size="large" color="#1DAA61" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ink px-4 pt-4">
      <FlatList
        data={chats}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ChatListItem
            chat={item}
            onPress={() => navigation.navigate('Chat', { chat: item, participant: item.other_participant || null })}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadChats();
            }}
            tintColor="#1DAA61"
          />
        }
        ListEmptyComponent={
          <Text className="text-slate-300 text-center mt-10">No chats yet. Start a chat from the Users page.</Text>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default HomeScreen;
