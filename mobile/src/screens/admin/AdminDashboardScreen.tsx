import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { adminApi, DashboardStats, SystemHealth } from "../../api/admin";
import type { RootStackParamList } from "../../navigation/types";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AdminDashboardScreen() {
  const nav = useNavigation<Nav>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [s, h] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getSystemHealth(),
      ]);
      setStats(s);
      setHealth(h);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !stats) {
    return <ErrorView message="Dashboard ma'lumotlarini yuklab bo'lmadi" onRetry={load} />;
  }

  const formatBytes = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;
  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}s ${m}d`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
    >
      <Text style={styles.title}>Admin Panel</Text>

      {stats && (
        <>
          <Text style={styles.sectionTitle}>Statistika</Text>
          <View style={styles.grid}>
            <StatCard label="Foydalanuvchilar" value={stats.users.total} sub={`Bugun: +${stats.users.newToday}`} color="#007AFF" />
            <StatCard label="Suhbatlar" value={stats.conversations.total} color="#34C759" />
            <StatCard label="Xabarlar" value={stats.messages.total} sub={`Bugun: ${stats.messages.today}`} color="#FF9500" />
            <StatCard label="Do'konlar" value={stats.stores.total} color="#AF52DE" />
            <StatCard label="Buyurtmalar" value={stats.orders.total} color="#FF3B30" />
            <StatCard label="Postlar" value={stats.posts.total} color="#5856D6" />
          </View>
        </>
      )}

      {health && (
        <>
          <Text style={styles.sectionTitle}>Tizim holati</Text>
          <View style={styles.healthCard}>
            <HealthRow label="Holat" value={health.status === "ok" ? "Ishlayapti" : "Xatolik"} />
            <HealthRow label="Ishlash vaqti" value={formatUptime(health.uptime)} />
            <HealthRow label="Xotira (RSS)" value={formatBytes(health.memory.rss)} />
            <HealthRow label="Heap ishlatilgan" value={formatBytes(health.memory.heapUsed)} />
            <HealthRow label="DB kechikish" value={`${health.dbLatencyMs}ms`} />
            <HealthRow label="Node.js" value={health.nodeVersion} />
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Boshqaruv</Text>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => nav.navigate("AdminUsers" as any)}
      >
        <Text style={styles.menuIcon}>👥</Text>
        <Text style={styles.menuText}>Foydalanuvchilar</Text>
        <Text style={styles.menuArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => nav.navigate("AdminReports" as any)}
      >
        <Text style={styles.menuIcon}>🚨</Text>
        <Text style={styles.menuText}>Shikoyatlar</Text>
        <Text style={styles.menuArrow}>›</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.healthRow}>
      <Text style={styles.healthLabel}>{label}</Text>
      <Text style={styles.healthValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 20, color: colors.text },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 16, marginBottom: 10, color: colors.text },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    width: "48%",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  statSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  healthCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  healthRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  healthLabel: { fontSize: 14, color: colors.textSecondary },
  healthValue: { fontSize: 14, fontWeight: "600", color: colors.text },
  menuItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: { fontSize: 24, marginRight: 12 },
  menuText: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
  menuArrow: { fontSize: 22, color: "#C7C7CC" },
});
