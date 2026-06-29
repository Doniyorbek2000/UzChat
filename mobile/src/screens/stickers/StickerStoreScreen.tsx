import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Image, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { stickersApi, StickerPack } from "../../api/stickers";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "StickerStore">;

const TAB_CONFIG = {
  featured: { label: "⭐ Mashhur", emptyIcon: "🌟", emptyTitle: "Mashhur stikerlar yo'q", emptyHint: "Tez orada yangi stikerlar qo'shiladi" },
  installed: { label: "📥 O'rnatilgan", emptyIcon: "📦", emptyTitle: "O'rnatilgan stikerlar yo'q", emptyHint: "Mashhur bo'limidan stiker to'plamlarini o'rnating" },
  mine: { label: "👤 Mening", emptyIcon: "🎨", emptyTitle: "Stiker to'plamingiz yo'q", emptyHint: "O'z stiker to'plamingizni yarating" },
} as const;

export function StickerStoreScreen({ navigation }: Props) {
  const [tab, setTab] = useState<"featured" | "installed" | "mine">("featured");
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      let data: StickerPack[];
      if (search.trim()) {
        data = await stickersApi.list(search.trim());
      } else if (tab === "featured") {
        data = await stickersApi.featured();
      } else if (tab === "installed") {
        data = await stickersApi.installed();
      } else {
        data = await stickersApi.myPacks();
      }
      setPacks(data);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      let data: StickerPack[];
      if (search.trim()) {
        data = await stickersApi.list(search.trim());
      } else if (tab === "featured") {
        data = await stickersApi.featured();
      } else if (tab === "installed") {
        data = await stickersApi.installed();
      } else {
        data = await stickersApi.myPacks();
      }
      setPacks(data);
    } catch {}
    setRefreshing(false);
  }, [tab, search]);

  const renderPack = ({ item }: { item: StickerPack }) => (
    <TouchableOpacity
      style={styles.packCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate("StickerPackView", { packId: item.id })}
    >
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={styles.coverImage} />
      ) : (
        <View style={[styles.coverImage, styles.coverPlaceholder]}>
          <Text style={styles.coverEmoji}>🎨</Text>
        </View>
      )}
      <View style={styles.packInfo}>
        <Text style={styles.packName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.packMeta}>
          {item.stickers.length} stiker · {item.installCount} o'rnatish
        </Text>
        <View style={styles.badgeRow}>
          {item.isAnimated && (
            <View style={styles.animatedBadge}>
              <Text style={styles.animatedBadgeText}>✨ Animatsion</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const tabConfig = TAB_CONFIG[tab];

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Stiker to'plamlarini qidirish..."
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

      <View style={styles.tabs}>
        {(["featured", "installed", "mine"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => { setTab(t); setSearch(""); }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {TAB_CONFIG[t].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "mine" && (
        <View style={styles.createHint}>
          <Text style={styles.createHintText}>📌 O'z stiker to'plamingizni yarating</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <ErrorView message="Stikerlarni yuklab bo'lmadi" onRetry={load} />
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={packs}
          keyExtractor={(item) => item.id}
          renderItem={renderPack}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{search.trim() ? "🔍" : tabConfig.emptyIcon}</Text>
              <Text style={styles.emptyTitle}>{search.trim() ? "Topilmadi" : tabConfig.emptyTitle}</Text>
              <Text style={styles.emptyHint}>
                {search.trim() ? "Boshqa kalit so'z bilan qidiring" : tabConfig.emptyHint}
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
  createHint: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.primary + "12",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  createHintText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 },
  packCard: {
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
  coverImage: { width: 64, height: 64, borderRadius: 14 },
  coverPlaceholder: { backgroundColor: "#FF9500" + "15", alignItems: "center", justifyContent: "center" },
  coverEmoji: { fontSize: 30 },
  packInfo: { flex: 1 },
  packName: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 3 },
  packMeta: { fontSize: 12, color: colors.textSecondary },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  animatedBadge: { backgroundColor: "#AF52DE" + "15", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  animatedBadgeText: { fontSize: 10, fontWeight: "600", color: "#AF52DE" },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
