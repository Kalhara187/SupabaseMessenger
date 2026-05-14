import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace('Login'), 1200);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View className="flex-1 bg-ink items-center justify-center px-8">
      <Text className="text-4xl font-bold text-brand-500">SQLRealtimeMessenger</Text>
      <Text className="text-slate-300 mt-3 text-center">Encrypted vibes. Instant chats.</Text>
      <ActivityIndicator size="large" color="#1DAA61" className="mt-8" />
    </View>
  );
};

export default SplashScreen;
