import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { subscriptionsApi, ChannelSubscription } from "../../api/subscriptions";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "MySubscriptions">;

const TIER_CONFIG = {
  vip: { icon: "👑", label: tr("VIP"), color: "#FF9500", bg: "#FF9500" + "15" },
  premium: { icon: "⭐", label: tr("Premium"), color: "#AF52DE", bg: "#AF52DE" + "15" },
  basic: { icon: "✓", label: tr("Oddiy"), color: "#34C759", bg: "#34C759" + "15" },
};

export function MySubscriptionsScreen({ navigation }: Props) {
  const [subs, setSubs] = useState<ChannelSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    subscriptionsApi.getMySubscriptions().then(setSubs).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    subscriptionsApi.getMySubscriptions().then(setSubs).catch(() => {}).finally(() => setRefreshing(false));
  }, []);

  const handleUnsubscribe = (sub: ChannelSubscription) => {
    Alert.alert(tr("Obunani bekor qilish"), `${sub.conversation?.name} kanalidan obunani bekor qilmoqchimisiz?`, [
      { text: tr("Bekor qilish"), style: "cancel" },
      {
        text: tr("Ha, bekor qilish"),
        style: "destructive",
        onPress: async () => {
          try {
            await subscriptionsApi.unsubscribe(sub.conversationId);
            setSubs((prev) => prev.filter((s) => s.id !== sub.id));
          } catch {
            Alert.alert(tr("Xatolik"), tr("Obunani bekor qilib bo'lmadi"));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message={tr("Obunalarni yuklab bo'lmadi")} onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      {subs.length > 0 && (
        <Text style={styles.countText}>{subs.length} ta obuna</Text>
      )}
      <FlatList
        data={subs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const tier = TIER_CONFIG[item.tier as keyof typeof TIER_CONFIG] ?? TIER_CONFIG.basic;
          return (
            <TouchableOpacity
              style={styles.subCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("ChatRoom", { conversationId: item.conversationId, title: item.conversation?.name ?? "Kanal" })}
              onLongPress={() => handleUnsubscribe(item)}
            >
              <View style={styles.subAvatar}>
                <Text style={styles.subAvatarText}>{(item.conversation?.name ?? "K").charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.subInfo}>
                <Text style={styles.subName}>{item.conversation?.name ?? "Kanal"}</Text>
                <View style={[styles.tierBadge, { backgroundColor: tier.bg }]}>
                  <Text style={[styles.tierBadgeText, { color: tier.color }]}>{tier.icon} {tier.label}</Text>
                </View>
                <Text style={styles.subDate}>
                  {new Date(item.startedAt).toLocaleDateString("uz-UZ")} dan beri
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📢</Text>
            <Text style={styles.emptyTitle}>{tr("Obunalar yo'q")}</Text>
            <Text style={styles.emptyHint}>{tr("Kanallarga obuna bo'ling va maxsus kontent oling")}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  countText: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 },
  subCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  subAvatar: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  subAvatarText: { fontSize: 20, fontWeight: "700", color: "#fff" },
  subInfo: { flex: 1 },
  subName: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 4 },
  tierBadge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  tierBadgeText: { fontSize: 11, fontWeight: "600" },
  subDate: { fontSize: 11, color: colors.textSecondary },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
