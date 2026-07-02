import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Share, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { referralsApi, ReferralData, ReferralStats } from "../../api/referrals";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";
import { tr } from "../../i18n";

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
    Alert.alert(tr("Kod nusxalandi"), code);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message={tr("Ma'lumotlarni yuklab bo'lmadi")} onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>{tr("Sizning taklif kodingiz")}</Text>
        <Text style={styles.code}>{code}</Text>
        <View style={styles.codeActions}>
          <TouchableOpacity style={styles.codeBtn} onPress={copyCode} activeOpacity={0.7}>
            <Text style={styles.codeBtnText}>{tr("📋 Nusxalash")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.codeBtn, styles.shareBtn]} onPress={shareCode} activeOpacity={0.7}>
            <Text style={[styles.codeBtnText, styles.shareBtnText]}>{tr("📤 Ulashish")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: "#007AFF" + "15" }]}>
              <Text style={styles.statIcon}>👥</Text>
            </View>
            <Text style={styles.statValue}>{stats.totalReferrals}</Text>
            <Text style={styles.statLabel}>{tr("Takliflar")}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: "#34C759" + "15" }]}>
              <Text style={styles.statIcon}>🎁</Text>
            </View>
            <Text style={styles.statValue}>{stats.totalRewards.toLocaleString()}</Text>
            <Text style={styles.statLabel}>{tr("Mukofotlar")}</Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>{tr("Taklif qilinganlar")}</Text>
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
            <View style={[styles.rewardBadge, item.rewardClaimed ? styles.claimed : styles.pending]}>
              <Text style={[styles.rewardText, item.rewardClaimed ? styles.claimedText : styles.pendingText]}>
                {item.rewardClaimed ? "✓ Olindi" : "⏳ Kutilmoqda"}
              </Text>
            </View>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎁</Text>
            <Text style={styles.emptyTitle}>{tr("Hali hech kim taklif qilinmagan")}</Text>
            <Text style={styles.emptyHint}>{tr("Kodingizni do'stlaringizga ulashing")}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  codeCard: {
    backgroundColor: colors.primary,
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  codeLabel: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 8 },
  code: { fontSize: 32, fontWeight: "800", color: "#fff", letterSpacing: 4 },
  codeActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  codeBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)" },
  codeBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  shareBtn: { backgroundColor: colors.surface },
  shareBtnText: { color: colors.primary },
  statsRow: { flexDirection: "row", marginHorizontal: 16, gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statIcon: { fontSize: 18 },
  statValue: { fontSize: 24, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginHorizontal: 16, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  referralCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 6,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  referralAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  referralAvatarText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  referralInfo: { flex: 1 },
  referralName: { fontSize: 15, fontWeight: "600", color: colors.text },
  referralUsername: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rewardBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rewardText: { fontSize: 11, fontWeight: "600" },
  claimed: { backgroundColor: "#E8F5E9" },
  claimedText: { color: "#2E7D32" },
  pending: { backgroundColor: "#FFF3E0" },
  pendingText: { color: "#E65100" },
  emptyContainer: { alignItems: "center", paddingTop: 40, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
