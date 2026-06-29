import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { botsApi, Bot } from "../../api/bots";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "BotStore">;

export function BotStoreScreen({ navigation }: Props) {
  const [tab, setTab] = useState<"search" | "mine">("search");
  const [bots, setBots] = useState<Bot[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      if (tab === "mine") {
        setBots(await botsApi.listMine());
      } else {
        setBots(await botsApi.search(search.trim() || undefined));
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [tab, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (tab === "mine") {
        setBots(await botsApi.listMine());
      } else {
        setBots(await botsApi.search(search.trim() || undefined));
      }
    } catch {}
    setRefreshing(false);
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);

  const renderBot = ({ item }: { item: Bot }) => (
    <TouchableOpacity
      style={styles.botCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate("BotDetail", { botId: item.id })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>🤖</Text>
      </View>
      <View style={styles.botInfo}>
        <Text style={styles.botName}>{item.displayName}</Text>
        <Text style={styles.botUsername}>@{item.username}</Text>
        {item.description && (
          <Text style={styles.botDesc} numberOfLines={2}>{item.description}</Text>
        )}
        <View style={styles.badgeRow}>
          {item.isInline && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Inline</Text>
            </View>
          )}
          {!item.isActive && (
            <View style={[styles.badge, styles.badgeInactive]}>
              <Text style={[styles.badgeText, styles.badgeInactiveText]}>Nofaol</Text>
            </View>
          )}
          <Text style={styles.cmdCount}>{item.commands.length} buyruq</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(["search", "mine"] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "search" ? "🤖 Botlar" : "👤 Mening"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "search" && (
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Botlarni qidirish..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {tab === "mine" && (
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate("CreateBot")} activeOpacity={0.7}>
          <Text style={styles.createBtnText}>+ Yangi bot yaratish</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <ErrorView message="Botlarni yuklab bo'lmadi" onRetry={load} />
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={bots}
          keyExtractor={(item) => item.id}
          renderItem={renderBot}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{tab === "mine" ? "🤖" : "🔍"}</Text>
              <Text style={styles.emptyTitle}>{tab === "mine" ? "Botlar yo'q" : "Topilmadi"}</Text>
              <Text style={styles.emptyHint}>
                {tab === "mine" ? "O'zingizning botingizni yarating" : "Boshqa kalit so'z bilan qidiring"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", padding: 12, gap: 8, backgroundColor: colors.surface },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.background, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, height: "100%", padding: 0 },
  searchClear: { fontSize: 16, color: colors.textSecondary, paddingHorizontal: 4 },
  createBtn: {
    marginHorizontal: 16,
    marginTop: 12,
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
  botCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#34C759" + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 24 },
  botInfo: { flex: 1 },
  botName: { fontSize: 16, fontWeight: "600", color: colors.text },
  botUsername: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  botDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 6, alignItems: "center" },
  badge: { backgroundColor: "#007AFF" + "15", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: "600", color: "#007AFF" },
  badgeInactive: { backgroundColor: "#FF9500" + "15" },
  badgeInactiveText: { color: "#FF9500" },
  cmdCount: { fontSize: 11, color: colors.textSecondary },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
