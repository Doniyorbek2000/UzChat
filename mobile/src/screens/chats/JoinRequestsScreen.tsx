import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { chatsApi } from "../../api/chats";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { GroupJoinRequest } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "JoinRequests">;

export function JoinRequestsScreen({ route }: Props) {
  const { conversationId } = route.params;
  const [requests, setRequests] = useState<GroupJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    chatsApi
      .listJoinRequests(conversationId)
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [conversationId]);

  useFocusEffect(load);

  const onApprove = async (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    try {
      await chatsApi.approveJoinRequest(conversationId, id);
    } catch {
      Alert.alert("Xatolik", "So'rovni qabul qilib bo'lmadi");
      load();
    }
  };

  const onDecline = async (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    try {
      await chatsApi.declineJoinRequest(conversationId, id);
    } catch {
      Alert.alert("Xatolik", "So'rovni rad etib bo'lmadi");
      load();
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={item.user.avatarUrl} name={item.user.displayName} />
            <Text style={styles.name}>{item.user.displayName}</Text>
            <TouchableOpacity style={styles.acceptButton} onPress={() => onApprove(item.id)}>
              <Text style={styles.acceptText}>Qabul qilish</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineButton} onPress={() => onDecline(item.id)}>
              <Text style={styles.declineText}>Rad etish</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Qo'shilish so'rovlari yo'q</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  name: { fontSize: 16, color: colors.text, flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  acceptButton: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  acceptText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  declineButton: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  declineText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
});
