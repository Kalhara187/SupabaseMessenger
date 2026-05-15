import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { fetchUsers } from '../services/userService';
import { findOrCreateChat } from '../services/chatService';

const UsersScreen = ({ navigation }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [openingChatId, setOpeningChatId] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const list = await fetchUsers();
      setUsers(list.filter((item) => String(item.id) !== String(currentUser?.id)));
    } catch (error) {
      Alert.alert('Could not load users', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return users;
    }

    return users.filter((item) => {
      const fullName = String(item.full_name || '').toLowerCase();
      const username = String(item.username || '').toLowerCase();
      const email = String(item.email || '').toLowerCase();
      return fullName.includes(search) || username.includes(search) || email.includes(search);
    });
  }, [query, users]);

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

        console.log('[USERS] Chat created/found:', { chatId: chat.id, participants: chat.participants?.length });

        navigation.navigate('Chat', { chat, participant: selectedUser });
      } catch (error) {
        console.error('[USERS] Failed to open chat:', error);
        Alert.alert('Could not open chat', error.response?.data?.message || error.message || 'Please try again.');
      } finally {
        setOpeningChatId(null);
      }
    },
    [currentUser, navigation]
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
        placeholder="Search by name or email"
        placeholderTextColor="#94A3B8"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />

      <FlatList
        className="mt-4"
        data={filteredUsers}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const isOpening = String(openingChatId) === String(item.id);

          return (
            <Pressable
              onPress={() => openChat(item)}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-3"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-slate-100 font-semibold text-base">
                    {item.full_name || item.username || item.email}
                  </Text>
                  <Text className="text-slate-400 mt-1" numberOfLines={1}>
                    {item.email}
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