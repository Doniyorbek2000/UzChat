import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { badgesApi, BadgeData } from "../../api/badges";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "Badges">;

export function BadgesScreen(_props: Props) {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    badgesApi.getMyBadges().then(setBadges).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    badgesApi.getMyBadges().then(setBadges).catch(() => {}).finally(() => setRefreshing(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Yuklanmoqda...</Text>
      </View>
    );
  }

  if (error) {
    return <ErrorView message="Belgilarni yuklab bo'lmadi" onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      {badges.length > 0 && (
        <View style={styles.statsCard}>
          <Text style={styles.statsCount}>{badges.length}</Text>
          <Text style={styles.statsLabel}>ta belgi olingan</Text>
        </View>
      )}
      <FlatList
        data={badges}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.badgeCard}>
            <View style={styles.badgeIconBg}>
              <Text style={styles.badgeIcon}>{item.icon}</Text>
            </View>
            <Text style={styles.badgeLabel} numberOfLines={2}>{item.label}</Text>
            <Text style={styles.badgeDate}>{new Date(item.earnedAt).toLocaleDateString("uz-UZ")}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏅</Text>
            <Text style={styles.emptyTitle}>Hali belgilar yo'q</Text>
            <Text style={styles.emptyHint}>Faol bo'ling va belgilar oling!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, color: colors.textSecondary },
  statsCard: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    marginBottom: 8,
  },
  statsCount: { fontSize: 28, fontWeight: "800", color: colors.primary },
  statsLabel: { fontSize: 15, color: colors.textSecondary },
  list: { padding: 12, paddingBottom: 20 },
  row: { gap: 10 },
  badgeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  badgeIcon: { fontSize: 28 },
  badgeLabel: { fontSize: 12, fontWeight: "600", color: colors.text, textAlign: "center", lineHeight: 16 },
  badgeDate: { fontSize: 10, color: colors.textSecondary, marginTop: 4 },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
