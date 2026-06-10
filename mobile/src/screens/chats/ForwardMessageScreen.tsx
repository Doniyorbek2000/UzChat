import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { Conversation } from "../../types";
import { getConversationDisplay } from "../../utils/conversation";

type Props = NativeStackScreenProps<RootStackParamList, "ForwardMessage">;

export function ForwardMessageScreen({ route, navigation }: Props) {
  const { conversationId, messageId } = route.params;
  const conversations = useChatStore((s) => s.conversations);
  const forwardMessage = useChatStore((s) => s.forwardMessage);
  const user = useAuthStore((s) => s.user);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const onSelect = async (target: Conversation) => {
    if (sendingId) return;
    setSendingId(target.id);
    try {
      await forwardMessage(conversationId, messageId, target.id);
      navigation.goBack();
    } catch {
      Alert.alert("Xatolik", "Xabarni yo'naltirib bo'lmadi");
    } finally {
      setSendingId(null);
    }
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const display = getConversationDisplay(item, user!.id);
    return (
      <TouchableOpacity style={styles.row} onPress={() => onSelect(item)} disabled={!!sendingId}>
        <Avatar uri={display.avatarUrl} name={display.title} />
        <Text style={styles.title} numberOfLines={1}>
          {display.title}
        </Text>
        {sendingId === item.id && <ActivityIndicator color={colors.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Suhbatlar yo'q</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  title: { fontSize: 16, color: colors.text, flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
});
