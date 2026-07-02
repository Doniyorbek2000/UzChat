import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { chatsApi } from "../../api/chats";
import { Avatar } from "../../components/Avatar";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { CommonGroup } from "../../types";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "CommonGroups">;

export function CommonGroupsScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const [groups, setGroups] = useState<CommonGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setError(false);
    setLoading(true);
    chatsApi
      .listCommonGroups(userId)
      .then(setGroups)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  const onRefresh = () => {
    setRefreshing(true);
    chatsApi.listCommonGroups(userId).then(setGroups).catch(() => {}).finally(() => setRefreshing(false));
  };

  useEffect(() => { load(); }, [userId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message={tr("Umumiy guruhlarni yuklab bo'lmadi")} onRetry={load} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ItemSeparatorComponent={Separator}
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
            <Text style={styles.emptyText}>{tr("Umumiy guruhlar yo'q")}</Text>
          </View>
        }
      />
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

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
