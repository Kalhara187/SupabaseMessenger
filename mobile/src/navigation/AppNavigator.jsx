import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import useRealtimeSocket from '../hooks/useRealtimeSocket';
import { registerForPushNotifications } from '../services/notificationService';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import UsersScreen from '../screens/UsersScreen';
import GroupManagementScreen from '../screens/GroupManagementScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const tabsOptions = {
  headerStyle: { backgroundColor: '#0F172A' },
  headerTintColor: '#E2E8F0',
  tabBarStyle: { backgroundColor: '#0F172A', borderTopWidth: 0 },
  tabBarActiveTintColor: '#1DAA61',
  tabBarInactiveTintColor: '#94A3B8',
};

const MainTabs = () => (
  <Tab.Navigator screenOptions={tabsOptions}>
    <Tab.Screen name="Chats" component={HomeScreen} />
    <Tab.Screen name="Users" component={UsersScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="HomeTabs" component={MainTabs} options={{ headerShown: false }} />
    <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Conversation' }} />
    <Stack.Screen name="GroupManagement" component={GroupManagementScreen} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { isHydrated, isAuthenticated, token, user } = useAuth();
  useRealtimeSocket(token, user?.id);

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications().catch(() => {});
    }
  }, [isAuthenticated]);

  if (!isHydrated) {
    return (
      <View className="flex-1 bg-ink items-center justify-center">
        <ActivityIndicator size="large" color="#1DAA61" />
        <Text className="text-slate-200 mt-4">Syncing secure session...</Text>
      </View>
    );
  }

  return isAuthenticated ? <AppStack /> : <AuthStack />;
};

export default AppNavigator;
