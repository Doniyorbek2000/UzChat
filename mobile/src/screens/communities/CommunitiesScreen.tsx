import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { communitiesApi, Community } from "../../api/communities";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Communities">;

export function CommunitiesScreen({ navigation }: Props) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communitiesApi.listMine().then(setCommunities).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleDelete = (communityId: string) => {
    Alert.alert("O'chirish", "Bu jamiyatni o'chirmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            await communitiesApi.delete(communityId);
            setCommunities((prev) => prev.filter((c) => c.id !== communityId));
          } catch {}
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate("CreateCommunity")}>
        <Text style={styles.createBtnText}>+ Yangi jamiyat yaratish</Text>
      </TouchableOpacity>

      <FlatList
        data={communities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.communityCard}
            onPress={() => navigation.navigate("CommunityView", { communityId: item.id })}
            onLongPress={() => handleDelete(item.id)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              {item.description && <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>}
              <Text style={styles.meta}>{item.groups?.length ?? 0} guruh · {item.memberCount} a'zo</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏘️</Text>
            <Text style={styles.emptyText}>Jamiyatlar yo'q</Text>
            <Text style={styles.emptyHint}>Guruhlarni birlashtirish uchun jamiyat yarating</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  createBtn: { margin: 12, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  createBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  communityCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, alignItems: "center", gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#4CAF50", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22, fontWeight: "700", color: "#fff" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#333" },
  desc: { fontSize: 13, color: "#666", marginTop: 2 },
  meta: { fontSize: 12, color: "#999", marginTop: 4 },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#333", marginTop: 12 },
  emptyHint: { fontSize: 13, color: "#888", marginTop: 4 },
});
