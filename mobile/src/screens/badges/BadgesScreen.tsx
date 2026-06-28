import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
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

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    badgesApi.getMyBadges().then(setBadges).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  if (error) {
    return <ErrorView message="Belgilarni yuklab bo'lmadi" onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={badges}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <View style={styles.badgeCard}>
            <Text style={styles.badgeIcon}>{item.icon}</Text>
            <Text style={styles.badgeLabel}>{item.label}</Text>
            <Text style={styles.badgeDate}>{new Date(item.earnedAt).toLocaleDateString("uz-UZ")}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏅</Text>
            <Text style={styles.emptyText}>Hali belgilar yo'q</Text>
            <Text style={styles.emptyHint}>Faol bo'ling va belgilar oling!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  list: { padding: 12, paddingBottom: 20 },
  row: { justifyContent: "space-between", marginBottom: 8 },
  badgeCard: { width: "31%", backgroundColor: colors.background, borderRadius: 14, padding: 14, alignItems: "center" },
  badgeIcon: { fontSize: 36, marginBottom: 6 },
  badgeLabel: { fontSize: 12, fontWeight: "600", color: colors.text, textAlign: "center" },
  badgeDate: { fontSize: 10, color: colors.textSecondary, marginTop: 4 },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
  emptyHint: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
});
