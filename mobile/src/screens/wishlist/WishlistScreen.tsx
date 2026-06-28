import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl, Image } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { wishlistApi, WishlistItem } from "../../api/wishlist";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "Wishlist">;

export function WishlistScreen({ navigation }: Props) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    wishlistApi.getAll().then(setItems).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    wishlistApi.getAll().then(setItems).catch(() => {}).finally(() => setRefreshing(false));
  }, []);

  const removeItem = (productId: string) => {
    Alert.alert("O'chirish", "Istaklar ro'yxatidan olib tashlansinmi?", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "O'chirish", style: "destructive", onPress: async () => {
        await wishlistApi.remove(productId).catch(() => {});
        setItems((prev) => prev.filter((i) => i.productId !== productId));
      }},
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
    return <ErrorView message="Istaklar ro'yxatini yuklab bo'lmadi" onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      {items.length > 0 && (
        <View style={styles.headerCard}>
          <Text style={styles.headerIcon}>❤️</Text>
          <Text style={styles.headerCount}>{items.length} ta mahsulot</Text>
        </View>
      )}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("ProductView", { productId: item.productId, storeId: item.product.store.id })}
            onLongPress={() => removeItem(item.productId)}
          >
            {item.product.imageUrls?.[0] ? (
              <Image source={{ uri: item.product.imageUrls[0] }} style={styles.itemImage} />
            ) : (
              <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                <Text style={styles.itemImageText}>🛍️</Text>
              </View>
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{item.product.name}</Text>
              <Text style={styles.itemStore}>{item.product.store.name}</Text>
              <Text style={styles.itemPrice}>{Number(item.product.price).toLocaleString()} {item.product.currency}</Text>
            </View>
            <TouchableOpacity onPress={() => removeItem(item.productId)} hitSlop={8} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>❤️</Text>
            <Text style={styles.emptyTitle}>Istaklar ro'yxati bo'sh</Text>
            <Text style={styles.emptyHint}>Bozordan yoqtirgan mahsulotlarni qo'shing</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate("Marketplace")}>
              <Text style={styles.browseBtnText}>Bozorga o'tish</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  headerIcon: { fontSize: 18 },
  headerCount: { fontSize: 15, fontWeight: "600", color: colors.text },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  itemImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: colors.background },
  itemImagePlaceholder: { alignItems: "center", justifyContent: "center" },
  itemImageText: { fontSize: 24 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "600", color: colors.text },
  itemStore: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  itemPrice: { fontSize: 15, fontWeight: "700", color: colors.primary, marginTop: 4 },
  removeBtn: { padding: 8 },
  removeBtnText: { fontSize: 16, color: colors.textSecondary },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
  browseBtn: { marginTop: 20, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  browseBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
