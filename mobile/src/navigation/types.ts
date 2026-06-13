import { CompositeScreenProps, NavigatorScreenParams } from "@react-navigation/native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BroadcastList } from "../types";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyOtp: {
    phone: string;
    displayName: string;
    username: string;
    password: string;
  };
  TwoFactorLogin: {
    pendingToken: string;
    hint: string | null;
  };
};

export type MainTabParamList = {
  Chats: undefined;
  Contacts: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  ChatRoom: { conversationId: string; title: string; highlightMessageId?: string };
  NewChat: undefined;
  NewGroup: undefined;
  AddContact: undefined;
  GroupInfo: { conversationId: string };
  AddGroupMember: { conversationId: string };
  JoinGroup: undefined;
  JoinRequests: { conversationId: string };
  GroupAuditLog: { conversationId: string };
  BannedUsers: { conversationId: string };
  CommonGroups: { userId: string };
  UserProfile: { userId: string };
  EncryptionKey: { userId: string; displayName: string };
  ForwardMessage: { conversationId: string; messageIds: string[] };
  ShareContact: { conversationId: string };
  SharedMedia: { conversationId: string };
  ScheduledMessages: { conversationId: string };
  PinnedMessages: { conversationId: string; title: string };
  StarredMessages: undefined;
  Mentions: undefined;
  ArchivedChats: undefined;
  ChatFolders: undefined;
  EditChatFolder: { folderId: string };
  BroadcastLists: undefined;
  EditBroadcastList: { list?: BroadcastList };
  ChatWallpaper: { conversationId: string };
  BlockedUsers: undefined;
  Birthdays: undefined;
  ChangePassword: undefined;
  ChangePhone: undefined;
  PrivacySettings: undefined;
  LastSeenExceptions: undefined;
  AppLockSettings: undefined;
  TwoFactorSettings: undefined;
  ActiveSessions: undefined;
  ChatTextSize: undefined;
  StorageUsage: undefined;
  AccountDataExport: undefined;
  QuickReplies: undefined;
  NotificationSettings: undefined;
  About: undefined;
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
