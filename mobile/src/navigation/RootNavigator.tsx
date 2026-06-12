import { useEffect } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import { RootStackParamList } from "./types";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { ChatRoomScreen } from "../screens/chats/ChatRoomScreen";
import { NewChatScreen } from "../screens/chats/NewChatScreen";
import { NewGroupScreen } from "../screens/chats/NewGroupScreen";
import { GroupInfoScreen } from "../screens/chats/GroupInfoScreen";
import { AddGroupMemberScreen } from "../screens/chats/AddGroupMemberScreen";
import { JoinGroupScreen } from "../screens/chats/JoinGroupScreen";
import { JoinRequestsScreen } from "../screens/chats/JoinRequestsScreen";
import { ForwardMessageScreen } from "../screens/chats/ForwardMessageScreen";
import { ShareContactScreen } from "../screens/chats/ShareContactScreen";
import { SharedMediaScreen } from "../screens/chats/SharedMediaScreen";
import { ScheduledMessagesScreen } from "../screens/chats/ScheduledMessagesScreen";
import { PinnedMessagesScreen } from "../screens/chats/PinnedMessagesScreen";
import { StarredMessagesScreen } from "../screens/chats/StarredMessagesScreen";
import { ArchivedChatsScreen } from "../screens/chats/ArchivedChatsScreen";
import { ChatFoldersScreen } from "../screens/chats/ChatFoldersScreen";
import { EditChatFolderScreen } from "../screens/chats/EditChatFolderScreen";
import { ChatWallpaperScreen } from "../screens/chats/ChatWallpaperScreen";
import { BlockedUsersScreen } from "../screens/contacts/BlockedUsersScreen";
import { AddContactScreen } from "../screens/contacts/AddContactScreen";
import { ChangePasswordScreen } from "../screens/profile/ChangePasswordScreen";
import { PrivacySettingsScreen } from "../screens/profile/PrivacySettingsScreen";
import { AppLockSettingsScreen } from "../screens/profile/AppLockSettingsScreen";
import { TwoFactorSettingsScreen } from "../screens/profile/TwoFactorSettingsScreen";
import { ChatTextSizeScreen } from "../screens/profile/ChatTextSizeScreen";
import { StorageUsageScreen } from "../screens/profile/StorageUsageScreen";
import { NotificationSettingsScreen } from "../screens/profile/NotificationSettingsScreen";
import { ActiveSessionsScreen } from "../screens/profile/ActiveSessionsScreen";
import { LockScreen } from "../screens/LockScreen";
import { useAuthStore } from "../store/authStore";
import { useAppLockStore } from "../store/appLockStore";
import { useChatStore } from "../store/chatStore";
import { useWallpaperStore } from "../store/wallpaperStore";
import { useChatSettingsStore } from "../store/chatSettingsStore";
import { useContactsStore } from "../store/contactsStore";
import { useRecentEmojiStore } from "../store/recentEmojiStore";
import { getConversationDisplay } from "../utils/conversation";
import { MessageNotificationData, updateAppBadgeCount, clearAppBadgeCount } from "../utils/pushNotifications";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

function navigateFromNotification(data?: MessageNotificationData) {
  if (!navigationRef.isReady()) return;
  if (data?.type === "security") {
    navigationRef.navigate("ActiveSessions");
    return;
  }
  if (data?.type === "contact_request" || data?.type === "contact_accepted") {
    navigationRef.navigate("MainTabs", { screen: "Contacts" });
    return;
  }
  if (data?.type === "group_join_request" && data.conversationId) {
    navigationRef.navigate("JoinRequests", { conversationId: data.conversationId });
    return;
  }
  navigateToConversation(data?.conversationId);
}

async function navigateToConversation(conversationId?: string) {
  if (!conversationId || !navigationRef.isReady()) return;
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;

  let conversation = useChatStore.getState().conversations.find((c) => c.id === conversationId);
  if (!conversation) {
    await useChatStore.getState().loadConversations().catch(() => {});
    conversation = useChatStore.getState().conversations.find((c) => c.id === conversationId);
  }

  const contactAliases = useChatStore.getState().contactAliases;
  const title = conversation ? getConversationDisplay(conversation, userId, contactAliases).title : "";
  navigationRef.navigate("ChatRoom", { conversationId, title });
}

export function RootNavigator() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const appLockReady = useAppLockStore((s) => s.isReady);
  const isLocked = useAppLockStore((s) => s.isLocked);
  const appLockBootstrap = useAppLockStore((s) => s.bootstrap);
  const lockApp = useAppLockStore((s) => s.lock);

  const wallpaperBootstrap = useWallpaperStore((s) => s.bootstrap);
  const chatSettingsBootstrap = useChatSettingsStore((s) => s.bootstrap);
  const recentEmojiBootstrap = useRecentEmojiStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
    wallpaperBootstrap();
    chatSettingsBootstrap();
    recentEmojiBootstrap();
  }, [bootstrap, wallpaperBootstrap, chatSettingsBootstrap, recentEmojiBootstrap]);

  useEffect(() => {
    if (isAuthenticated) appLockBootstrap();
  }, [isAuthenticated, appLockBootstrap]);

  useEffect(() => {
    if (isAuthenticated) useContactsStore.getState().refreshPendingRequestCount();
  }, [isAuthenticated]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") lockApp();
    });
    return () => subscription.remove();
  }, [lockApp]);

  const conversations = useChatStore((s) => s.conversations);
  useEffect(() => {
    if (!isAuthenticated || !user) {
      clearAppBadgeCount();
      return;
    }
    updateAppBadgeCount(conversations, user.id);
  }, [isAuthenticated, user, conversations]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const lastResponse = Notifications.getLastNotificationResponse();
    const lastData = lastResponse?.notification.request.content.data as MessageNotificationData | undefined;
    navigateFromNotification(lastData);

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as MessageNotificationData;
      navigateFromNotification(data);
    });
    return () => subscription.remove();
  }, [isAuthenticated]);

  if (isLoading || (isAuthenticated && !appLockReady)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        {isAuthenticated ? (
          <Stack.Navigator>
            <Stack.Screen name="MainTabs" component={MainNavigator} options={{ title: "UzChat" }} />
            <Stack.Screen name="ChatRoom" component={ChatRoomScreen} options={{ title: "" }} />
            <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: "Yangi suhbat" }} />
            <Stack.Screen name="NewGroup" component={NewGroupScreen} options={{ title: "Yangi guruh" }} />
            <Stack.Screen name="GroupInfo" component={GroupInfoScreen} options={{ title: "Guruh ma'lumoti" }} />
            <Stack.Screen name="AddGroupMember" component={AddGroupMemberScreen} options={{ title: "A'zo qo'shish" }} />
            <Stack.Screen name="JoinGroup" component={JoinGroupScreen} options={{ title: "Havola orqali qo'shilish" }} />
            <Stack.Screen name="JoinRequests" component={JoinRequestsScreen} options={{ title: "Qo'shilish so'rovlari" }} />
            <Stack.Screen name="ForwardMessage" component={ForwardMessageScreen} options={{ title: "Yo'naltirish" }} />
            <Stack.Screen name="ShareContact" component={ShareContactScreen} options={{ title: "Kontakt yuborish" }} />
            <Stack.Screen name="SharedMedia" component={SharedMediaScreen} options={{ title: "Umumiy media" }} />
            <Stack.Screen name="ScheduledMessages" component={ScheduledMessagesScreen} options={{ title: "Rejalashtirilgan xabarlar" }} />
            <Stack.Screen name="PinnedMessages" component={PinnedMessagesScreen} options={{ title: "Qadalgan xabarlar" }} />
            <Stack.Screen name="StarredMessages" component={StarredMessagesScreen} options={{ title: "Saqlangan xabarlar" }} />
            <Stack.Screen name="ArchivedChats" component={ArchivedChatsScreen} options={{ title: "Arxivlangan suhbatlar" }} />
            <Stack.Screen name="ChatFolders" component={ChatFoldersScreen} options={{ title: "Papkalar" }} />
            <Stack.Screen name="EditChatFolder" component={EditChatFolderScreen} options={{ title: "Suhbatlarni tanlash" }} />
            <Stack.Screen name="ChatWallpaper" component={ChatWallpaperScreen} options={{ title: "Suhbat foni" }} />
            <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ title: "Bloklangan foydalanuvchilar" }} />
            <Stack.Screen name="AddContact" component={AddContactScreen} options={{ title: "Kontakt qo'shish" }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Parolni o'zgartirish" }} />
            <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} options={{ title: "Maxfiylik" }} />
            <Stack.Screen name="AppLockSettings" component={AppLockSettingsScreen} options={{ title: "Ilovani qulflash" }} />
            <Stack.Screen name="TwoFactorSettings" component={TwoFactorSettingsScreen} options={{ title: "Ikki bosqichli tekshiruv" }} />
            <Stack.Screen name="ChatTextSize" component={ChatTextSizeScreen} options={{ title: "Matn hajmi" }} />
            <Stack.Screen name="StorageUsage" component={StorageUsageScreen} options={{ title: "Xotira va kesh" }} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: "Bildirishnomalar" }} />
            <Stack.Screen name="ActiveSessions" component={ActiveSessionsScreen} options={{ title: "Faol seanslar" }} />
          </Stack.Navigator>
        ) : (
          <AuthNavigator />
        )}
      </NavigationContainer>
      {isAuthenticated && isLocked && <LockScreen />}
    </>
  );
}
