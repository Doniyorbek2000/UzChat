import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/types";
import { marketplaceApi, Store } from "../../api/marketplace";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";

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
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message="Do'konlarni yuklab bo'lmadi" onRetry={() => { setLoading(true); marketplaceApi.getMyStores().then((s) => { setStores(s); setError(false); }).catch(() => setError(true)).finally(() => setLoading(false)); }} />;
  }

  return (
    <FlatList
      style={styles.container}
      data={stores}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.storeCard}
          onPress={() => navigation.navigate("StoreView", { storeId: item.id })}
        >
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.storeName}>{item.name}</Text>
            <Text style={styles.storeInfo}>
              {item._count?.products ?? 0} mahsulot · {item._count?.orders ?? 0} buyurtma
            </Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>Siz hali do'kon yaratmagansiz</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate("CreateStore")}>
            <Text style={styles.createBtnText}>Do'kon yaratish</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary, marginBottom: 16 },
  list: { padding: 16 },
  storeCard: {
    flexDirection: "row", backgroundColor: colors.background, borderRadius: 12,
    padding: 14, marginBottom: 10, gap: 12, alignItems: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: { width: 50, height: 50, borderRadius: 12 },
  avatarPlaceholder: { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  storeName: { fontSize: 15, fontWeight: "600", color: colors.text },
  storeInfo: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  createBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  createBtnText: { color: "#fff", fontWeight: "600" },
});
