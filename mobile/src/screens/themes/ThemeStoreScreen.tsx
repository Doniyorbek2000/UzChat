import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { themesApi, SharedTheme } from "../../api/themes";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "ThemeStore">;

export function ThemeStoreScreen({ navigation }: Props) {
  const [tab, setTab] = useState<"popular" | "mine">("popular");
  const [themes, setThemes] = useState<SharedTheme[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      if (debouncedSearch.trim()) {
        setThemes(await themesApi.search(debouncedSearch.trim()));
      } else if (tab === "mine") {
        setThemes(await themesApi.listMine());
      } else {
        setThemes(await themesApi.listPopular());
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [tab, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const handleInstall = async (themeId: string) => {
    try {
      await themesApi.install(themeId);
      Alert.alert(tr("Muvaffaqiyat"), tr("Mavzu o'rnatildi!"));
    } catch {
      Alert.alert(tr("Xatolik"), tr("Mavzuni o'rnatib bo'lmadi"));
    }
  };

  const renderTheme = ({ item }: { item: SharedTheme }) => (
    <TouchableOpacity style={styles.themeCard} activeOpacity={0.7} onPress={() => handleInstall(item.id)}>
      <View style={styles.preview}>
        <View style={[styles.previewBg, { backgroundColor: item.backgroundColor }]}>
          <View style={[styles.previewHeader, { backgroundColor: item.surfaceColor }]}>
            <View style={[styles.previewDot, { backgroundColor: item.primaryColor }]} />
            <View style={[styles.previewBar, { backgroundColor: item.textColor, opacity: 0.3 }]} />
          </View>
          <View style={styles.previewBody}>
            <View style={[styles.msgBubble, { backgroundColor: item.primaryColor }]} />
            <View style={[styles.msgBubbleRight, { backgroundColor: item.surfaceColor }]} />
          </View>
        </View>
      </View>
      <View style={styles.themeInfo}>
        <Text style={styles.themeName}>{item.name}</Text>
        {item.description && <Text style={styles.themeDesc} numberOfLines={1}>{item.description}</Text>}
        <View style={styles.themeMeta}>
          <View style={[styles.metaBadge, { backgroundColor: item.isDark ? "#5856D6" + "15" : "#FF9500" + "15" }]}>
            <Text style={[styles.metaBadgeText, { color: item.isDark ? "#5856D6" : "#FF9500" }]}>
              {item.isDark ? "🌙 Qorong'u" : "☀️ Yorug'"}
            </Text>
          </View>
          <Text style={styles.installCount}>📥 {item.installCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={tr("Mavzularni qidirish...")}
          returnKeyType="search"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        {(["popular", "mine"] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => { setTab(t); setSearch(""); }}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "popular" ? "⭐ Mashhur" : "👤 Mening"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "mine" && (
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate("CreateTheme")} activeOpacity={0.7}>
          <Text style={styles.createBtnText}>+ Yangi mavzu yaratish</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <ErrorView message={tr("Mavzularni yuklab bo'lmadi")} onRetry={load} />
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={themes}
          keyExtractor={(item) => item.id}
          renderItem={renderTheme}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load().finally(() => setRefreshing(false)); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{search.trim() ? "🔍" : "🎨"}</Text>
              <Text style={styles.emptyTitle}>{search.trim() ? "Topilmadi" : tab === "mine" ? "Mavzularingiz yo'q" : "Mavzular yo'q"}</Text>
              <Text style={styles.emptyHint}>
                {search.trim() ? "Boshqa kalit so'z bilan qidiring" : tab === "mine" ? "O'z mavzuingizni yarating" : "Tez orada yangi mavzular qo'shiladi"}
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
  tabs: { flexDirection: "row", paddingHorizontal: 12, gap: 8, marginTop: 12, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  createBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
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
  list: { paddingHorizontal: 8, paddingBottom: 20 },
  row: { justifyContent: "space-between", paddingHorizontal: 8 },
  themeCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  preview: { height: 120 },
  previewBg: { flex: 1, padding: 6 },
  previewHeader: { height: 24, borderRadius: 4, flexDirection: "row", alignItems: "center", paddingHorizontal: 6, gap: 4, marginBottom: 6 },
  previewDot: { width: 10, height: 10, borderRadius: 5 },
  previewBar: { flex: 1, height: 4, borderRadius: 2 },
  previewBody: { flex: 1, gap: 4, justifyContent: "center" },
  msgBubble: { width: "60%", height: 14, borderRadius: 7, opacity: 0.8 },
  msgBubbleRight: { width: "50%", height: 14, borderRadius: 7, alignSelf: "flex-end", opacity: 0.5 },
  themeInfo: { padding: 10 },
  themeName: { fontSize: 14, fontWeight: "600", color: colors.text },
  themeDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  themeMeta: { flexDirection: "row", gap: 8, marginTop: 6, alignItems: "center" },
  metaBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  metaBadgeText: { fontSize: 9, fontWeight: "600" },
  installCount: { fontSize: 10, color: colors.textSecondary },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
