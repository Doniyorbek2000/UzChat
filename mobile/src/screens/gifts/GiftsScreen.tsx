import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { giftsApi, SentGiftData } from "../../api/gifts";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";
import { tr } from "../../i18n";

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
        {(["received", "sent"] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "received" ? "🎁 Kelgan" : "📤 Yuborilgan"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <ErrorView message={tr("Sovg'alarni yuklab bo'lmadi")} onRetry={loadData} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const person = tab === "received" ? item.sender : item.receiver;
            return (
              <View style={styles.giftCard}>
                <View style={styles.giftIconBg}>
                  <Text style={styles.giftIcon}>{item.gift.icon}</Text>
                </View>
                <View style={styles.giftInfo}>
                  <Text style={styles.giftName}>{item.gift.name}</Text>
                  <Text style={styles.giftPerson}>
                    {tab === "received" ? "Kimdan: " : "Kimga: "}
                    {person?.displayName ?? "Noma'lum"}
                  </Text>
                  {item.message && <Text style={styles.giftMessage}>"{item.message}"</Text>}
                </View>
                <Text style={styles.giftDate}>{new Date(item.createdAt).toLocaleDateString("uz-UZ")}</Text>
              </View>
            );
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{tab === "received" ? "🎁" : "📤"}</Text>
              <Text style={styles.emptyTitle}>{tab === "received" ? "Sovg'alar yo'q" : "Hali sovg'a yuborilmagan"}</Text>
              <Text style={styles.emptyHint}>
                {tab === "received" ? "Do'stlaringizdan sovg'a olganingizda bu yerda ko'rinadi" : "Do'stlaringizga sovg'a yuborishni boshlang"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", padding: 12, gap: 8, backgroundColor: colors.surface },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.background, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  giftCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  giftIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FF2D55" + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  giftIcon: { fontSize: 24 },
  giftInfo: { flex: 1 },
  giftName: { fontSize: 15, fontWeight: "600", color: colors.text },
  giftPerson: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  giftMessage: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontStyle: "italic", lineHeight: 16 },
  giftDate: { fontSize: 11, color: colors.textSecondary },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
});
