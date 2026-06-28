import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, Image, RefreshControl,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/types";
import { marketplaceApi, Store } from "../../api/marketplace";
import { EmptyState } from "../../components/EmptyState";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Marketplace">;

const CATEGORIES = [
  { key: "all", label: "Barchasi", icon: "🌐" },
  { key: "electronics", label: "Elektronika", icon: "📱" },
  { key: "clothing", label: "Kiyimlar", icon: "👕" },
  { key: "food", label: "Oziq-ovqat", icon: "🍽️" },
  { key: "home", label: "Uy-joy", icon: "🏠" },
  { key: "beauty", label: "Go'zallik", icon: "💄" },
  { key: "general", label: "Boshqa", icon: "📦" },
];

export function MarketplaceScreen({ navigation }: Props) {
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 12, marginRight: 8 }}>
          <TouchableOpacity onPress={() => navigation.navigate("MyStores")}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>Do'konlarim</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("MyOrders")}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>Buyurtmalar</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const loadStores = useCallback(async () => {
    setError(false);
    try {
      const result = await marketplaceApi.listStores(category === "all" ? undefined : category);
      setStores(result.stores);
    } catch {
      setError(true);
    }
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadStores().finally(() => setLoading(false));
    }, [loadStores])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStores();
    setRefreshing(false);
  };

  const filtered = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Do'kon qidirish..."
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
          return (
            <TouchableOpacity
              style={[styles.categoryChip, active && styles.categoryChipActive]}
              onPress={() => setCategory(item.key)}
            >
              <Text style={styles.categoryIcon}>{item.icon}</Text>
              <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {search.trim().length > 0 && !loading && (
        <Text style={styles.resultCount}>{filtered.length} ta do'kon</Text>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Yuklanmoqda...</Text>
        </View>
      ) : error ? (
        <ErrorView message="Do'konlarni yuklab bo'lmadi" onRetry={() => { setLoading(true); loadStores().finally(() => setLoading(false)); }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.storeCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("StoreView", { storeId: item.id })}
            >
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.storeAvatar} />
              ) : (
                <View style={[styles.storeAvatar, styles.storePlaceholder]}>
                  <Text style={styles.storeAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{item.name}</Text>
                {item.description && <Text style={styles.storeDesc} numberOfLines={2}>{item.description}</Text>}
                <View style={styles.storeMetaRow}>
                  <Text style={styles.storeMetaText}>{item._count?.products ?? 0} ta mahsulot</Text>
                  <Text style={styles.storeMetaDot}>·</Text>
                  <Text style={styles.storeMetaText}>@{item.owner?.username}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="🛒"
              title="Do'konlar topilmadi"
              subtitle="Yangi do'kon ochish uchun pastdagi tugmani bosing"
              actionLabel="Do'kon ochish"
              onAction={() => navigation.navigate("CreateStore")}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, color: colors.textSecondary },
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
  resultCount: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: 16, marginBottom: 4 },
  categoryList: { flexGrow: 0, marginTop: 12, marginBottom: 8 },
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
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryIcon: { fontSize: 14 },
  categoryText: { fontSize: 13, color: colors.text, fontWeight: "500" },
  categoryTextActive: { color: "#fff", fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  storeCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  storeAvatar: { width: 52, height: 52, borderRadius: 14 },
  storePlaceholder: { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  storeAvatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 16, fontWeight: "600", color: colors.text },
  storeDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 3, lineHeight: 18 },
  storeMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  storeMetaText: { fontSize: 12, color: colors.textSecondary },
  storeMetaDot: { fontSize: 12, color: colors.textSecondary },
});
