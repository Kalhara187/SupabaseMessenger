import React, { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

const SettingsScreen = () => {
  const { logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);

  return (
    <View className="flex-1 bg-ink px-6 py-6">
      <Text className="text-2xl font-bold text-slate-100 mb-4">Settings</Text>

      <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-slate-200">Dark mode</Text>
          <Switch value={darkMode} onValueChange={setDarkMode} />
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-slate-200">Notifications</Text>
          <Switch value={notifications} onValueChange={setNotifications} />
        </View>
      </View>

      <Pressable onPress={logout} className="bg-red-500 py-3 rounded-2xl">
        <Text className="text-white font-semibold text-center">Logout</Text>
      </Pressable>
    </View>
  );
};

export default SettingsScreen;
