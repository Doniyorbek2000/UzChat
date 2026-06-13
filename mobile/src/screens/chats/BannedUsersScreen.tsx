import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { chatsApi } from "../../api/chats";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { BannedGroupMember } from "../../types";
import { formatJoinDate } from "../../utils/conversation";

type Props = NativeStackScreenProps<RootStackParamList, "BannedUsers">;

export function BannedUsersScreen({ route }: Props) {
  const { conversationId } = route.params;
  const [bans, setBans] = useState<BannedGroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    chatsApi
      .listBannedUsers(conversationId)
      .then(setBans)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [conversationId]);

  useFocusEffect(load);

  const onUnban = async (userId: string) => {
    setBans((prev) => prev.filter((b) => b.user.id !== userId));
    try {
      await chatsApi.unbanUser(conversationId, userId);
    } catch {
      Alert.alert("Xatolik", "Blokdan chiqarib bo'lmadi");
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
      <Text style={styles.hint}>
        Bloklangan foydalanuvchilar guruhga taklif havolasi orqali qayta qo'shila olmaydi va admin tomonidan qayta
        qo'shilmaydi.
      </Text>
      <FlatList
        data={bans}
        keyExtractor={(item) => item.user.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={item.user.avatarUrl} name={item.user.displayName} />
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{item.user.displayName}</Text>
              <Text style={styles.date}>Bloklangan: {formatJoinDate(item.createdAt)}</Text>
            </View>
            <TouchableOpacity style={styles.unbanButton} onPress={() => onUnban(item.user.id)}>
              <Text style={styles.unbanText}>Blokdan chiqarish</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Bloklangan foydalanuvchilar yo'q</Text>
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
  hint: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, padding: 16, paddingBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  nameContainer: { flex: 1 },
  name: { fontSize: 16, color: colors.text },
  date: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  unbanButton: { borderColor: colors.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  unbanText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
});
