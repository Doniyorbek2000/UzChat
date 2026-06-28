import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { loyaltyApi, LoyaltyPointsData, LoyaltyTxn, LeaderboardEntry } from "../../api/loyalty";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "Loyalty">;

const LEVEL_ICONS: Record<string, string> = { bronze: "🥉", silver: "🥈", gold: "🥇", diamond: "💎" };
const LEVEL_LABELS: Record<string, string> = { bronze: "Bronza", silver: "Kumush", gold: "Oltin", diamond: "Olmos" };

const REWARDS = [
  { id: "r1", icon: "🎨", name: "Maxsus stiker to'plami", cost: 100, desc: "Premium stikerlar" },
  { id: "r2", icon: "🏷️", name: "Profil badge", cost: 250, desc: "Maxsus profil nishoni" },
  { id: "r3", icon: "🎨", name: "Maxsus mavzu", cost: 500, desc: "Premium ilova mavzusi" },
  { id: "r4", icon: "💎", name: "VIP status (1 oy)", cost: 1000, desc: "1 oylik VIP imkoniyatlar" },
];

export function LoyaltyScreen(_props: Props) {
  const [tab, setTab] = useState<"overview" | "history" | "leaderboard">("overview");
  const [points, setPoints] = useState<LoyaltyPointsData | null>(null);
  const [history, setHistory] = useState<LoyaltyTxn[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (tab === "overview") {
      loyaltyApi.getMyPoints().then(setPoints).catch(() => {}).finally(() => setRefreshing(false));
    } else if (tab === "history") {
      loyaltyApi.getHistory().then(setHistory).catch(() => {}).finally(() => setRefreshing(false));
    } else {
      loyaltyApi.getLeaderboard().then(setLeaderboard).catch(() => {}).finally(() => setRefreshing(false));
    }
  }, [tab]);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    if (tab === "overview") {
      loyaltyApi.getMyPoints().then(setPoints).catch(() => setError(true)).finally(() => setLoading(false));
    } else if (tab === "history") {
      loyaltyApi.getHistory().then(setHistory).catch(() => setError(true)).finally(() => setLoading(false));
    } else {
      loyaltyApi.getLeaderboard().then(setLeaderboard).catch(() => setError(true)).finally(() => setLoading(false));
    }
  }, [tab]);

  useEffect(() => { loadData(); }, [loadData]);

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
      ) : error ? (
        <ErrorView message="Ma'lumotlarni yuklab bo'lmadi" onRetry={loadData} />
      ) : tab === "overview" && points ? (
        <FlatList
          data={REWARDS}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.overviewCard}>
              <Text style={styles.levelIcon}>{LEVEL_ICONS[points.level] ?? "🥉"}</Text>
              <Text style={styles.pointsValue}>{points.points.toLocaleString()}</Text>
              <Text style={styles.pointsLabel}>ball</Text>
              <Text style={styles.levelText}>{LEVEL_LABELS[points.level] ?? points.level} darajasi</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, (points.points % 1000) / 10)}%` }]} />
                </View>
                <Text style={styles.progressText}>Keyingi daraja: {Math.max(0, 1000 - (points.points % 1000))} ball</Text>
              </View>
            </View>
          }
          ListHeaderComponentStyle={{ marginBottom: 8 }}
          renderItem={({ item }) => {
            const canAfford = points.points >= item.cost;
            return (
              <TouchableOpacity
                style={[styles.rewardCard, !canAfford && styles.rewardCardDisabled]}
                onPress={() => {
                  if (!canAfford) {
                    Alert.alert("Ball yetarli emas", `Bu mukofot uchun ${item.cost} ball kerak`);
                    return;
                  }
                  Alert.alert("Mukofot olish", `${item.name} uchun ${item.cost} ball sarflaysizmi?`, [
                    { text: "Bekor qilish", style: "cancel" },
                    { text: "Olish", onPress: async () => {
                      try {
                        await loyaltyApi.spend(item.cost, `Mukofot: ${item.name}`);
                        setPoints({ ...points, points: points.points - item.cost });
                        Alert.alert("Tabriklaymiz!", `${item.name} muvaffaqiyatli olindi`);
                      } catch {
                        Alert.alert("Xatolik", "Mukofotni olib bo'lmadi");
                      }
                    }},
                  ]);
                }}
              >
                <Text style={styles.rewardIcon}>{item.icon}</Text>
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardName}>{item.name}</Text>
                  <Text style={styles.rewardDesc}>{item.desc}</Text>
                </View>
                <View style={[styles.rewardCost, canAfford && styles.rewardCostAffordable]}>
                  <Text style={[styles.rewardCostText, canAfford && styles.rewardCostTextAffordable]}>{item.cost}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
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
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  loader: { marginTop: 40 },
  overviewCard: { backgroundColor: colors.background, margin: 16, borderRadius: 20, padding: 32, alignItems: "center" },
  levelIcon: { fontSize: 56, marginBottom: 12 },
  pointsValue: { fontSize: 48, fontWeight: "800", color: colors.text },
  pointsLabel: { fontSize: 16, color: colors.textSecondary, marginTop: 4 },
  levelText: { fontSize: 14, fontWeight: "600", color: colors.primary, marginTop: 8 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  txnCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, borderRadius: 10, padding: 14, marginBottom: 4 },
  txnInfo: { flex: 1 },
  txnReason: { fontSize: 14, fontWeight: "600", color: colors.text },
  txnDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  txnAmount: { fontSize: 16, fontWeight: "700" },
  positive: { color: colors.online },
  negative: { color: colors.danger },
  lbCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, borderRadius: 10, padding: 14, marginBottom: 4, gap: 12 },
  lbRank: { fontSize: 18, fontWeight: "700", color: colors.textSecondary, width: 30, textAlign: "center" },
  lbInfo: { flex: 1 },
  lbName: { fontSize: 15, fontWeight: "600", color: colors.text },
  lbLevel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  emptyText: { textAlign: "center", color: colors.textSecondary, fontSize: 15, padding: 40 },
  progressContainer: { marginTop: 16, width: "100%", alignItems: "center" },
  progressBar: { width: "80%", height: 6, borderRadius: 3, backgroundColor: colors.border },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  progressText: { fontSize: 11, color: colors.textSecondary, marginTop: 6 },
  rewardCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 6, gap: 12 },
  rewardCardDisabled: { opacity: 0.5 },
  rewardIcon: { fontSize: 28 },
  rewardInfo: { flex: 1 },
  rewardName: { fontSize: 15, fontWeight: "600", color: colors.text },
  rewardDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rewardCost: { backgroundColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  rewardCostAffordable: { backgroundColor: colors.primary },
  rewardCostText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  rewardCostTextAffordable: { color: "#fff" },
});
