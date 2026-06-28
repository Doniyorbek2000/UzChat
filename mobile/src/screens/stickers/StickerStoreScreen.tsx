import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Image, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { stickersApi, StickerPack } from "../../api/stickers";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "StickerStore">;

export function StickerStoreScreen({ navigation }: Props) {
  const [tab, setTab] = useState<"featured" | "installed" | "mine">("featured");
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const renderPack = ({ item }: { item: StickerPack }) => (
    <TouchableOpacity
      style={styles.packCard}
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
        {item.isAnimated && <Text style={styles.animatedBadge}>Animatsion</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Stiker to'plamlarini qidirish..."
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
      />

      <View style={styles.tabs}>
        {(["featured", "installed", "mine"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => { setTab(t); setSearch(""); }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "featured" ? "Mashhur" : t === "installed" ? "O'rnatilgan" : "Mening"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : error ? (
        <ErrorView message="Stikerlarni yuklab bo'lmadi" onRetry={load} />
      ) : (
        <FlatList
          data={packs}
          keyExtractor={(item) => item.id}
          renderItem={renderPack}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Stiker to'plami topilmadi</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  searchInput: {
    margin: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  tabs: { flexDirection: "row", paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: "#E5E5EA", alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  packCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: "center",
    gap: 12,
  },
  coverImage: { width: 60, height: 60, borderRadius: 12 },
  coverPlaceholder: { backgroundColor: "#F0F0F5", alignItems: "center", justifyContent: "center" },
  coverEmoji: { fontSize: 28 },
  packInfo: { flex: 1 },
  packName: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 4 },
  packMeta: { fontSize: 12, color: colors.textSecondary },
  animatedBadge: { fontSize: 11, color: colors.primary, fontWeight: "600", marginTop: 2 },
  emptyText: { textAlign: "center", color: colors.textSecondary, fontSize: 15, padding: 40 },
});
