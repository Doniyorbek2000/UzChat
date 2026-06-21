import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { botsApi, Bot } from "../../api/bots";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "BotDetail">;

export function BotDetailScreen({ route, navigation }: Props) {
  const { botId } = route.params;
  const [bot, setBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    botsApi.get(botId).then(setBot).catch(() => {}).finally(() => setLoading(false));
  }, [botId]);

  const handleToggle = async () => {
    if (!bot) return;
    try {
      const updated = await botsApi.toggleActive(botId);
      setBot(updated);
    } catch {
      Alert.alert("Xatolik", "Holatni o'zgartirib bo'lmadi");
    }
  };

  const handleDelete = () => {
    Alert.alert("Botni o'chirish", "Haqiqatan ham bu botni o'chirmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            await botsApi.delete(botId);
            navigation.goBack();
          } catch {
            Alert.alert("Xatolik", "Botni o'chirib bo'lmadi");
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }
  if (!bot) {
    return <Text style={styles.emptyText}>Bot topilmadi</Text>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🤖</Text>
        </View>
        <Text style={styles.botName}>{bot.displayName}</Text>
        <Text style={styles.botUsername}>@{bot.username}</Text>
        {bot.description && <Text style={styles.description}>{bot.description}</Text>}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: bot.isActive ? "#34C759" : "#FF3B30" }]} />
          <Text style={styles.statusText}>{bot.isActive ? "Faol" : "Nofaol"}</Text>
          {bot.isInline && <Text style={styles.inlineBadge}>Inline</Text>}
        </View>
      </View>

      {bot.owner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yaratuvchi</Text>
          <Text style={styles.ownerText}>{bot.owner.displayName} (@{bot.owner.username})</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Buyruqlar ({bot.commands.length})</Text>
        {bot.commands.length === 0 ? (
          <Text style={styles.emptyCmds}>Buyruqlar yo'q</Text>
        ) : (
          bot.commands.map((cmd) => (
            <View key={cmd.id} style={styles.cmdRow}>
              <Text style={styles.cmdName}>/{cmd.command}</Text>
              <Text style={styles.cmdDesc}>{cmd.description}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.toggleBtn} onPress={handleToggle}>
          <Text style={styles.toggleBtnText}>{bot.isActive ? "To'xtatish" : "Faollashtirish"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Botni o'chirish</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  content: { paddingBottom: 40 },
  header: { backgroundColor: "#fff", padding: 24, alignItems: "center", marginBottom: 8 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 36 },
  botName: { fontSize: 22, fontWeight: "700", color: "#333" },
  botUsername: { fontSize: 14, color: "#888", marginTop: 4 },
  description: { fontSize: 14, color: "#666", marginTop: 8, textAlign: "center", paddingHorizontal: 20 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, color: "#666", fontWeight: "500" },
  inlineBadge: { fontSize: 11, fontWeight: "600", color: colors.primary, backgroundColor: "#E3F2FD", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  section: { backgroundColor: "#fff", padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 12 },
  ownerText: { fontSize: 14, color: "#666" },
  emptyCmds: { fontSize: 13, color: "#999", fontStyle: "italic" },
  cmdRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E5EA" },
  cmdName: { fontSize: 14, fontWeight: "600", color: colors.primary },
  cmdDesc: { fontSize: 13, color: "#666", marginTop: 2 },
  actions: { padding: 16, gap: 8 },
  toggleBtn: { backgroundColor: "#E5E5EA", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  toggleBtnText: { fontWeight: "600", fontSize: 15, color: "#333" },
  deleteBtn: { backgroundColor: "#FFEBEE", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  deleteBtnText: { fontWeight: "600", fontSize: 15, color: "#FF3B30" },
  emptyText: { textAlign: "center", color: "#999", fontSize: 15, padding: 40 },
});
