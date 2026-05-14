import React from 'react';
import { View, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = () => {
  const { user } = useAuth();

  return (
    <View className="flex-1 bg-ink px-6 py-6">
      <Text className="text-2xl font-bold text-slate-100 mb-4">Profile</Text>
      <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <Text className="text-slate-200">Name: {user?.full_name}</Text>
        <Text className="text-slate-300 mt-2">Username: @{user?.username}</Text>
        <Text className="text-slate-400 mt-2">Email: {user?.email}</Text>
        <Text className="text-slate-500 mt-2">Bio: {user?.bio || 'No bio yet'}</Text>
      </View>
    </View>
  );
};

export default ProfileScreen;
