import React, { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { createChat } from '../services/chatService';

const GroupManagementScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [participantIds, setParticipantIds] = useState('');
  const [loading, setLoading] = useState(false);

  const onCreate = async () => {
    try {
      setLoading(true);
      const parsedIds = participantIds
        .split(',')
        .map((value) => Number(value.trim()))
        .filter(Boolean);

      await createChat({
        type: 'group',
        title,
        participantIds: parsedIds,
      });

      Alert.alert('Success', 'Group created successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-ink px-6 py-6">
      <Text className="text-2xl font-bold text-slate-100 mb-6">Create Group</Text>

      <TextInput
        className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-slate-100 mb-4"
        placeholder="Group title"
        placeholderTextColor="#94A3B8"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-slate-100 mb-4"
        placeholder="Participant IDs e.g. 2,3,5"
        placeholderTextColor="#94A3B8"
        value={participantIds}
        onChangeText={setParticipantIds}
      />

      <Pressable onPress={onCreate} className="bg-brand-500 rounded-2xl py-4" disabled={loading}>
        <Text className="text-white text-center font-semibold">{loading ? 'Creating...' : 'Create group'}</Text>
      </Pressable>
    </View>
  );
};

export default GroupManagementScreen;
