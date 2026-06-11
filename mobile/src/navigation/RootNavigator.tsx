import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
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
import { ForwardMessageScreen } from "../screens/chats/ForwardMessageScreen";
import { SharedMediaScreen } from "../screens/chats/SharedMediaScreen";
import { StarredMessagesScreen } from "../screens/chats/StarredMessagesScreen";
import { ArchivedChatsScreen } from "../screens/chats/ArchivedChatsScreen";
import { BlockedUsersScreen } from "../screens/contacts/BlockedUsersScreen";
import { AddContactScreen } from "../screens/contacts/AddContactScreen";
import { ChangePasswordScreen } from "../screens/profile/ChangePasswordScreen";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { getConversationDisplay } from "../utils/conversation";
import { MessageNotificationData } from "../utils/pushNotifications";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

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
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const lastResponse = Notifications.getLastNotificationResponse();
    const lastData = lastResponse?.notification.request.content.data as MessageNotificationData | undefined;
    navigateToConversation(lastData?.conversationId);

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as MessageNotificationData;
      navigateToConversation(data?.conversationId);
    });
    return () => subscription.remove();
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
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
          <Stack.Screen name="ForwardMessage" component={ForwardMessageScreen} options={{ title: "Yo'naltirish" }} />
          <Stack.Screen name="SharedMedia" component={SharedMediaScreen} options={{ title: "Umumiy media" }} />
          <Stack.Screen name="StarredMessages" component={StarredMessagesScreen} options={{ title: "Saqlangan xabarlar" }} />
          <Stack.Screen name="ArchivedChats" component={ArchivedChatsScreen} options={{ title: "Arxivlangan suhbatlar" }} />
          <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ title: "Bloklangan foydalanuvchilar" }} />
          <Stack.Screen name="AddContact" component={AddContactScreen} options={{ title: "Kontakt qo'shish" }} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Parolni o'zgartirish" }} />
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
