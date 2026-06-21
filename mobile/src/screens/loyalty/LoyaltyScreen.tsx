import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { loyaltyApi, LoyaltyPointsData, LoyaltyTxn, LeaderboardEntry } from "../../api/loyalty";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Loyalty">;

const LEVEL_ICONS: Record<string, string> = { bronze: "🥉", silver: "🥈", gold: "🥇", diamond: "💎" };
const LEVEL_LABELS: Record<string, string> = { bronze: "Bronza", silver: "Kumush", gold: "Oltin", diamond: "Olmos" };

export function LoyaltyScreen(_props: Props) {
  const [tab, setTab] = useState<"overview" | "history" | "leaderboard">("overview");
  const [points, setPoints] = useState<LoyaltyPointsData | null>(null);
  const [history, setHistory] = useState<LoyaltyTxn[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === "overview") {
      loyaltyApi.getMyPoints().then(setPoints).catch(() => {}).finally(() => setLoading(false));
    } else if (tab === "history") {
      loyaltyApi.getHistory().then(setHistory).catch(() => {}).finally(() => setLoading(false));
    } else {
      loyaltyApi.getLeaderboard().then(setLeaderboard).catch(() => {}).finally(() => setLoading(false));
    }
  }, [tab]);

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(["overview", "history", "leaderboard"] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "overview" ? "Ball" : t === "history" ? "Tarix" : "Reyting"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : tab === "overview" && points ? (
        <View style={styles.overviewCard}>
          <Text style={styles.levelIcon}>{LEVEL_ICONS[points.level] ?? "🥉"}</Text>
          <Text style={styles.pointsValue}>{points.points.toLocaleString()}</Text>
          <Text style={styles.pointsLabel}>ball</Text>
          <Text style={styles.levelText}>{LEVEL_LABELS[points.level] ?? points.level} darajasi</Text>
        </View>
      ) : tab === "history" ? (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.txnCard}>
              <View style={styles.txnInfo}>
                <Text style={styles.txnReason}>{item.reason}</Text>
                <Text style={styles.txnDate}>{new Date(item.createdAt).toLocaleDateString("uz-UZ")}</Text>
              </View>
              <Text style={[styles.txnAmount, item.amount > 0 ? styles.positive : styles.negative]}>
                {item.amount > 0 ? "+" : ""}{item.amount}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Tarix bo'sh</Text>}
        />
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={styles.lbCard}>
              <Text style={styles.lbRank}>{index + 1}</Text>
              <View style={styles.lbInfo}>
                <Text style={styles.lbName}>{item.user.displayName}</Text>
                <Text style={styles.lbLevel}>{LEVEL_ICONS[item.level]} {item.points.toLocaleString()} ball</Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  tabs: { flexDirection: "row", padding: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: "#E5E5EA", alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: "#666" },
  tabTextActive: { color: "#fff" },
  loader: { marginTop: 40 },
  overviewCard: { backgroundColor: "#fff", margin: 16, borderRadius: 20, padding: 32, alignItems: "center" },
  levelIcon: { fontSize: 56, marginBottom: 12 },
  pointsValue: { fontSize: 48, fontWeight: "800", color: "#333" },
  pointsLabel: { fontSize: 16, color: "#888", marginTop: 4 },
  levelText: { fontSize: 14, fontWeight: "600", color: colors.primary, marginTop: 8 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  txnCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 4 },
  txnInfo: { flex: 1 },
  txnReason: { fontSize: 14, fontWeight: "600", color: "#333" },
  txnDate: { fontSize: 11, color: "#888", marginTop: 2 },
  txnAmount: { fontSize: 16, fontWeight: "700" },
  positive: { color: "#34C759" },
  negative: { color: "#FF3B30" },
  lbCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 4, gap: 12 },
  lbRank: { fontSize: 18, fontWeight: "700", color: "#888", width: 30, textAlign: "center" },
  lbInfo: { flex: 1 },
  lbName: { fontSize: 15, fontWeight: "600", color: "#333" },
  lbLevel: { fontSize: 12, color: "#888", marginTop: 2 },
  emptyText: { textAlign: "center", color: "#999", fontSize: 15, padding: 40 },
});
