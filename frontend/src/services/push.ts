import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { notificationsAPI } from './api';

/** Expo Go (storeClient) cannot do remote push on SDK 53+. */
function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  );
}

let handlerConfigured = false;

async function ensureNotificationHandler() {
  if (handlerConfigured || isExpoGo()) return;
  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerConfigured = true;
}

/**
 * Request permission, obtain Expo push token, and register it with the API.
 * No-ops in Expo Go, web, and simulators (use a development build for real push).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  if (isExpoGo()) {
    // Avoids SDK 53+ Expo Go warnings / unsupported push APIs.
    if (__DEV__) {
      console.log(
        '[push] Skipping remote push in Expo Go. Use a development build to test notifications.'
      );
    }
    return null;
  }
  if (!Device.isDevice) {
    return null;
  }

  try {
    await ensureNotificationHandler();
    const Notifications = await import('expo-notifications');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'HabitApp',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0A72EF',
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') {
      return null;
    }

    const projectId = getProjectId();
    if (!projectId) {
      if (__DEV__) {
        console.warn('[push] Missing EAS projectId — add extra.eas.projectId in app.json');
      }
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;
    if (!token) return null;

    await notificationsAPI.registerPushToken({
      token,
      platform: Platform.OS,
      device_name: Device.modelName || Platform.OS,
    });
    return token;
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] Registration skipped', error);
    }
    return null;
  }
}

/** @deprecated Use registerForPushNotificationsAsync */
export async function registerPushTokenIfAvailable(explicitToken?: string): Promise<boolean> {
  if (explicitToken?.trim()) {
    try {
      await notificationsAPI.registerPushToken({
        token: explicitToken.trim(),
        platform: Platform.OS,
      });
      return true;
    } catch {
      return false;
    }
  }
  const token = await registerForPushNotificationsAsync();
  return Boolean(token);
}
