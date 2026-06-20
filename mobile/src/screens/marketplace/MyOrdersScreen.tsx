import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/types";
import { marketplaceApi, Order } from "../../api/marketplace";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "MyOrders">;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Kutilmoqda",
  CONFIRMED: "Tasdiqlangan",
  SHIPPED: "Jo'natilgan",
  DELIVERED: "Yetkazilgan",
  CANCELLED: "Bekor qilingan",
  REFUNDED: "Qaytarilgan",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: colors.primary,
  SHIPPED: "#3b82f6",
  DELIVERED: "#22c55e",
  CANCELLED: colors.danger,
  REFUNDED: colors.textSecondary,
};

export function MyOrdersScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      marketplaceApi.getMyOrders()
        .then(setOrders)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  const cancelOrder = (orderId: string) => {
    Alert.alert("Bekor qilish", "Buyurtmani bekor qilmoqchimisiz?", [
      { text: "Yo'q", style: "cancel" },
      {
        text: "Ha", style: "destructive",
        onPress: async () => {
          try {
            const updated = await marketplaceApi.updateOrderStatus(orderId, "CANCELLED");
            setOrders((prev) => prev.map((o) => o.id === orderId ? updated : o));
          } catch {}
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  return (
    <FlatList
      style={styles.container}
      data={orders}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.storeName}>{item.store.name}</Text>
            <Text style={[styles.status, { color: STATUS_COLORS[item.status] }]}>
              {STATUS_LABELS[item.status] ?? item.status}
            </Text>
          </View>

          {item.items.map((oi) => (
            <Text key={oi.id} style={styles.itemText}>
              {oi.product.name} × {oi.quantity} — {oi.price.toLocaleString()} {item.currency}
            </Text>
          ))}

          <View style={styles.orderFooter}>
            <Text style={styles.total}>Jami: {item.totalAmount.toLocaleString()} {item.currency}</Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString("uz-UZ")}</Text>
          </View>

          {item.status === "PENDING" && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelOrder(item.id)}>
              <Text style={styles.cancelBtnText}>Bekor qilish</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>Buyurtmalar yo'q</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  list: { padding: 16 },
  orderCard: {
    backgroundColor: colors.background, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  storeName: { fontSize: 15, fontWeight: "600", color: colors.text },
  status: { fontSize: 13, fontWeight: "600" },
  itemText: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  orderFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  total: { fontSize: 15, fontWeight: "700", color: colors.text },
  date: { fontSize: 12, color: colors.textSecondary },
  cancelBtn: { marginTop: 10, alignSelf: "flex-end", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.danger },
  cancelBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
