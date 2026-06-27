import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { wishlistApi, WishlistItem } from "../../api/wishlist";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Wishlist">;

export function WishlistScreen({ navigation }: Props) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    wishlistApi.getAll().then(setItems).catch(() => {}).finally(() => setLoading(false));
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
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemCard}
            onPress={() => navigation.navigate("ProductView", { productId: item.productId, storeId: item.product.store.id })}
            onLongPress={() => removeItem(item.productId)}
          >
            <View style={styles.itemImage}>
              <Text style={styles.itemImageText}>🛍️</Text>
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{item.product.name}</Text>
              <Text style={styles.itemStore}>{item.product.store.name}</Text>
              <Text style={styles.itemPrice}>{Number(item.product.price).toLocaleString()} {item.product.currency}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>❤️</Text>
            <Text style={styles.emptyText}>Istaklar ro'yxati bo'sh</Text>
            <Text style={styles.emptyHint}>Bozordan mahsulotlar qo'shing</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  list: { padding: 12, paddingBottom: 20 },
  itemCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 6, gap: 12 },
  itemImage: { width: 56, height: 56, borderRadius: 10, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  itemImageText: { fontSize: 24 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "600", color: "#333" },
  itemStore: { fontSize: 12, color: "#888", marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: "700", color: colors.primary, marginTop: 4 },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#333", marginTop: 12 },
  emptyHint: { fontSize: 13, color: "#888", marginTop: 4 },
});
