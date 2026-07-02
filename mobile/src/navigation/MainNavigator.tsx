import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View, StyleSheet } from "react-native";
import { MainTabParamList } from "./types";
import { ChatListScreen } from "../screens/chats/ChatListScreen";
import { ReelsFeedScreen } from "../screens/reels/ReelsFeedScreen";
import { DiscoverScreen } from "../screens/discover/DiscoverScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { useChatStore } from "../store/chatStore";
import { useAuthStore } from "../store/authStore";
import { isConversationUnread } from "../utils/conversation";
import { colors } from "../theme/colors";
import { useT } from "../i18n";

const Tab = createBottomTabNavigator<MainTabParamList>();

const icons: Record<keyof MainTabParamList, string> = {
  Chats: "💬",
  Reels: "🎬",
  Discover: "🔍",
  Profile: "👤",
};

function TabIcon({ name, badge }: { name: keyof MainTabParamList; badge?: number }) {
  return (
    <View>
      <Text style={{ fontSize: 20 }}>{icons[name]}</Text>
      {!!badge && badge > 0 && (
        <View style={badgeStyles.badge}>
          <Text style={badgeStyles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      )}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    backgroundColor: colors.danger,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});

export function MainNavigator() {
  const conversations = useChatStore((s) => s.conversations);
  const user = useAuthStore((s) => s.user);
  const unreadCount = user
    ? conversations.filter((c) => !c.isArchived && isConversationUnread(c, user.id)).length
    : 0;

  const t = useT();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarIcon: () => (
          <TabIcon
            name={route.name as keyof MainTabParamList}
            badge={route.name === "Chats" ? unreadCount : undefined}
          />
        ),
      })}
    >
      <Tab.Screen name="Chats" component={ChatListScreen} options={{ title: t("tabChats") }} />
      <Tab.Screen name="Reels" component={ReelsFeedScreen} options={{ title: t("tabReels") }} />
      <Tab.Screen name="Discover" component={DiscoverScreen} options={{ title: t("tabDiscover") }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t("tabProfile") }} />
    </Tab.Navigator>
  );
}
