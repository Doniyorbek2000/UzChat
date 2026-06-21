import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { eventsApi, ChatEvent } from "../../api/events";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ConversationEvents">;

export function ConversationEventsScreen({ route }: Props) {
  const { conversationId } = route.params;
  const userId = useAuthStore((s) => s.user?.id);
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    eventsApi.listByConversation(conversationId).then(setEvents).catch(() => {}).finally(() => setLoading(false));
  }, [conversationId]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);

      const event = await eventsApi.create(conversationId, {
        title: title.trim(),
        location: location.trim() || undefined,
        startAt: tomorrow.toISOString(),
      });
      setEvents((prev) => [...prev, event]);
      setTitle("");
      setLocation("");
      setShowCreate(false);
    } catch {
      Alert.alert("Xatolik", "Tadbir yaratib bo'lmadi");
    }
    setCreating(false);
  };

  const handleRsvp = async (eventId: string, status: "going" | "maybe" | "not_going") => {
    try {
      await eventsApi.rsvp(eventId, status);
      const updated = await eventsApi.listByConversation(conversationId);
      setEvents(updated);
    } catch {}
  };

  const handleDelete = (eventId: string) => {
    Alert.alert("O'chirish", "Bu tadbirni o'chirmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            await eventsApi.delete(eventId);
            setEvents((prev) => prev.filter((e) => e.id !== eventId));
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
      <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(!showCreate)}>
        <Text style={styles.createBtnText}>{showCreate ? "Bekor qilish" : "+ Yangi tadbir"}</Text>
      </TouchableOpacity>

      {showCreate && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Tadbir nomi..." placeholderTextColor="#999" value={title} onChangeText={setTitle} />
          <TextInput style={styles.input} placeholder="Manzil (ixtiyoriy)..." placeholderTextColor="#999" value={location} onChangeText={setLocation} />
          <TouchableOpacity style={[styles.submitBtn, (!title.trim() || creating) && { opacity: 0.5 }]} onPress={handleCreate} disabled={!title.trim() || creating}>
            {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Yaratish</Text>}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const date = new Date(item.startAt);
          const myRsvp = item.rsvps?.find((r) => r.userId === userId);
          const isCreator = item.creatorId === userId;

          return (
            <TouchableOpacity style={styles.eventCard} onLongPress={() => isCreator && handleDelete(item.id)}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventDate}>📅 {date.toLocaleDateString("uz-UZ")}</Text>
                {item.location && <Text style={styles.eventLocation}>📍 {item.location}</Text>}
              </View>
              <Text style={styles.eventTitle}>{item.title}</Text>
              {item.description && <Text style={styles.eventDesc}>{item.description}</Text>}
              <Text style={styles.eventMeta}>{item.creator.displayName} · {item.rsvps?.filter((r) => r.status === "going").length ?? 0} boruvchi</Text>
              <View style={styles.rsvpRow}>
                {(["going", "maybe", "not_going"] as const).map((status) => (
                  <TouchableOpacity key={status} style={[styles.rsvpBtn, myRsvp?.status === status && styles.rsvpBtnActive]} onPress={() => handleRsvp(item.id, status)}>
                    <Text style={[styles.rsvpText, myRsvp?.status === status && styles.rsvpTextActive]}>
                      {status === "going" ? "Boraman" : status === "maybe" ? "Balki" : "Bormayman"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>Tadbirlar yo'q</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  createBtn: { margin: 12, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  createBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  form: { marginHorizontal: 12, marginBottom: 8, gap: 8 },
  input: { backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: "#333" },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  submitBtnText: { color: "#fff", fontWeight: "600" },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  eventCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8 },
  eventHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  eventDate: { fontSize: 12, color: "#FF9500", fontWeight: "600" },
  eventLocation: { fontSize: 12, color: "#888" },
  eventTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 4 },
  eventDesc: { fontSize: 13, color: "#666", marginBottom: 4 },
  eventMeta: { fontSize: 11, color: "#999", marginBottom: 8 },
  rsvpRow: { flexDirection: "row", gap: 6 },
  rsvpBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: "#F2F2F7" },
  rsvpBtnActive: { backgroundColor: colors.primary },
  rsvpText: { fontSize: 11, fontWeight: "600", color: "#666" },
  rsvpTextActive: { color: "#fff" },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#333", marginTop: 12 },
});
