import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { contactsApi } from "../../api/contacts";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { BlockedUser } from "../../types";

export function BlockedUsersScreen() {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    contactsApi
      .listBlocked()
      .then(setBlocked)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  const onUnblock = (item: BlockedUser) => {
    setBlocked((prev) => prev.filter((b) => b.id !== item.id));
    contactsApi.unblock(item.user.id).catch(() => {
      load();
    });
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
        data={blocked}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={item.user.avatarUrl} name={item.user.displayName} />
            <Text style={styles.name}>{item.user.displayName}</Text>
            <TouchableOpacity style={styles.unblockButton} onPress={() => onUnblock(item)}>
              <Text style={styles.unblockText}>Blokdan chiqarish</Text>
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
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  name: { fontSize: 16, color: colors.text, flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  unblockButton: { borderColor: colors.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  unblockText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
});
