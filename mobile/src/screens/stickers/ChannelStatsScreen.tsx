import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Dimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { channelStatsApi, ChannelStatsResponse } from "../../api/channelStats";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ChannelStats">;

export function ChannelStatsScreen({ route }: Props) {
  const { conversationId } = route.params;
  const [stats, setStats] = useState<ChannelStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    channelStatsApi.getStats(conversationId).then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, [conversationId]);

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }
  if (!stats) {
    return <Text style={styles.emptyText}>Statistika mavjud emas</Text>;
  }

  const maxMsg = Math.max(...stats.dailyStats.map((d) => d.messageCount), 1);
  const barWidth = (Dimensions.get("window").width - 64) / Math.max(stats.dailyStats.length, 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.memberCount.toLocaleString()}</Text>
          <Text style={styles.statLabel}>A'zolar</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalMessages.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Jami xabarlar</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.messagesThisWeek.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Bu hafta</Text>
        </View>
      </View>

      {stats.dailyStats.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Kunlik xabarlar (30 kun)</Text>
          <View style={styles.chart}>
            <View style={styles.bars}>
              {stats.dailyStats.map((d, i) => (
                <View key={i} style={[styles.barContainer, { width: barWidth }]}>
                  <View
                    style={[
                      styles.bar,
                      { height: Math.max((d.messageCount / maxMsg) * 120, 2) },
                    ]}
                  />
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitle}>A'zolar dinamikasi</Text>
          <View style={styles.historyList}>
            {stats.dailyStats.slice(-7).reverse().map((d, i) => (
              <View key={i} style={styles.historyRow}>
                <Text style={styles.historyDate}>
                  {new Date(d.date).toLocaleDateString("uz-UZ", { month: "short", day: "numeric" })}
                </Text>
                <Text style={styles.historyMembers}>{d.memberCount} a'zo</Text>
                <Text style={styles.historyMessages}>{d.messageCount} xabar</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  content: { padding: 16, paddingBottom: 40 },
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "700", color: colors.primary },
  statLabel: { fontSize: 12, color: "#888", marginTop: 4, fontWeight: "500" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 12, marginTop: 8 },
  chart: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 16 },
  bars: { flexDirection: "row", alignItems: "flex-end", height: 130 },
  barContainer: { alignItems: "center", justifyContent: "flex-end" },
  bar: { width: 6, backgroundColor: colors.primary, borderRadius: 3 },
  historyList: { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden" },
  historyRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
    alignItems: "center",
  },
  historyDate: { width: 80, fontSize: 13, color: "#666", fontWeight: "500" },
  historyMembers: { flex: 1, fontSize: 13, color: "#333" },
  historyMessages: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  emptyText: { textAlign: "center", color: "#999", fontSize: 15, padding: 40 },
});
