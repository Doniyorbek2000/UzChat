import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Image } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { greetingsApi, SentCardData } from "../../api/greetings";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "GreetingCards">;

export function GreetingCardsScreen(_props: Props) {
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [items, setItems] = useState<SentCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    const load = tab === "received" ? greetingsApi.getReceived() : greetingsApi.getSent();
    load.then(setItems).catch(() => setError(true)).finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const load = tab === "received" ? greetingsApi.getReceived() : greetingsApi.getSent();
    load.then(setItems).catch(() => {}).finally(() => setRefreshing(false));
  }, [tab]);

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(["received", "sent"] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "received" ? "💌 Kelgan" : "📤 Yuborilgan"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <ErrorView message={tr("Kartochkalarni yuklab bo'lmadi")} onRetry={loadData} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => {
            const person = tab === "received" ? item.sender : item.receiver;
            return (
              <View style={styles.cardItem}>
                {item.card.imageUrl ? (
                  <Image source={{ uri: item.card.imageUrl }} style={styles.cardPreview} />
                ) : (
                  <View style={[styles.cardPreview, styles.cardPreviewPlaceholder]}>
                    <Text style={styles.cardEmoji}>💌</Text>
                  </View>
                )}
                <Text style={styles.cardTemplate} numberOfLines={1}>{item.card.templateName}</Text>
                <Text style={styles.cardPerson} numberOfLines={1}>
                  {tab === "received" ? "Kimdan: " : "Kimga: "}
                  {person?.displayName ?? ""}
                </Text>
                {item.message && <Text style={styles.cardMessage} numberOfLines={2}>"{item.message}"</Text>}
              </View>
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💌</Text>
              <Text style={styles.emptyTitle}>{tab === "received" ? "Kartochkalar yo'q" : "Hali yuborilmagan"}</Text>
              <Text style={styles.emptyHint}>
                {tab === "received"
                  ? "Do'stlaringiz sizga tabrik kartochkasi yuborishganda bu yerda ko'rinadi"
                  : "Do'stlaringizga bayram tabriklarini yuboring"
                }
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
  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 20 },
  row: { gap: 10 },
  cardItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPreview: { width: 90, height: 68, borderRadius: 12, backgroundColor: "#FFF0F5", marginBottom: 10 },
  cardPreviewPlaceholder: { alignItems: "center", justifyContent: "center" },
  cardEmoji: { fontSize: 30 },
  cardTemplate: { fontSize: 13, fontWeight: "600", color: colors.text, textAlign: "center" },
  cardPerson: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
  cardMessage: { fontSize: 11, color: colors.textSecondary, marginTop: 6, textAlign: "center", fontStyle: "italic", lineHeight: 16 },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
});
