import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { chatsApi } from "../../api/chats";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { CommonGroup } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "CommonGroups">;

export function CommonGroupsScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const [groups, setGroups] = useState<CommonGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chatsApi
      .listCommonGroups(userId)
      .then(setGroups)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

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
        data={groups}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("ChatRoom", { conversationId: item.id, title: item.title ?? "" })}
          >
            <Avatar uri={item.avatarUrl} name={item.title ?? "Guruh"} />
            <View style={styles.content}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title ?? "Guruh"}
              </Text>
              <Text style={styles.subtitle}>{item.memberCount} a'zo</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Umumiy guruhlar yo'q</Text>
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
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: "600", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
});
