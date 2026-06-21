import { useEffect } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import { RootStackParamList } from "./types";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { ChatRoomScreen } from "../screens/chats/ChatRoomScreen";
import { NewChatScreen } from "../screens/chats/NewChatScreen";
import { NewGroupScreen } from "../screens/chats/NewGroupScreen";
import { NewChannelScreen } from "../screens/chats/NewChannelScreen";
import { GroupInfoScreen } from "../screens/chats/GroupInfoScreen";
import { AddGroupMemberScreen } from "../screens/chats/AddGroupMemberScreen";
import { JoinGroupScreen } from "../screens/chats/JoinGroupScreen";
import { JoinRequestsScreen } from "../screens/chats/JoinRequestsScreen";
import { GroupAuditLogScreen } from "../screens/chats/GroupAuditLogScreen";
import { BannedUsersScreen } from "../screens/chats/BannedUsersScreen";
import { CommonGroupsScreen } from "../screens/chats/CommonGroupsScreen";
import { MutualContactsScreen } from "../screens/contacts/MutualContactsScreen";
import { UserProfileScreen } from "../screens/chats/UserProfileScreen";
import { EncryptionKeyScreen } from "../screens/chats/EncryptionKeyScreen";
import { ForwardMessageScreen } from "../screens/chats/ForwardMessageScreen";
import { ShareContactScreen } from "../screens/chats/ShareContactScreen";
import { SharedMediaScreen } from "../screens/chats/SharedMediaScreen";
import { ScheduledMessagesScreen } from "../screens/chats/ScheduledMessagesScreen";
import { PinnedMessagesScreen } from "../screens/chats/PinnedMessagesScreen";
import { StarredMessagesScreen } from "../screens/chats/StarredMessagesScreen";
import { MentionsScreen } from "../screens/chats/MentionsScreen";
import { RemindersScreen } from "../screens/chats/RemindersScreen";
import { ArchivedChatsScreen } from "../screens/chats/ArchivedChatsScreen";
import { ChatFoldersScreen } from "../screens/chats/ChatFoldersScreen";
import { EditChatFolderScreen } from "../screens/chats/EditChatFolderScreen";
import { BroadcastListsScreen } from "../screens/chats/BroadcastListsScreen";
import { EditBroadcastListScreen } from "../screens/chats/EditBroadcastListScreen";
import { ChatWallpaperScreen } from "../screens/chats/ChatWallpaperScreen";
import { BlockedUsersScreen } from "../screens/contacts/BlockedUsersScreen";
import { BirthdaysScreen } from "../screens/contacts/BirthdaysScreen";
import { AddContactScreen } from "../screens/contacts/AddContactScreen";
import { ChangePasswordScreen } from "../screens/profile/ChangePasswordScreen";
import { ChangePhoneScreen } from "../screens/profile/ChangePhoneScreen";
import { PrivacySettingsScreen } from "../screens/profile/PrivacySettingsScreen";
import { LastSeenExceptionsScreen } from "../screens/profile/LastSeenExceptionsScreen";
import { AppLockSettingsScreen } from "../screens/profile/AppLockSettingsScreen";
import { TwoFactorSettingsScreen } from "../screens/profile/TwoFactorSettingsScreen";
import { ChatTextSizeScreen } from "../screens/profile/ChatTextSizeScreen";
import { StorageUsageScreen } from "../screens/profile/StorageUsageScreen";
import { AccountDataExportScreen } from "../screens/profile/AccountDataExportScreen";
import { MyActivityScreen } from "../screens/profile/MyActivityScreen";
import { QuickRepliesScreen } from "../screens/profile/QuickRepliesScreen";
import { NotificationSettingsScreen } from "../screens/profile/NotificationSettingsScreen";
import { ActiveSessionsScreen } from "../screens/profile/ActiveSessionsScreen";
import { AboutScreen } from "../screens/profile/AboutScreen";
import { ThemeSettingsScreen } from "../screens/profile/ThemeSettingsScreen";
import { QRCodeScreen } from "../screens/profile/QRCodeScreen";
import { DeviceKeysScreen } from "../screens/profile/DeviceKeysScreen";
import { CallScreen } from "../screens/calls/CallScreen";
import { CallHistoryScreen } from "../screens/calls/CallHistoryScreen";
import { StoriesScreen } from "../screens/stories/StoriesScreen";
import { StoryViewerScreen } from "../screens/stories/StoryViewerScreen";
import { WalletScreen } from "../screens/wallet/WalletScreen";
import { SendPaymentScreen } from "../screens/wallet/SendPaymentScreen";
import { MiniAppsScreen } from "../screens/miniapps/MiniAppsScreen";
import { MiniAppViewScreen } from "../screens/miniapps/MiniAppViewScreen";
import { CreateMiniAppScreen } from "../screens/miniapps/CreateMiniAppScreen";
import { FeedScreen } from "../screens/feed/FeedScreen";
import { CreatePostScreen } from "../screens/feed/CreatePostScreen";
import { PostCommentsScreen } from "../screens/feed/PostCommentsScreen";
import { UserPostsScreen } from "../screens/feed/UserPostsScreen";
import { MarketplaceScreen } from "../screens/marketplace/MarketplaceScreen";
import { StoreViewScreen } from "../screens/marketplace/StoreViewScreen";
import { CreateStoreScreen } from "../screens/marketplace/CreateStoreScreen";
import { MyStoresScreen } from "../screens/marketplace/MyStoresScreen";
import { ProductViewScreen } from "../screens/marketplace/ProductViewScreen";
import { MyOrdersScreen } from "../screens/marketplace/MyOrdersScreen";
import { AddProductScreen } from "../screens/marketplace/AddProductScreen";
import { SendRedPacketScreen } from "../screens/redpackets/SendRedPacketScreen";
import { ClaimRedPacketScreen } from "../screens/redpackets/ClaimRedPacketScreen";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminUsersScreen from "../screens/admin/AdminUsersScreen";
import AdminReportsScreen from "../screens/admin/AdminReportsScreen";
import { StickerStoreScreen } from "../screens/stickers/StickerStoreScreen";
import { StickerPackViewScreen } from "../screens/stickers/StickerPackViewScreen";
import { ChannelStatsScreen } from "../screens/stickers/ChannelStatsScreen";
import { StoryHighlightsScreen } from "../screens/stories/StoryHighlightsScreen";
import { QRPaymentScreen } from "../screens/wallet/QRPaymentScreen";
import { QRPaymentScanScreen } from "../screens/wallet/QRPaymentScanScreen";
import { NearbyPeopleScreen } from "../screens/nearby/NearbyPeopleScreen";
import { BotStoreScreen } from "../screens/bots/BotStoreScreen";
import { BotDetailScreen } from "../screens/bots/BotDetailScreen";
import { CreateBotScreen } from "../screens/bots/CreateBotScreen";
import { ReelsFeedScreen } from "../screens/reels/ReelsFeedScreen";
import { CreateReelScreen } from "../screens/reels/CreateReelScreen";
import { FileSecurityScreen } from "../screens/profile/FileSecurityScreen";
import { LockScreen } from "../screens/LockScreen";
import { ChatToastBanner } from "../components/ChatToastBanner";
import { navigationRef } from "./navigationRef";
import { useAuthStore } from "../store/authStore";
import { useAppLockStore } from "../store/appLockStore";
import { useChatStore } from "../store/chatStore";
import { useWallpaperStore } from "../store/wallpaperStore";
import { useChatSettingsStore } from "../store/chatSettingsStore";
import { useContactsStore } from "../store/contactsStore";
import { useRecentEmojiStore } from "../store/recentEmojiStore";
import { useRecentStickersStore } from "../store/recentStickersStore";
import { useVerifiedContactsStore } from "../store/verifiedContactsStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { useQuickRepliesStore } from "../store/quickRepliesStore";
import { getConversationDisplay } from "../utils/conversation";
import { MessageNotificationData, updateAppBadgeCount, clearAppBadgeCount } from "../utils/pushNotifications";
import { getSocket } from "../socket/socket";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<RootStackParamList>();

function navigateFromNotification(data?: MessageNotificationData) {
  if (!navigationRef.isReady()) return;
  if (data?.type === "security") {
    navigationRef.navigate("ActiveSessions");
    return;
  }
  if (data?.type === "account_inactivity_warning") {
    navigationRef.navigate("PrivacySettings");
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
  if (data?.type === "group_join_approved" && data.conversationId) {
    navigateToConversation(data.conversationId);
    return;
  }
  if (data?.type === "group_join_declined") {
    navigationRef.navigate("JoinGroup");
    return;
  }
  if (data?.type === "birthday" && data.userId) {
    navigationRef.navigate("UserProfile", { userId: data.userId });
    return;
  }
  if (data?.type === "user_online" && data.userId) {
    navigationRef.navigate("UserProfile", { userId: data.userId });
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
  const recentStickersBootstrap = useRecentStickersStore((s) => s.bootstrap);
  const verifiedContactsBootstrap = useVerifiedContactsStore((s) => s.bootstrap);
  const quickRepliesBootstrap = useQuickRepliesStore((s) => s.bootstrap);
  const themeBootstrap = useThemeStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
    wallpaperBootstrap();
    chatSettingsBootstrap();
    recentEmojiBootstrap();
    recentStickersBootstrap();
    verifiedContactsBootstrap();
    quickRepliesBootstrap();
    themeBootstrap();
  }, [
    bootstrap,
    wallpaperBootstrap,
    chatSettingsBootstrap,
    recentEmojiBootstrap,
    recentStickersBootstrap,
    verifiedContactsBootstrap,
    quickRepliesBootstrap,
    themeBootstrap,
  ]);

  useEffect(() => {
    if (isAuthenticated) appLockBootstrap();
  }, [isAuthenticated, appLockBootstrap]);

  useEffect(() => {
    if (isAuthenticated) {
      useContactsStore.getState().refreshPendingRequestCount();
      // Registers immediately so the "Contacts" tab badge updates in real time even
      // if the user never opens that tab (it otherwise only registers on its mount).
      useContactsStore.getState().setupSocketListeners();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") lockApp();
      // The OS can suspend the socket's underlying connection without ever firing
      // socket.io's "disconnect" event, leaving it in a phantom "connected" state
      // that never auto-reconnects. Force a reconnect attempt on resume.
      if (state === "active" && isAuthenticated) {
        const socket = getSocket();
        if (socket && !socket.connected) socket.connect();
      }
    });
    return () => subscription.remove();
  }, [lockApp, isAuthenticated]);

  const conversations = useChatStore((s) => s.conversations);
  useEffect(() => {
    if (!isAuthenticated || !user) {
      clearAppBadgeCount();
      return;
    }
    updateAppBadgeCount(conversations, user.id, user.includeMutedInBadge);
  }, [isAuthenticated, user, conversations]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    if (!socket) return;

    const onIncomingCall = (data: {
      callerId: string;
      callerDisplayName: string;
      callerAvatarUrl: string | null;
      callType: "audio" | "video";
    }) => {
      if (navigationRef.isReady()) {
        navigationRef.navigate("Call", {
          userId: data.callerId,
          displayName: data.callerDisplayName,
          avatarUrl: data.callerAvatarUrl,
          callType: data.callType,
          isIncoming: true,
        });
      }
    };

    const onPaymentReceived = (data: {
      sender: { displayName: string; avatarUrl: string | null };
      amount: number;
      currency: string;
    }) => {
      useToastStore.getState().showToast({
        conversationId: "",
        title: "To'lov qabul qilindi",
        body: `${data.sender.displayName} sizga ${data.amount.toLocaleString()} ${data.currency} yubordi`,
        avatarUrl: data.sender.avatarUrl,
      });
    };

    const onQrPaymentCompleted = (data: {
      payer: { displayName: string; avatarUrl: string | null };
      amount: number;
      currency: string;
    }) => {
      useToastStore.getState().showToast({
        conversationId: "",
        title: "QR to'lov qabul qilindi",
        body: `${data.payer.displayName} ${Number(data.amount).toLocaleString()} ${data.currency} to'ladi`,
        avatarUrl: data.payer.avatarUrl,
      });
    };

    socket.on("call:offer", onIncomingCall);
    socket.on("payment:received", onPaymentReceived);
    socket.on("qr-payment:completed", onQrPaymentCompleted);
    return () => {
      socket.off("call:offer", onIncomingCall);
      socket.off("payment:received", onPaymentReceived);
      socket.off("qr-payment:completed", onQrPaymentCompleted);
    };
  }, [isAuthenticated]);

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

  const themeColors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);

  const navTheme = {
    dark: isDark,
    colors: {
      primary: themeColors.primary,
      background: themeColors.background,
      card: themeColors.surface,
      text: themeColors.text,
      border: themeColors.border,
      notification: themeColors.danger,
    },
    fonts: { regular: { fontFamily: "System", fontWeight: "400" as const }, medium: { fontFamily: "System", fontWeight: "500" as const }, bold: { fontFamily: "System", fontWeight: "700" as const }, heavy: { fontFamily: "System", fontWeight: "900" as const } },
  };

  return (
    <>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        {isAuthenticated ? (
          <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: themeColors.surface }, headerTintColor: themeColors.text }}>
            <Stack.Screen name="MainTabs" component={MainNavigator} options={{ title: "UzChat" }} />
            <Stack.Screen name="ChatRoom" component={ChatRoomScreen} options={{ title: "" }} />
            <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: "Yangi suhbat" }} />
            <Stack.Screen name="NewGroup" component={NewGroupScreen} options={{ title: "Yangi guruh" }} />
            <Stack.Screen name="NewChannel" component={NewChannelScreen} options={{ title: "Yangi kanal" }} />
            <Stack.Screen name="GroupInfo" component={GroupInfoScreen} options={{ title: "Guruh ma'lumoti" }} />
            <Stack.Screen name="AddGroupMember" component={AddGroupMemberScreen} options={{ title: "A'zo qo'shish" }} />
            <Stack.Screen name="JoinGroup" component={JoinGroupScreen} options={{ title: "Havola orqali qo'shilish" }} />
            <Stack.Screen name="JoinRequests" component={JoinRequestsScreen} options={{ title: "Qo'shilish so'rovlari" }} />
            <Stack.Screen name="GroupAuditLog" component={GroupAuditLogScreen} options={{ title: "So'nggi harakatlar" }} />
            <Stack.Screen name="BannedUsers" component={BannedUsersScreen} options={{ title: "Bloklangan foydalanuvchilar" }} />
            <Stack.Screen name="CommonGroups" component={CommonGroupsScreen} options={{ title: "Umumiy guruhlar" }} />
            <Stack.Screen name="MutualContacts" component={MutualContactsScreen} options={{ title: "Umumiy kontaktlar" }} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: "Profil" }} />
            <Stack.Screen name="EncryptionKey" component={EncryptionKeyScreen} options={{ title: "Shifrlash kaliti" }} />
            <Stack.Screen name="ForwardMessage" component={ForwardMessageScreen} options={{ title: "Yo'naltirish" }} />
            <Stack.Screen name="ShareContact" component={ShareContactScreen} options={{ title: "Kontakt yuborish" }} />
            <Stack.Screen name="SharedMedia" component={SharedMediaScreen} options={{ title: "Umumiy media" }} />
            <Stack.Screen name="ScheduledMessages" component={ScheduledMessagesScreen} options={{ title: "Rejalashtirilgan xabarlar" }} />
            <Stack.Screen name="PinnedMessages" component={PinnedMessagesScreen} options={{ title: "Qadalgan xabarlar" }} />
            <Stack.Screen name="StarredMessages" component={StarredMessagesScreen} options={{ title: "Saqlangan xabarlar" }} />
            <Stack.Screen name="Mentions" component={MentionsScreen} options={{ title: "Eslatishlar" }} />
            <Stack.Screen name="Reminders" component={RemindersScreen} options={{ title: "Yodga solinganlar" }} />
            <Stack.Screen name="ArchivedChats" component={ArchivedChatsScreen} options={{ title: "Arxivlangan suhbatlar" }} />
            <Stack.Screen name="ChatFolders" component={ChatFoldersScreen} options={{ title: "Papkalar" }} />
            <Stack.Screen name="EditChatFolder" component={EditChatFolderScreen} options={{ title: "Suhbatlarni tanlash" }} />
            <Stack.Screen name="BroadcastLists" component={BroadcastListsScreen} options={{ title: "Tarqatish ro'yxatlari" }} />
            <Stack.Screen name="EditBroadcastList" component={EditBroadcastListScreen} options={{ title: "Ro'yxatni tahrirlash" }} />
            <Stack.Screen name="ChatWallpaper" component={ChatWallpaperScreen} options={{ title: "Suhbat foni" }} />
            <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ title: "Bloklangan foydalanuvchilar" }} />
            <Stack.Screen name="Birthdays" component={BirthdaysScreen} options={{ title: "Tug'ilgan kunlar" }} />
            <Stack.Screen name="AddContact" component={AddContactScreen} options={{ title: "Kontakt qo'shish" }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Parolni o'zgartirish" }} />
            <Stack.Screen name="ChangePhone" component={ChangePhoneScreen} options={{ title: "Telefon raqamni o'zgartirish" }} />
            <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} options={{ title: "Maxfiylik" }} />
            <Stack.Screen name="LastSeenExceptions" component={LastSeenExceptionsScreen} options={{ title: "Onlayn holati: istisnolar" }} />
            <Stack.Screen name="AppLockSettings" component={AppLockSettingsScreen} options={{ title: "Ilovani qulflash" }} />
            <Stack.Screen name="TwoFactorSettings" component={TwoFactorSettingsScreen} options={{ title: "Ikki bosqichli tekshiruv" }} />
            <Stack.Screen name="ChatTextSize" component={ChatTextSizeScreen} options={{ title: "Matn hajmi" }} />
            <Stack.Screen name="StorageUsage" component={StorageUsageScreen} options={{ title: "Xotira va kesh" }} />
            <Stack.Screen name="AccountDataExport" component={AccountDataExportScreen} options={{ title: "Mening ma'lumotlarim" }} />
            <Stack.Screen name="MyActivity" component={MyActivityScreen} options={{ title: "Mening faolligim" }} />
            <Stack.Screen name="QuickReplies" component={QuickRepliesScreen} options={{ title: "Tezkor javoblar" }} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: "Bildirishnomalar" }} />
            <Stack.Screen name="ActiveSessions" component={ActiveSessionsScreen} options={{ title: "Faol seanslar" }} />
            <Stack.Screen name="About" component={AboutScreen} options={{ title: "UzChat haqida" }} />
            <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} options={{ title: "Mavzu" }} />
            <Stack.Screen name="Stories" component={StoriesScreen} options={{ title: "Hikoyalar" }} />
            <Stack.Screen name="QRCode" component={QRCodeScreen} options={{ title: "QR kod" }} />
            <Stack.Screen name="DeviceKeys" component={DeviceKeysScreen} options={{ title: "Qurilma kalitlari" }} />
            <Stack.Screen name="Call" component={CallScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CallHistory" component={CallHistoryScreen} options={{ title: "Qo'ng'iroqlar tarixi" }} />
            <Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: "Hamyon" }} />
            <Stack.Screen name="SendPayment" component={SendPaymentScreen} options={{ title: "Pul yuborish" }} />
            <Stack.Screen name="MiniApps" component={MiniAppsScreen} options={{ title: "Mini-dasturlar" }} />
            <Stack.Screen name="MiniAppView" component={MiniAppViewScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CreateMiniApp" component={CreateMiniAppScreen} options={{ title: "Mini-dastur yaratish" }} />
            <Stack.Screen name="Feed" component={FeedScreen} options={{ title: "Yangiliklar" }} />
            <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: "Yangi post" }} />
            <Stack.Screen name="PostComments" component={PostCommentsScreen} options={{ title: "Izohlar" }} />
            <Stack.Screen name="UserPosts" component={UserPostsScreen} options={{ title: "Postlar" }} />
            <Stack.Screen name="Marketplace" component={MarketplaceScreen} options={{ title: "Bozor" }} />
            <Stack.Screen name="StoreView" component={StoreViewScreen} options={{ title: "Do'kon" }} />
            <Stack.Screen name="CreateStore" component={CreateStoreScreen} options={{ title: "Do'kon yaratish" }} />
            <Stack.Screen name="MyStores" component={MyStoresScreen} options={{ title: "Mening do'konlarim" }} />
            <Stack.Screen name="ProductView" component={ProductViewScreen} options={{ title: "Mahsulot" }} />
            <Stack.Screen name="MyOrders" component={MyOrdersScreen} options={{ title: "Buyurtmalarim" }} />
            <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ title: "Mahsulot qo'shish" }} />
            <Stack.Screen name="SendRedPacket" component={SendRedPacketScreen} options={{ title: "Qizil konvert", headerStyle: { backgroundColor: "#C41E3A" }, headerTintColor: "#FFD700" }} />
            <Stack.Screen name="ClaimRedPacket" component={ClaimRedPacketScreen} options={{ title: "Konvert ochish", headerStyle: { backgroundColor: "#C41E3A" }, headerTintColor: "#FFD700" }} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: "Admin panel" }} />
            <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: "Foydalanuvchilar boshqaruvi" }} />
            <Stack.Screen name="AdminReports" component={AdminReportsScreen} options={{ title: "Shikoyatlar" }} />
            <Stack.Screen name="StickerStore" component={StickerStoreScreen} options={{ title: "Stiker do'koni" }} />
            <Stack.Screen name="StickerPackView" component={StickerPackViewScreen} options={{ title: "Stiker to'plami" }} />
            <Stack.Screen name="ChannelStats" component={ChannelStatsScreen} options={{ title: "Kanal statistikasi" }} />
            <Stack.Screen name="StoryHighlights" component={StoryHighlightsScreen} options={{ title: "Highlights" }} />
            <Stack.Screen name="QRPayment" component={QRPaymentScreen} options={{ title: "QR to'lov" }} />
            <Stack.Screen name="QRPaymentScan" component={QRPaymentScanScreen} options={{ title: "QR skanerlash" }} />
            <Stack.Screen name="NearbyPeople" component={NearbyPeopleScreen} options={{ title: "Yaqin odamlar" }} />
            <Stack.Screen name="BotStore" component={BotStoreScreen} options={{ title: "Botlar" }} />
            <Stack.Screen name="BotDetail" component={BotDetailScreen} options={{ title: "Bot" }} />
            <Stack.Screen name="CreateBot" component={CreateBotScreen} options={{ title: "Bot yaratish" }} />
            <Stack.Screen name="ReelsFeed" component={ReelsFeedScreen} options={{ title: "Reels", headerStyle: { backgroundColor: "#111" }, headerTintColor: "#fff" }} />
            <Stack.Screen name="CreateReel" component={CreateReelScreen} options={{ title: "Reel yaratish" }} />
            <Stack.Screen name="FileSecurity" component={FileSecurityScreen} options={{ title: "Fayl xavfsizligi" }} />
          </Stack.Navigator>
        ) : (
          <AuthNavigator />
        )}
      </NavigationContainer>
      {isAuthenticated && isLocked && <LockScreen />}
      {isAuthenticated && !isLocked && <ChatToastBanner />}
    </>
  );
}
