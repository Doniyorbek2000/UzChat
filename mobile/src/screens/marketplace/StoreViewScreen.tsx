import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Image, RefreshControl,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/types";
import { marketplaceApi, Store, Product } from "../../api/marketplace";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "StoreView">;

export function StoreViewScreen({ route, navigation }: Props) {
  const { storeId } = route.params;
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([
        marketplaceApi.getStore(storeId),
        marketplaceApi.listProducts(storeId),
      ]);
      setStore(s);
      setProducts(p.products);
    } catch {}
  }, [storeId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const formatPrice = (price: number, currency: string) => {
    return `${price.toLocaleString()} ${currency}`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={products}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.gridRow}
      contentContainerStyle={styles.grid}
      ListHeaderComponent={
        store ? (
          <View style={styles.storeHeader}>
            {store.avatarUrl ? (
              <Image source={{ uri: store.avatarUrl }} style={styles.storeAvatar} />
            ) : (
              <View style={[styles.storeAvatar, styles.storePlaceholder]}>
                <Text style={styles.storeAvatarText}>{store.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.storeName}>{store.name}</Text>
            {store.description && <Text style={styles.storeDesc}>{store.description}</Text>}
            <Text style={styles.storeOwner}>@{store.owner?.username}</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.productCard}
          onPress={() => navigation.navigate("ProductView", { productId: item.id, storeId })}
        >
          {item.imageUrls.length > 0 ? (
            <Image source={{ uri: item.imageUrls[0] }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImage, styles.productImagePlaceholder]}>
              <Text style={styles.productImageText}>📦</Text>
            </View>
          )}
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>{formatPrice(item.price, item.currency)}</Text>
          {item.stock <= 0 && <Text style={styles.outOfStock}>Tugagan</Text>}
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>Mahsulotlar yo'q</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  storeHeader: { alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  storeAvatar: { width: 70, height: 70, borderRadius: 18, marginBottom: 10 },
  storePlaceholder: { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  storeAvatarText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  storeName: { fontSize: 20, fontWeight: "700", color: colors.text },
  storeDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: "center" },
  storeOwner: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  grid: { padding: 12 },
  gridRow: { gap: 12 },
  productCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productImage: { width: "100%", height: 140 },
  productImagePlaceholder: { backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  productImageText: { fontSize: 40 },
  productName: { fontSize: 14, fontWeight: "600", color: colors.text, padding: 10, paddingBottom: 2 },
  productPrice: { fontSize: 15, fontWeight: "700", color: colors.primary, paddingHorizontal: 10, paddingBottom: 10 },
  outOfStock: { fontSize: 12, color: colors.danger, paddingHorizontal: 10, paddingBottom: 8 },
});
