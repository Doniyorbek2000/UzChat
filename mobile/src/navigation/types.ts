import { CompositeScreenProps, NavigatorScreenParams } from "@react-navigation/native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

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
  ForwardMessage: { conversationId: string; messageIds: string[] };
  ShareContact: { conversationId: string };
  SharedMedia: { conversationId: string };
  ScheduledMessages: { conversationId: string };
  PinnedMessages: { conversationId: string; title: string };
  StarredMessages: undefined;
  ArchivedChats: undefined;
  ChatFolders: undefined;
  EditChatFolder: { folderId: string };
  ChatWallpaper: { conversationId: string };
  BlockedUsers: undefined;
  ChangePassword: undefined;
  PrivacySettings: undefined;
  AppLockSettings: undefined;
  TwoFactorSettings: undefined;
  ActiveSessions: undefined;
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
