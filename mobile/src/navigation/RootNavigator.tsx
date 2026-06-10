import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { ChatRoomScreen } from "../screens/chats/ChatRoomScreen";
import { NewChatScreen } from "../screens/chats/NewChatScreen";
import { NewGroupScreen } from "../screens/chats/NewGroupScreen";
import { AddContactScreen } from "../screens/contacts/AddContactScreen";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <Stack.Navigator>
          <Stack.Screen name="MainTabs" component={MainNavigator} options={{ title: "UzChat" }} />
          <Stack.Screen name="ChatRoom" component={ChatRoomScreen} options={{ title: "" }} />
          <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: "Yangi suhbat" }} />
          <Stack.Screen name="NewGroup" component={NewGroupScreen} options={{ title: "Yangi guruh" }} />
          <Stack.Screen name="AddContact" component={AddContactScreen} options={{ title: "Kontakt qo'shish" }} />
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
