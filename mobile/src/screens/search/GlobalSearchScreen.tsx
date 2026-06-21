import React, { useState, useCallback } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { searchApi, SearchResult, SearchHistoryItem } from "../../api/search";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "GlobalSearch">;
type SearchTab = "all" | "users" | "groups" | "channels" | "messages";

export function GlobalSearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchTab>("all");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  useState(() => {
    searchApi.getHistory().then(setHistory).catch(() => {});
  });

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setShowHistory(false);
    try {
      const type = tab === "all" ? undefined : tab;
      const data = await searchApi.search(query.trim(), type as any);
      setResults(data);
    } catch {}
    setLoading(false);
  }, [query, tab]);

  const handleHistoryPress = (q: string) => {
    setQuery(q);
    setShowHistory(false);
    setLoading(true);
    searchApi.search(q).then(setResults).catch(() => {}).finally(() => setLoading(false));
  };

  const clearHistory = async () => {
    await searchApi.clearHistory().catch(() => {});
    setHistory([]);
  };

  const TABS: { key: SearchTab; label: string }[] = [
    { key: "all", label: "Barchasi" },
    { key: "users", label: "Odamlar" },
    { key: "groups", label: "Guruhlar" },
    { key: "channels", label: "Kanallar" },
    { key: "messages", label: "Xabarlar" },
  ];

  const allResults: any[] = [];
  if (results) {
    if (results.users?.length) allResults.push({ type: "header", title: "Foydalanuvchilar" }, ...results.users.map((u) => ({ ...u, type: "user" as const })));
    if (results.groups?.length) allResults.push({ type: "header", title: "Guruhlar" }, ...results.groups.map((g) => ({ ...g, type: "group" as const })));
    if (results.channels?.length) allResults.push({ type: "header", title: "Kanallar" }, ...results.channels.map((c) => ({ ...c, type: "channel" as const })));
    if (results.messages?.length) allResults.push({ type: "header", title: "Xabarlar" }, ...results.messages.map((m) => ({ ...m, type: "message" as const })));
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Qidirish..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={(t) => { setQuery(t); if (!t.trim()) setShowHistory(true); }}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
        />
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => { setTab(t.key); if (query.trim()) handleSearch(); }}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {showHistory && history.length > 0 && (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>So'nggi qidiruvlar</Text>
            <TouchableOpacity onPress={clearHistory}>
              <Text style={styles.clearBtn}>Tozalash</Text>
            </TouchableOpacity>
          </View>
          {history.map((h) => (
            <TouchableOpacity key={h.id} style={styles.historyItem} onPress={() => handleHistoryPress(h.query)}>
              <Text style={styles.historyIcon}>🕐</Text>
              <Text style={styles.historyQuery}>{h.query}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={allResults}
          keyExtractor={(item, i) => item.id ?? `header-${i}`}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return <Text style={styles.sectionHeader}>{item.title}</Text>;
            }
            if (item.type === "user") {
              return (
                <TouchableOpacity style={styles.resultRow} onPress={() => navigation.navigate("UserProfile", { userId: item.id })}>
                  <View style={styles.resultAvatar}><Text style={styles.resultAvatarText}>{item.displayName?.charAt(0)}</Text></View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{item.displayName} {item.isVerified ? "✅" : ""}</Text>
                    <Text style={styles.resultSub}>@{item.username}</Text>
                  </View>
                </TouchableOpacity>
              );
            }
            if (item.type === "group" || item.type === "channel") {
              return (
                <TouchableOpacity style={styles.resultRow} onPress={() => navigation.navigate("ChatRoom", { conversationId: item.id, title: item.name ?? "" })}>
                  <View style={[styles.resultAvatar, { backgroundColor: item.type === "channel" ? "#FF9500" : colors.primary }]}><Text style={styles.resultAvatarText}>{(item.name ?? "?").charAt(0)}</Text></View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultSub}>{item._count?.participants ?? 0} a'zo</Text>
                  </View>
                </TouchableOpacity>
              );
            }
            if (item.type === "message") {
              return (
                <TouchableOpacity style={styles.resultRow} onPress={() => navigation.navigate("ChatRoom", { conversationId: item.conversationId, title: item.conversation?.name ?? "", highlightMessageId: item.id })}>
                  <View style={[styles.resultAvatar, { backgroundColor: "#C7C7CC" }]}><Text style={styles.resultAvatarText}>💬</Text></View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{item.sender?.displayName}</Text>
                    <Text style={styles.resultSub} numberOfLines={1}>{item.conversation?.name} · {new Date(item.createdAt).toLocaleDateString("uz-UZ")}</Text>
                  </View>
                </TouchableOpacity>
              );
            }
            return null;
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !showHistory && !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>{query.trim() ? "Natija topilmadi" : "Qidirish uchun yozing"}</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  searchBar: { paddingHorizontal: 12, paddingTop: 8 },
  searchInput: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, color: "#333" },
  tabs: { flexDirection: "row", paddingHorizontal: 12, paddingTop: 10, gap: 6 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: "#E5E5EA" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: "600", color: "#666" },
  tabTextActive: { color: "#fff" },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 12, paddingBottom: 20, paddingTop: 8 },
  sectionHeader: { fontSize: 14, fontWeight: "600", color: "#888", marginTop: 12, marginBottom: 6 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 4 },
  resultAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  resultAvatarText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: "600", color: "#333" },
  resultSub: { fontSize: 12, color: "#888", marginTop: 1 },
  historySection: { paddingHorizontal: 12, paddingTop: 12 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  historyTitle: { fontSize: 14, fontWeight: "600", color: "#666" },
  clearBtn: { fontSize: 13, color: colors.primary },
  historyItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  historyIcon: { fontSize: 14 },
  historyQuery: { fontSize: 15, color: "#333" },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#333", marginTop: 12 },
});
