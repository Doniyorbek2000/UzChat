import React, { useCallback, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Image, Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/types";
import { marketplaceApi, Product } from "../../api/marketplace";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ProductView">;

export function ProductViewScreen({ route, navigation }: Props) {
  const { productId, storeId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      marketplaceApi.listProducts(storeId)
        .then((res) => {
          const found = res.products.find((p) => p.id === productId);
          setProduct(found ?? null);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [productId, storeId])
  );

  const handleOrder = async () => {
    if (!product) return;
    setOrdering(true);
    try {
      await marketplaceApi.createOrder({
        storeId,
        items: [{ productId: product.id, quantity: 1 }],
      });
      Alert.alert("Muvaffaqiyat", "Buyurtma yaratildi!", [
        { text: "OK", onPress: () => navigation.navigate("MyOrders") },
      ]);
    } catch {
      Alert.alert("Xatolik", "Buyurtma yaratib bo'lmadi");
    }
    setOrdering(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Mahsulot topilmadi</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {product.imageUrls.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {product.imageUrls.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.image} resizeMode="cover" />
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={{ fontSize: 60 }}>📦</Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>{product.price.toLocaleString()} {product.currency}</Text>

          {product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}

          <View style={styles.meta}>
            <Text style={styles.metaText}>Zaxira: {product.stock > 0 ? product.stock : "Tugagan"}</Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.orderBtn, (product.stock <= 0 || ordering) && styles.orderBtnDisabled]}
        onPress={handleOrder}
        disabled={product.stock <= 0 || ordering}
      >
        {ordering ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.orderBtnText}>
            {product.stock <= 0 ? "Tugagan" : "Buyurtma berish"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.textSecondary },
  image: { width: 400, height: 300 },
  imagePlaceholder: { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  info: { padding: 16 },
  name: { fontSize: 22, fontWeight: "700", color: colors.text },
  price: { fontSize: 20, fontWeight: "700", color: colors.primary, marginTop: 6 },
  description: { fontSize: 15, color: colors.text, lineHeight: 22, marginTop: 14 },
  meta: { marginTop: 16, padding: 12, backgroundColor: colors.background, borderRadius: 8 },
  metaText: { fontSize: 14, color: colors.textSecondary },
  orderBtn: {
    backgroundColor: colors.primary, margin: 16, paddingVertical: 14,
    borderRadius: 10, alignItems: "center",
  },
  orderBtnDisabled: { opacity: 0.5 },
  orderBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
