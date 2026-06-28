import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Share , RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { referralsApi, ReferralData, ReferralStats } from "../../api/referrals";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "Referrals">;

export function ReferralsScreen(_props: Props) {
  const [code, setCode] = useState("");
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      referralsApi.getCode(),
      referralsApi.getMyReferrals(),
      referralsApi.getStats(),
    ]).then(([c, r, s]) => { setCode(c.code); setReferrals(r); setStats(s); }).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([referralsApi.getCode(), referralsApi.getMyReferrals(), referralsApi.getStats()])
      .then(([c, r, s]) => { setCode(c.code); setReferrals(r); setStats(s); })
      .catch(() => {}).finally(() => setRefreshing(false));
  }, []);

  const shareCode = () => {
    Share.share({ message: `UzChat'ga qo'shiling! Mening taklif kodom: ${code}` }).catch(() => {});
  };

  const copyCode = () => {
    Alert.alert("Kod nusxalandi", code);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  if (error) {
    return <ErrorView message="Ma'lumotlarni yuklab bo'lmadi" onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Sizning taklif kodingiz</Text>
        <Text style={styles.code}>{code}</Text>
        <View style={styles.codeActions}>
          <TouchableOpacity style={styles.codeBtn} onPress={copyCode}>
            <Text style={styles.codeBtnText}>Nusxalash</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.codeBtn, styles.shareBtn]} onPress={shareCode}>
            <Text style={[styles.codeBtnText, styles.shareBtnText]}>Ulashish</Text>
          </TouchableOpacity>
        </View>
      </View>

      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalReferrals}</Text>
            <Text style={styles.statLabel}>Takliflar</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalRewards.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Mukofotlar</Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Taklif qilinganlar</Text>
      <FlatList
        data={referrals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.referralCard}>
            <View style={styles.referralAvatar}>
              <Text style={styles.referralAvatarText}>{item.referred.displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.referralInfo}>
              <Text style={styles.referralName}>{item.referred.displayName}</Text>
              <Text style={styles.referralUsername}>@{item.referred.username}</Text>
            </View>
            <View style={styles.referralReward}>
              <Text style={[styles.rewardBadge, item.rewardClaimed ? styles.claimed : styles.pending]}>
                {item.rewardClaimed ? "Olindi" : "Kutilmoqda"}
              </Text>
            </View>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎁</Text>
            <Text style={styles.emptyText}>Hali hech kim taklif qilinmagan</Text>
            <Text style={styles.emptyHint}>Kodingizni do'stlaringizga ulashing</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  codeCard: { backgroundColor: colors.primary, margin: 16, borderRadius: 16, padding: 24, alignItems: "center" },
  codeLabel: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 8 },
  code: { fontSize: 32, fontWeight: "800", color: "#fff", letterSpacing: 4 },
  codeActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  codeBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)" },
  codeBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  shareBtn: { backgroundColor: colors.surface },
  shareBtnText: { color: colors.primary },
  statsRow: { flexDirection: "row", marginHorizontal: 16, gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 16, alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginHorizontal: 16, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  referralCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginBottom: 4, gap: 12 },
  referralAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  referralAvatarText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  referralInfo: { flex: 1 },
  referralName: { fontSize: 15, fontWeight: "600", color: colors.text },
  referralUsername: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  referralReward: {},
  rewardBadge: { fontSize: 11, fontWeight: "600", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: "hidden" },
  claimed: { backgroundColor: "#E8F5E9", color: "#2E7D32" },
  pending: { backgroundColor: "#FFF3E0", color: "#E65100" },
  emptyContainer: { alignItems: "center", paddingTop: 40 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
  emptyHint: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
});
