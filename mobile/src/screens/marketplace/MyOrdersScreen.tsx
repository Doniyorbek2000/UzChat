import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/types";
import { marketplaceApi, Order } from "../../api/marketplace";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "MyOrders">;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  PENDING: { label: tr("Kutilmoqda"), color: "#FF9500", icon: "⏳" },
  CONFIRMED: { label: tr("Tasdiqlangan"), color: "#007AFF", icon: "✓" },
  SHIPPED: { label: tr("Jo'natilgan"), color: "#5856D6", icon: "📦" },
  DELIVERED: { label: tr("Yetkazilgan"), color: "#34C759", icon: "✅" },
  CANCELLED: { label: tr("Bekor qilingan"), color: "#FF3B30", icon: "✕" },
  REFUNDED: { label: tr("Qaytarilgan"), color: "#8E8E93", icon: "↩" },
};

export function MyOrdersScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    marketplaceApi.getMyOrders()
      .then(setOrders)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(loadData);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    marketplaceApi.getMyOrders().then(setOrders).catch(() => {}).finally(() => setRefreshing(false));
  }, []);

  const cancelOrder = (orderId: string) => {
    Alert.alert(tr("Bekor qilish"), tr("Buyurtmani bekor qilmoqchimisiz?"), [
      { text: tr("Yo'q"), style: "cancel" },
      {
        text: tr("Ha"), style: "destructive",
        onPress: async () => {
          try {
            const updated = await marketplaceApi.updateOrderStatus(orderId, "CANCELLED");
            setOrders((prev) => prev.map((o) => o.id === orderId ? updated : o));
          } catch {
            Alert.alert(tr("Xatolik"), tr("Buyurtmani bekor qilib bo'lmadi"));
          }
        },
      },
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
    return <ErrorView message={tr("Buyurtmalarni yuklab bo'lmadi")} onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      {orders.length > 0 && (
        <Text style={styles.countText}>{orders.length} ta buyurtma</Text>
      )}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING;
          return (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.storeName}>{item.store.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + "15" }]}>
                  <Text style={[styles.statusText, { color: statusCfg.color }]}>
                    {statusCfg.icon} {statusCfg.label}
                  </Text>
                </View>
              </View>

              {item.items.map((oi) => (
                <View key={oi.id} style={styles.itemRow}>
                  <Text style={styles.itemText} numberOfLines={1}>{oi.product.name} × {oi.quantity}</Text>
                  <Text style={styles.itemPrice}>{oi.price.toLocaleString()} {item.currency}</Text>
                </View>
              ))}

              <View style={styles.orderFooter}>
                <Text style={styles.total}>Jami: {item.totalAmount.toLocaleString()} {item.currency}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString("uz-UZ")}</Text>
              </View>

              {item.status === "PENDING" && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelOrder(item.id)} activeOpacity={0.7}>
                  <Text style={styles.cancelBtnText}>{tr("Bekor qilish")}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>{tr("Buyurtmalar yo'q")}</Text>
            <Text style={styles.emptyHint}>{tr("Do'konlardan xarid qiling")}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  countText: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  storeName: { fontSize: 15, fontWeight: "600", color: colors.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "600" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  itemText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  itemPrice: { fontSize: 13, color: colors.text, fontWeight: "500" },
  orderFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  total: { fontSize: 15, fontWeight: "700", color: colors.text },
  date: { fontSize: 12, color: colors.textSecondary },
  cancelBtn: {
    marginTop: 10,
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FF3B30" + "15",
  },
  cancelBtnText: { color: "#FF3B30", fontSize: 13, fontWeight: "600" },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
