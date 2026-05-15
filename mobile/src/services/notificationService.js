import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const configureNotificationHandler = (Notifications) => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

export const registerForPushNotifications = async () => {
  const isExpoGo =
    Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

  if (!Device.isDevice || isExpoGo) {
    return null;
  }

  const Notifications = await import('expo-notifications');
  configureNotificationHandler(Notifications);

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1DAA61',
      sound: 'default',
    });
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (error) {
    console.warn('Push token registration skipped:', error?.message || error);
    return null;
  }
};
