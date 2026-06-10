import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { MainTabParamList } from "./types";
import { ChatListScreen } from "../screens/chats/ChatListScreen";
import { ContactsScreen } from "../screens/contacts/ContactsScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator<MainTabParamList>();

const icons: Record<keyof MainTabParamList, string> = {
  Chats: "💬",
  Contacts: "👥",
  Profile: "👤",
};

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarIcon: () => <Text style={{ fontSize: 20 }}>{icons[route.name as keyof MainTabParamList]}</Text>,
      })}
    >
      <Tab.Screen name="Chats" component={ChatListScreen} options={{ title: "Suhbatlar" }} />
      <Tab.Screen name="Contacts" component={ContactsScreen} options={{ title: "Kontaktlar" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profil" }} />
    </Tab.Navigator>
  );
}
