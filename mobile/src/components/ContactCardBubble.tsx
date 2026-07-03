import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Avatar } from "./Avatar";
import { DecryptedMessage, useChatStore } from "../store/chatStore";
import { useAuthStore } from "../store/authStore";
import { usersApi } from "../api/users";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { tr } from "../i18n";

interface Props {
  message: DecryptedMessage;
  navigation: NativeStackNavigationProp<RootStackParamList>;
}

export function ContactCardBubble({ message, navigation }: Props) {
  const meta = message.contactMeta;
  const currentUser = useAuthStore((s) => s.user);
  const createDirectConversation = useChatStore((s) => s.createDirectConversation);
  const [loading, setLoading] = useState(false);

  if (!meta) return null;

  const isSelf = meta.userId === currentUser?.id;

  const onPress = async () => {
    if (isSelf || loading) return;
    setLoading(true);
    try {
      const target = await usersApi.getById(meta.userId);
      const conversation = await createDirectConversation(target);
      navigation.navigate("ChatRoom", { conversationId: conversation.id, title: target.displayName });
    } catch {
      Alert.alert(tr("Xatolik"), tr("Suhbat ochib bo'lmadi"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} disabled={isSelf || loading}>
      <Avatar uri={meta.avatarUrl} name={meta.displayName} size={40} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {meta.displayName}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{meta.username}
        </Text>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.icon}>👤</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 200,
    maxWidth: 240,
    gap: 10,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: "600", color: colors.text },
  username: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  icon: { fontSize: 18 },
});
