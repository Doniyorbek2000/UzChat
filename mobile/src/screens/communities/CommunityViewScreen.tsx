import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { communitiesApi, Community } from "../../api/communities";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "CommunityView">;

export function CommunityViewScreen({ route, navigation }: Props) {
  const { communityId } = route.params;
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    communitiesApi.get(communityId).then((c) => { setCommunity(c); setError(false); }).catch(() => setError(true)).finally(() => setLoading(false));
  }, [communityId, navigation]);

  const handleRemoveGroup = (conversationId: string) => {
    Alert.alert(tr("Olib tashlash"), tr("Bu guruhni jamiyatdan olib tashlamoqchimisiz?"), [
      { text: tr("Bekor qilish"), style: "cancel" },
      {
        text: tr("Olib tashlash"),
        style: "destructive",
        onPress: async () => {
          try {
            await communitiesApi.removeGroup(communityId, conversationId);
            setCommunity((prev) =>
              prev ? { ...prev, groups: prev.groups?.filter((g) => g.conversationId !== conversationId) } : prev
            );
          } catch {
            Alert.alert(tr("Xatolik"), tr("Guruhni olib tashlab bo'lmadi"));
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  if (error || !community) {
    return <ErrorView message={tr("Jamoa ma'lumotlarini yuklab bo'lmadi")} onRetry={() => { setLoading(true); communitiesApi.get(communityId).then((c) => { setCommunity(c); setError(false); }).catch(() => setError(true)).finally(() => setLoading(false)); }} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{community.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{community.name}</Text>
        {community.description && <Text style={styles.description}>{community.description}</Text>}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{community.groups?.length ?? 0}</Text>
            <Text style={styles.statLabel}>{tr("Guruhlar")}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{community.memberCount}</Text>
            <Text style={styles.statLabel}>{tr("A'zolar")}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{tr("Guruhlar")}</Text>

      <FlatList
        data={community.groups ?? []}
        keyExtractor={(item) => item.conversationId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.groupCard}
            onPress={() => navigation.navigate("ChatRoom", { conversationId: item.conversationId, title: item.conversation?.name ?? "Guruh" })}
            onLongPress={() => handleRemoveGroup(item.conversationId)}
          >
            <View style={styles.groupAvatar}>
              <Text style={styles.groupAvatarText}>
                {(item.conversation?.name ?? "G").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{item.conversation?.name ?? "Guruh"}</Text>
              <Text style={styles.groupRole}>{item.role === "ANNOUNCEMENT" ? "E'lon kanali" : "Guruh"}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{tr("Guruhlar yo'q")}</Text>
            <Text style={styles.emptyHint}>{tr("Jamiyatga guruhlar qo'shing")}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.surface, padding: 24, alignItems: "center", borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { fontSize: 30, fontWeight: "700", color: "#fff" },
  name: { fontSize: 22, fontWeight: "700", color: colors.text },
  description: { fontSize: 14, color: colors.textSecondary, marginTop: 6, textAlign: "center" },
  statsRow: { flexDirection: "row", gap: 40, marginTop: 16 },
  stat: { alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  groupCard: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, alignItems: "center", gap: 12 },
  groupAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  groupAvatarText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 15, fontWeight: "600", color: colors.text },
  groupRole: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  emptyContainer: { alignItems: "center", paddingTop: 40 },
  emptyText: { fontSize: 15, fontWeight: "600", color: colors.text },
  emptyHint: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
});
