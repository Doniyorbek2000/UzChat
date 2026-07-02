import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { communitiesApi, Community } from "../../api/communities";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Communities">;

export function CommunitiesScreen({ navigation }: Props) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    communitiesApi.listMine().then(setCommunities).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    communitiesApi.listMine().then(setCommunities).catch(() => {}).finally(() => setRefreshing(false));
  }, []);

  const handleDelete = (communityId: string) => {
    Alert.alert(tr("O'chirish"), tr("Bu jamiyatni o'chirmoqchimisiz?"), [
      { text: tr("Bekor qilish"), style: "cancel" },
      {
        text: tr("O'chirish"),
        style: "destructive",
        onPress: async () => {
          try {
            await communitiesApi.delete(communityId);
            setCommunities((prev) => prev.filter((c) => c.id !== communityId));
          } catch {
            Alert.alert(tr("Xatolik"), tr("Jamiyatni o'chirib bo'lmadi"));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message={tr("Jamiyatlarni yuklab bo'lmadi")} onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate("CreateCommunity")} activeOpacity={0.7}>
        <Text style={styles.createBtnText}>+ Yangi jamiyat yaratish</Text>
      </TouchableOpacity>

      <FlatList
        data={communities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.communityCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("CommunityView", { communityId: item.id })}
            onLongPress={() => handleDelete(item.id)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              {item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
              <View style={styles.metaRow}>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeText}>{item.groups?.length ?? 0} guruh</Text>
                </View>
                <View style={[styles.metaBadge, styles.metaBadgeMember]}>
                  <Text style={[styles.metaBadgeText, styles.metaBadgeMemberText]}>{item.memberCount} a'zo</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏘️</Text>
            <Text style={styles.emptyTitle}>{tr("Jamiyatlar yo'q")}</Text>
            <Text style={styles.emptyHint}>{tr("Guruhlarni birlashtirish uchun jamiyat yarating")}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  createBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  createBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  communityCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "700", color: "#fff" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  desc: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  metaRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  metaBadge: { backgroundColor: "#007AFF" + "15", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  metaBadgeText: { fontSize: 10, fontWeight: "600", color: "#007AFF" },
  metaBadgeMember: { backgroundColor: "#34C759" + "15" },
  metaBadgeMemberText: { color: "#34C759" },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
