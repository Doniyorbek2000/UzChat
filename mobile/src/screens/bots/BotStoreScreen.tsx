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
          {item.isInline && <Text style={styles.badge}>Inline</Text>}
          {!item.isActive && <Text style={[styles.badge, styles.badgeInactive]}>Nofaol</Text>}
          <Text style={styles.cmdCount}>{item.commands.length} buyruq</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "search" && styles.tabActive]}
          onPress={() => setTab("search")}
        >
          <Text style={[styles.tabText, tab === "search" && styles.tabTextActive]}>Botlar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "mine" && styles.tabActive]}
          onPress={() => setTab("mine")}
        >
          <Text style={[styles.tabText, tab === "mine" && styles.tabTextActive]}>Mening botlarim</Text>
        </TouchableOpacity>
      </View>

      {tab === "search" && (
        <TextInput
          style={styles.searchInput}
          placeholder="Botlarni qidirish..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      )}

      {tab === "mine" && (
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate("CreateBot")}>
          <Text style={styles.createBtnText}>+ Yangi bot yaratish</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
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
          ListEmptyComponent={<Text style={styles.emptyText}>Bot topilmadi</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  tabs: { flexDirection: "row", padding: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.background, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  searchInput: {
    marginHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    marginBottom: 8,
  },
  createBtn: {
    marginHorizontal: 12,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  createBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  botCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 24 },
  botInfo: { flex: 1 },
  botName: { fontSize: 16, fontWeight: "600", color: colors.text },
  botUsername: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  botDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 6, alignItems: "center" },
  badge: { fontSize: 10, fontWeight: "600", color: colors.primary, backgroundColor: "#E3F2FD", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeInactive: { color: colors.warning, backgroundColor: "#FFF3E0" },
  cmdCount: { fontSize: 11, color: colors.textSecondary },
  emptyText: { textAlign: "center", color: colors.textSecondary, fontSize: 15, padding: 40 },
});
