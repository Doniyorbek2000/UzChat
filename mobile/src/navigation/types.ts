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
};

export type MainTabParamList = {
  Chats: undefined;
  Contacts: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  ChatRoom: { conversationId: string; title: string };
  NewChat: undefined;
  NewGroup: undefined;
  AddContact: undefined;
  GroupInfo: { conversationId: string };
  AddGroupMember: { conversationId: string };
  JoinGroup: undefined;
  ForwardMessage: { conversationId: string; messageId: string };
  ShareContact: { conversationId: string };
  SharedMedia: { conversationId: string };
  StarredMessages: undefined;
  ArchivedChats: undefined;
  BlockedUsers: undefined;
  ChangePassword: undefined;
  PrivacySettings: undefined;
  AppLockSettings: undefined;
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
