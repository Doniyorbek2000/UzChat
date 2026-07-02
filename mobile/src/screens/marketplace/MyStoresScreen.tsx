import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, RefreshControl,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/types";
import { marketplaceApi, Store } from "../../api/marketplace";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "MyStores">;

export function MyStoresScreen({ navigation }: Props) {
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate("CreateStore")} style={{ marginRight: 8 }}>
          <Text style={{ color: colors.primary, fontSize: 28, fontWeight: "300" }}>+</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      marketplaceApi.getMyStores()
        .then((s) => { setStores(s); setError(false); })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message={tr("Do'konlarni yuklab bo'lmadi")} onRetry={() => { setLoading(true); marketplaceApi.getMyStores().then((s) => { setStores(s); setError(false); }).catch(() => setError(true)).finally(() => setLoading(false)); }} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={stores}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); marketplaceApi.getMyStores().then(setStores).catch(() => {}).finally(() => setRefreshing(false)); }} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.storeCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("StoreView", { storeId: item.id })}
          >
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{item.name}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeText}>{item._count?.products ?? 0} mahsulot</Text>
                </View>
                <View style={[styles.metaBadge, styles.metaBadgeOrders]}>
                  <Text style={[styles.metaBadgeText, styles.metaBadgeOrdersText]}>{item._count?.orders ?? 0} buyurtma</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏪</Text>
            <Text style={styles.emptyTitle}>{tr("Do'konlar yo'q")}</Text>
            <Text style={styles.emptyHint}>{tr("O'z do'koningizni yarating va savdo boshlang")}</Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate("CreateStore")} activeOpacity={0.7}>
              <Text style={styles.createBtnText}>+ Do'kon yaratish</Text>
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
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
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
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: { width: 52, height: 52, borderRadius: 14 },
  avatarPlaceholder: { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 6 },
  metaRow: { flexDirection: "row", gap: 6 },
  metaBadge: { backgroundColor: "#007AFF" + "15", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  metaBadgeText: { fontSize: 10, fontWeight: "600", color: "#007AFF" },
  metaBadgeOrders: { backgroundColor: "#34C759" + "15" },
  metaBadgeOrdersText: { color: "#34C759" },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 20 },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  createBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
