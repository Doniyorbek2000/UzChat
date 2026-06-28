import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator , RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { giftsApi, SentGiftData } from "../../api/gifts";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "Gifts">;

export function GiftsScreen(_props: Props) {
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [items, setItems] = useState<SentGiftData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    const load = tab === "received" ? giftsApi.getReceived() : giftsApi.getSent();
    load.then(setItems).catch(() => setError(true)).finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const load = tab === "received" ? giftsApi.getReceived() : giftsApi.getSent();
    load.then(setItems).catch(() => {}).finally(() => setRefreshing(false));
  }, [tab]);

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === "received" && styles.tabActive]} onPress={() => setTab("received")}>
          <Text style={[styles.tabText, tab === "received" && styles.tabTextActive]}>Kelgan sovg'alar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === "sent" && styles.tabActive]} onPress={() => setTab("sent")}>
          <Text style={[styles.tabText, tab === "sent" && styles.tabTextActive]}>Yuborilgan</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : error ? (
        <ErrorView message="Sovg'alarni yuklab bo'lmadi" onRetry={loadData} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const person = tab === "received" ? item.sender : item.receiver;
            return (
              <View style={styles.giftCard}>
                <Text style={styles.giftIcon}>{item.gift.icon}</Text>
                <View style={styles.giftInfo}>
                  <Text style={styles.giftName}>{item.gift.name}</Text>
                  <Text style={styles.giftPerson}>{person?.displayName ?? "Noma'lum"}</Text>
                  {item.message && <Text style={styles.giftMessage}>{item.message}</Text>}
                </View>
                <Text style={styles.giftDate}>{new Date(item.createdAt).toLocaleDateString("uz-UZ")}</Text>
              </View>
            );
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎁</Text>
              <Text style={styles.emptyText}>{tab === "received" ? "Sovg'alar yo'q" : "Hali sovg'a yuborilmagan"}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  tabs: { flexDirection: "row", padding: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.border, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  giftCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, borderRadius: 10, padding: 12, marginBottom: 4, gap: 12 },
  giftIcon: { fontSize: 32 },
  giftInfo: { flex: 1 },
  giftName: { fontSize: 15, fontWeight: "600", color: colors.text },
  giftPerson: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  giftMessage: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontStyle: "italic" },
  giftDate: { fontSize: 11, color: colors.textSecondary },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
});
