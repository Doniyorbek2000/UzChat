import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { pushApi } from "../api/push";
import { Conversation } from "../types";
import { isConversationUnread } from "./conversation";

export interface MessageNotificationData {
  conversationId?: string;
  messageId?: string;
  type?: string;
  userId?: string;
}

let activeConversationId: string | null = null;
let registeredToken: string | null = null;

/** Marks the conversation currently open on screen so its push notifications are suppressed. */
export function setActiveConversationId(conversationId: string | null) {
  activeConversationId = conversationId;
}

/** Returns the conversation currently open on screen, if any. */
export function getActiveConversationId(): string | null {
  return activeConversationId;
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as MessageNotificationData;
    const isActiveChat = !!data?.conversationId && data.conversationId === activeConversationId;
    return {
      shouldShowBanner: !isActiveChat,
      shouldShowList: !isActiveChat,
      shouldPlaySound: !isActiveChat,
      shouldSetBadge: false,
    };
  },
});

/** Requests notification permissions and registers the device's Expo push token with the backend. */
export async function registerForPushNotificationsAsync(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    registeredToken = token;
    await pushApi.registerToken(token);
  } catch {
    // requires extra.eas.projectId in app.json (EAS project); safe to skip otherwise
  }
}

/** Removes the device's push token from the backend, e.g. on logout. */
export async function unregisterPushNotificationsAsync(): Promise<void> {
  if (!registeredToken) return;
  try {
    await pushApi.unregisterToken(registeredToken);
  } catch {
    // best-effort cleanup
  } finally {
    registeredToken = null;
  }
}

/** Sets the app icon badge to the number of unread conversations. */
export async function updateAppBadgeCount(conversations: Conversation[], userId: string, includeMutedInBadge = true): Promise<void> {
  const count = conversations.filter((c) => isConversationUnread(c, userId, !includeMutedInBadge)).length;
  await Notifications.setBadgeCountAsync(count).catch(() => {});
}

/** Clears the app icon badge, e.g. on logout. */
export async function clearAppBadgeCount(): Promise<void> {
  await Notifications.setBadgeCountAsync(0).catch(() => {});
}

/** Fires an immediate local notification so the user can preview their current sound/vibration settings. */
export async function sendTestNotification(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return false;

  await Notifications.scheduleNotificationAsync({
    content: { title: "UzChat", body: "Bu sinov bildirishnomasi", sound: true },
    trigger: null,
  });
  return true;
}
