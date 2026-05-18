import 'react-native-gesture-handler';
import React from 'react';
import './global.css';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProviderWrapper } from './src/context/AuthContext';

// Global error handling to avoid app crash on unexpected errors
if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
  const defaultHandler = ErrorUtils.getGlobalHandler && ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[GLOBAL ERROR]', error, 'isFatal:', isFatal);
    if (defaultHandler) defaultHandler(error, isFatal);
  });
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProviderWrapper>
        <NavigationContainer>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </AuthProviderWrapper>
    </GestureHandlerRootView>
  );
}
