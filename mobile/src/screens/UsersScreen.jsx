import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { fetchUsers } from '../services/userService';
import { findOrCreateChat } from '../services/chatService';
import { getApiHost } from '../services/api';
import useChatStore from '../store/chatStore';

const resolveImageUri = (value) => {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${getApiHost()}${value.startsWith('/') ? '' : '/'}${value}`;
};

const formatLastSeen = (value) => {
  if (!value) {
    return 'Offline';
  }

  const lastSeen = new Date(value);
  if (Number.isNaN(lastSeen.getTime())) {
    return 'Offline';
  }

  const minutesAgo = Math.max(0, Math.floor((Date.now() - lastSeen.getTime()) / 60000));

  if (minutesAgo < 1) {
    return 'Last seen just now';
  }

  if (minutesAgo < 60) {
    return `Last seen ${minutesAgo}m ago`;
  }

  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) {
    return `Last seen ${hoursAgo}h ago`;
  }

  return `Last seen ${lastSeen.toLocaleDateString()}`;
};

const UsersScreen = ({ navigation }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [openingChatId, setOpeningChatId] = useState(null);
  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const upsertChat = useChatStore((state) => state.upsertChat);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const list = await fetchUsers(query.trim());
      setUsers(list.filter((item) => String(item.id) !== String(currentUser?.id)));
    } catch (error) {
      Alert.alert('Could not load users', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadUsers]);

  const openChat = useCallback(
    async (selectedUser) => {
      try {
        // Validation: ensure both IDs exist
        if (!currentUser?.id) {
          console.error('[USERS] currentUser.id missing:', currentUser);
          Alert.alert('Error', 'Not authenticated. Please log in again.');
          return;
        }

        if (!selectedUser?.id) {
          console.error('[USERS] selectedUser.id missing:', selectedUser);
          Alert.alert('Error', 'Invalid user selection.');
          return;
        }

        const user1Id = String(currentUser.id);
        const user2Id = String(selectedUser.id);

        if (user1Id === user2Id) {
          Alert.alert('Error', 'Cannot start a chat with yourself.');
          return;
        }

        console.log('[USERS] Opening chat with validation passed:', { user1: user1Id, user2: user2Id });

        setOpeningChatId(selectedUser.id);
        const chat = await findOrCreateChat({ user1: user1Id, user2: user2Id });

        if (chat) {
          upsertChat({
            ...chat,
            other_participant: chat.other_participant || selectedUser,
            display_name: selectedUser.full_name || selectedUser.username || selectedUser.email,
            profile_image: selectedUser.profile_image || chat.profile_image || null,
          });
        }

        console.log('[USERS] Chat created/found:', { chatId: chat.id, participants: chat.participants?.length });

        navigation.navigate('Chat', { chat, participant: selectedUser });
      } catch (error) {
        console.error('[USERS] Failed to open chat:', error);
        Alert.alert('Could not open chat', error.response?.data?.message || error.message || 'Please try again.');
      } finally {
        setOpeningChatId(null);
      }
    },
    [currentUser, navigation, upsertChat]
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
      <Text className="text-2xl text-slate-100 font-bold mb-3">Start a chat</Text>
      <TextInput
        className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-slate-100"
        placeholder="Search by name or username"
        placeholderTextColor="#94A3B8"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />

      <FlatList
        className="mt-4"
        data={users}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const isOpening = String(openingChatId) === String(item.id);
          const isOnline = Boolean(item.is_online || onlineUsers[String(item.id)]);
          const avatarUri = resolveImageUri(item.profile_image);

          return (
            <Pressable
              onPress={() => openChat(item)}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-3"
            >
              <View className="flex-row items-center">
                <View className="h-14 w-14 rounded-full overflow-hidden bg-slate-800 items-center justify-center mr-3">
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} className="h-14 w-14" resizeMode="cover" />
                  ) : (
                    <Text className="text-slate-200 font-semibold text-lg">
                      {(item.full_name || item.username || '?').slice(0, 1).toUpperCase()}
                    </Text>
                  )}
                </View>

                <View className="flex-1 pr-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-slate-100 font-semibold text-base" numberOfLines={1}>
                      {item.full_name || item.username || item.email}
                    </Text>
                    <View className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  </View>
                  <Text className="text-slate-400 mt-1" numberOfLines={1}>
                    @{item.username}
                  </Text>
                  <Text className="text-slate-500 mt-1 text-xs" numberOfLines={1}>
                    {isOnline ? 'Online now' : formatLastSeen(item.last_seen)}
                  </Text>
                </View>

                <Text className="text-xs text-brand-500 font-semibold">
                  {isOpening ? 'Opening...' : 'Chat'}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text className="text-slate-400 mt-4 text-center">No users found</Text>}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default UsersScreen;