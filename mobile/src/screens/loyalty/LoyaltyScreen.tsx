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
const LEVEL_COLORS: Record<string, string> = { bronze: "#CD7F32", silver: "#C0C0C0", gold: "#FFD700", diamond: "#B9F2FF" };

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

  const tabs = [
    { key: "overview" as const, label: "Ball", icon: "💎" },
    { key: "history" as const, label: "Tarix", icon: "📋" },
    { key: "leaderboard" as const, label: "Reyting", icon: "🏆" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {tabs.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.icon} {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <ErrorView message="Ma'lumotlarni yuklab bo'lmadi" onRetry={loadData} />
      ) : tab === "overview" && points ? (
        <FlatList
          data={REWARDS}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.overviewCard}>
              <View style={[styles.levelBadge, { backgroundColor: (LEVEL_COLORS[points.level] ?? "#CD7F32") + "25" }]}>
                <Text style={styles.levelIcon}>{LEVEL_ICONS[points.level] ?? "🥉"}</Text>
              </View>
              <Text style={styles.pointsValue}>{points.points.toLocaleString()}</Text>
              <Text style={styles.pointsLabel}>ball</Text>
              <View style={styles.levelRow}>
                <Text style={styles.levelText}>{LEVEL_LABELS[points.level] ?? points.level} darajasi</Text>
              </View>
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
                activeOpacity={0.7}
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
                <View style={styles.rewardIconBg}>
                  <Text style={styles.rewardIcon}>{item.icon}</Text>
                </View>
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
              <View style={[styles.txnIconBg, { backgroundColor: (item.amount > 0 ? colors.online : colors.danger) + "15" }]}>
                <Text style={styles.txnIconText}>{item.amount > 0 ? "+" : "-"}</Text>
              </View>
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Tarix bo'sh</Text>
              <Text style={styles.emptyHint}>Ball topganingizda bu yerda ko'rinadi</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const isTop3 = index < 3;
            const rankIcons = ["🥇", "🥈", "🥉"];
            return (
              <View style={[styles.lbCard, isTop3 && styles.lbCardTop]}>
                <Text style={[styles.lbRank, isTop3 && styles.lbRankTop]}>
                  {isTop3 ? rankIcons[index] : `${index + 1}`}
                </Text>
                <View style={styles.lbInfo}>
                  <Text style={styles.lbName}>{item.user.displayName}</Text>
                  <Text style={styles.lbLevel}>{LEVEL_ICONS[item.level]} {item.points.toLocaleString()} ball</Text>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
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
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  overviewCard: {
    backgroundColor: colors.surface,
    margin: 16,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  levelBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  levelIcon: { fontSize: 40 },
  pointsValue: { fontSize: 48, fontWeight: "800", color: colors.text },
  pointsLabel: { fontSize: 16, color: colors.textSecondary, marginTop: 4 },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  levelText: { fontSize: 14, fontWeight: "600", color: colors.primary },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  txnCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  txnIconBg: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  txnIconText: { fontSize: 18, fontWeight: "700", color: colors.text },
  txnInfo: { flex: 1 },
  txnReason: { fontSize: 14, fontWeight: "600", color: colors.text },
  txnDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  txnAmount: { fontSize: 16, fontWeight: "700" },
  positive: { color: colors.online },
  negative: { color: colors.danger },
  lbCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  lbCardTop: { borderWidth: 1, borderColor: colors.primary + "30" },
  lbRank: { fontSize: 16, fontWeight: "700", color: colors.textSecondary, width: 36, textAlign: "center" },
  lbRankTop: { fontSize: 22 },
  lbInfo: { flex: 1 },
  lbName: { fontSize: 15, fontWeight: "600", color: colors.text },
  lbLevel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  progressContainer: { marginTop: 16, width: "100%", alignItems: "center" },
  progressBar: { width: "80%", height: 8, borderRadius: 4, backgroundColor: colors.border },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  progressText: { fontSize: 11, color: colors.textSecondary, marginTop: 8 },
  rewardCard: {
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
  rewardCardDisabled: { opacity: 0.5 },
  rewardIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  rewardIcon: { fontSize: 22 },
  rewardInfo: { flex: 1 },
  rewardName: { fontSize: 15, fontWeight: "600", color: colors.text },
  rewardDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rewardCost: { backgroundColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  rewardCostAffordable: { backgroundColor: colors.primary },
  rewardCostText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  rewardCostTextAffordable: { color: "#fff" },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
