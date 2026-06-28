import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Image, RefreshControl, Dimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/types";
import { miniAppsApi, MiniApp } from "../../api/miniapps";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "MiniApps">;

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 10;
const CARD_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;

const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  all: { icon: "🌐", color: "#007AFF" },
  mine: { icon: "👤", color: "#5856D6" },
  transport: { icon: "🚕", color: "#FF9500" },
  food: { icon: "🍽️", color: "#FF3B30" },
  health: { icon: "🏥", color: "#34C759" },
  shopping: { icon: "🛍️", color: "#FF2D55" },
  finance: { icon: "💰", color: "#007AFF" },
  games: { icon: "🎮", color: "#AF52DE" },
  news: { icon: "📰", color: "#32ADE6" },
  entertainment: { icon: "🎬", color: "#FF9500" },
  travel: { icon: "✈️", color: "#00C7BE" },
  other: { icon: "📦", color: "#8E8E93" },
};

const CATEGORIES = [
  { key: "all", label: "Barchasi" },
  { key: "mine", label: "Mening" },
  { key: "transport", label: "Transport" },
  { key: "food", label: "Ovqat" },
  { key: "health", label: "Sog'liq" },
  { key: "shopping", label: "Xaridlar" },
  { key: "finance", label: "Moliya" },
  { key: "games", label: "O'yinlar" },
  { key: "news", label: "Yangiliklar" },
  { key: "entertainment", label: "Ko'ngilochar" },
  { key: "travel", label: "Sayohat" },
  { key: "other", label: "Boshqa" },
];

export function MiniAppsScreen({ navigation }: Props) {
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate("CreateMiniApp")} style={styles.headerBtn}>
          <View style={styles.headerBtnInner}>
            <Text style={styles.headerBtnText}>+</Text>
          </View>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const [apps, setApps] = useState<MiniApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const list = category === "mine"
        ? await miniAppsApi.listMine()
        : await miniAppsApi.list(category === "all" ? undefined : category);
      setApps(list);
      setError(false);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      loadApps();
    }, [loadApps])
  );

  const filtered = apps.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const renderApp = ({ item }: { item: MiniApp }) => {
    const catConfig = CATEGORY_CONFIG[item.category ?? "other"] ?? CATEGORY_CONFIG.other;
    return (
      <TouchableOpacity
        style={styles.appCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate("MiniAppView", { id: item.id, name: item.name, url: item.url })}
      >
        {item.iconUrl ? (
          <Image source={{ uri: item.iconUrl }} style={styles.appIcon} />
        ) : (
          <View style={[styles.appIcon, styles.appIconPlaceholder, { backgroundColor: catConfig.color }]}>
            <Text style={styles.appIconText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.appInfo}>
          <Text style={styles.appName} numberOfLines={1}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.appDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={styles.appMeta}>
            <View style={[styles.categoryDot, { backgroundColor: catConfig.color }]} />
            <Text style={styles.appCreator}>@{item.creator.username}</Text>
          </View>
        </View>
        <View style={styles.openBtnContainer}>
          <Text style={styles.openBtnText}>Ochish</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Mini-dastur qidirish..."
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

      <FlatList
        keyboardShouldPersistTaps="handled"
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        contentContainerStyle={styles.categoryContent}
        renderItem={({ item }) => {
          const active = category === item.key;
          const config = CATEGORY_CONFIG[item.key] ?? CATEGORY_CONFIG.other;
          return (
            <TouchableOpacity
              style={[styles.categoryChip, active && { backgroundColor: config.color, borderColor: config.color }]}
              onPress={() => setCategory(item.key)}
            >
              <Text style={styles.categoryIcon}>{config.icon}</Text>
              <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {search.trim().length > 0 && !loading && (
        <Text style={styles.resultCount}>{filtered.length} ta natija</Text>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      {loading && apps.length === 0 ? (
        <>
          {renderHeader()}
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Yuklanmoqda...</Text>
          </View>
        </>
      ) : error ? (
        <>
          {renderHeader()}
          <ErrorView message="Mini-dasturlarni yuklab bo'lmadi" onRetry={loadApps} />
        </>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadApps().finally(() => setRefreshing(false)); }} tintColor={colors.primary} />}
          ListHeaderComponent={renderHeader}
          renderItem={renderApp}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{category === "mine" ? "🧩" : "🔍"}</Text>
              <Text style={styles.emptyTitle}>
                {category === "mine" ? "Mini-dasturlar yo'q" : "Topilmadi"}
              </Text>
              <Text style={styles.emptyHint}>
                {category === "mine"
                  ? "O'zingizning mini-dasturingizni yarating"
                  : "Boshqa kategoriya yoki kalit so'z bilan qidiring"
                }
              </Text>
              {category === "mine" && (
                <TouchableOpacity
                  style={styles.createPromptBtn}
                  onPress={() => navigation.navigate("CreateMiniApp")}
                >
                  <Text style={styles.createPromptBtnText}>+ Yaratish</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48, gap: 12 },
  loadingText: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  headerBtn: { marginRight: 8 },
  headerBtnInner: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  headerBtnText: { color: "#fff", fontSize: 22, fontWeight: "400", marginTop: -1 },
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
  resultCount: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: 16, marginBottom: 8 },
  categoryList: { flexGrow: 0, marginTop: 12, marginBottom: 12 },
  categoryContent: { paddingHorizontal: 16, gap: 8 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryIcon: { fontSize: 14 },
  categoryText: { fontSize: 13, color: colors.text, fontWeight: "500" },
  categoryTextActive: { color: "#fff", fontWeight: "600" },
  listContent: { paddingBottom: 24 },
  appCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appIcon: { width: 52, height: 52, borderRadius: 14 },
  appIconPlaceholder: { alignItems: "center", justifyContent: "center" },
  appIconText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  appInfo: { flex: 1 },
  appName: { fontSize: 15, fontWeight: "600", color: colors.text },
  appDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 3, lineHeight: 16 },
  appMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  categoryDot: { width: 6, height: 6, borderRadius: 3 },
  appCreator: { fontSize: 11, color: colors.textSecondary },
  openBtnContainer: { backgroundColor: colors.primary + "15", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  openBtnText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
  createPromptBtn: { marginTop: 20, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  createPromptBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
