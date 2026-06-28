import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert , RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { subscriptionsApi, ChannelSubscription } from "../../api/subscriptions";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "MySubscriptions">;

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
    Alert.alert("Obunani bekor qilish", `${sub.conversation?.name} kanalidan obunani bekor qilmoqchimisiz?`, [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "Ha, bekor qilish",
        style: "destructive",
        onPress: async () => {
          try {
            await subscriptionsApi.unsubscribe(sub.conversationId);
            setSubs((prev) => prev.filter((s) => s.id !== sub.id));
          } catch {
            Alert.alert("Xatolik", "Obunani bekor qilib bo'lmadi");
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  if (error) {
    return <ErrorView message="Obunalarni yuklab bo'lmadi" onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={subs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.subCard}
            onPress={() => navigation.navigate("ChatRoom", { conversationId: item.conversationId, title: item.conversation?.name ?? "Kanal" })}
            onLongPress={() => handleUnsubscribe(item)}
          >
            <View style={styles.subAvatar}>
              <Text style={styles.subAvatarText}>{(item.conversation?.name ?? "K").charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.subInfo}>
              <Text style={styles.subName}>{item.conversation?.name ?? "Kanal"}</Text>
              <Text style={styles.subTier}>
                {item.tier === "vip" ? "VIP" : item.tier === "premium" ? "Premium" : "Oddiy"} obuna
              </Text>
              <Text style={styles.subDate}>
                {new Date(item.startedAt).toLocaleDateString("uz-UZ")} dan beri
              </Text>
            </View>
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>
                {item.tier === "vip" ? "👑" : item.tier === "premium" ? "⭐" : "✓"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📢</Text>
            <Text style={styles.emptyText}>Obunalar yo'q</Text>
            <Text style={styles.emptyHint}>Kanallarga obuna bo'ling va maxsus kontent oling</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  list: { padding: 12, paddingBottom: 20 },
  subCard: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, alignItems: "center", gap: 12 },
  subAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FF9500", alignItems: "center", justifyContent: "center" },
  subAvatarText: { fontSize: 20, fontWeight: "700", color: "#fff" },
  subInfo: { flex: 1 },
  subName: { fontSize: 15, fontWeight: "600", color: colors.text },
  subTier: { fontSize: 12, color: colors.primary, marginTop: 2 },
  subDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  tierBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF3E0", alignItems: "center", justifyContent: "center" },
  tierBadgeText: { fontSize: 18 },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
  emptyHint: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
});
