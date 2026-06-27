import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { adminApi, AdminReport } from "../../api/admin";
import { colors } from "../../theme/colors";

const reasonLabels: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Tahqirlash",
  VIOLENCE: "Zo'ravonlik",
  ILLEGAL_CONTENT: "Noqonuniy kontent",
  IMPERSONATION: "O'zini boshqa kishi deb ko'rsatish",
  OTHER: "Boshqa",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Kutilmoqda", color: "#FF9500" },
  RESOLVED: { label: "Hal qilindi", color: "#34C759" },
  DISMISSED: { label: "Rad etildi", color: "#8E8E93" },
};

export default function AdminReportsScreen() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.listReports(p);
      setReports(res.reports);
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAction = (report: AdminReport, action: "resolve" | "dismiss") => {
    const label = action === "resolve" ? "Hal qilish" : "Rad etish";
    Alert.alert(label, `Ushbu shikoyatni ${label.toLowerCase()} istaysizmi?`, [
      { text: "Bekor", style: "cancel" },
      {
        text: label,
        onPress: async () => {
          if (action === "resolve") await adminApi.resolveReport(report.id);
          else await adminApi.dismissReport(report.id);
          load(page);
        },
      },
    ]);
  };

  const renderReport = ({ item }: { item: AdminReport }) => {
    const status = statusLabels[item.status] ?? statusLabels.PENDING;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString("uz")}
          </Text>
        </View>

        <Text style={styles.reason}>
          {reasonLabels[item.reason] ?? item.reason}
        </Text>

        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}

        <Text style={styles.reporter}>
          Shikoyatchi: {item.reporter.displayName} (@{item.reporter.username})
        </Text>

        {item.status === "PENDING" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#34C759" }]}
              onPress={() => handleAction(item, "resolve")}
            >
              <Text style={styles.actionText}>Hal qilish</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#8E8E93" }]}
              onPress={() => handleAction(item, "dismiss")}
            >
              <Text style={styles.actionText}>Rad etish</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading && reports.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={reports}
      keyExtractor={(i) => i.id}
      renderItem={renderReport}
      contentContainerStyle={{ padding: 16 }}
      ListEmptyComponent={
        <Text style={styles.empty}>Shikoyatlar yo'q</Text>
      }
      ListFooterComponent={
        totalPages > 1 ? (
          <View style={styles.pagination}>
            <TouchableOpacity disabled={page <= 1} onPress={() => load(page - 1)}>
              <Text style={[styles.pageBtn, page <= 1 && { opacity: 0.3 }]}>‹ Oldingi</Text>
            </TouchableOpacity>
            <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
            <TouchableOpacity disabled={page >= totalPages} onPress={() => load(page + 1)}>
              <Text style={[styles.pageBtn, page >= totalPages && { opacity: 0.3 }]}>Keyingi ›</Text>
            </TouchableOpacity>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  date: { fontSize: 12, color: colors.textSecondary },
  reason: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
  description: { fontSize: 14, color: colors.text, marginBottom: 6 },
  reporter: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  actionText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  empty: { textAlign: "center", marginTop: 40, color: colors.textSecondary, fontSize: 16 },
  pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", padding: 16, gap: 20 },
  pageBtn: { color: "#007AFF", fontSize: 15, fontWeight: "600" },
  pageInfo: { fontSize: 14, color: colors.textSecondary },
});
