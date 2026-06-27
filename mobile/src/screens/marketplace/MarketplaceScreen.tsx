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
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Marketplace">;

const CATEGORIES = [
  { key: "all", label: "Barchasi" },
  { key: "electronics", label: "Elektronika" },
  { key: "clothing", label: "Kiyimlar" },
  { key: "food", label: "Oziq-ovqat" },
  { key: "home", label: "Uy-joy" },
  { key: "beauty", label: "Go'zallik" },
  { key: "general", label: "Boshqa" },
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
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const loadStores = useCallback(async () => {
    try {
      const result = await marketplaceApi.listStores(category === "all" ? undefined : category);
      setStores(result.stores);
    } catch {}
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
      <TextInput
        style={styles.searchInput}
        placeholder="Do'kon qidirish..."
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        contentContainerStyle={styles.categoryContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryChip, category === item.key && styles.categoryChipActive]}
            onPress={() => setCategory(item.key)}
          >
            <Text style={[styles.categoryText, category === item.key && styles.categoryTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.storeCard}
              onPress={() => navigation.navigate("StoreView", { storeId: item.id })}
            >
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.storeAvatar} />
              ) : (
                <View style={[styles.storeAvatar, styles.storePlaceholder]}>
                  <Text style={styles.storeAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{item.name}</Text>
                {item.description && <Text style={styles.storeDesc} numberOfLines={2}>{item.description}</Text>}
                <Text style={styles.storeInfo}>
                  {item._count?.products ?? 0} ta mahsulot · @{item.owner?.username}
                </Text>
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
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    margin: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryList: { flexGrow: 0, marginTop: 12 },
  categoryContent: { paddingHorizontal: 16, gap: 8 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { fontSize: 13, color: colors.textSecondary },
  categoryTextActive: { color: "#fff", fontWeight: "600" },
  list: { padding: 16 },
  storeCard: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  storeAvatar: { width: 50, height: 50, borderRadius: 12 },
  storePlaceholder: { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  storeAvatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  storeName: { fontSize: 15, fontWeight: "600", color: colors.text },
  storeDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  storeInfo: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
});
