import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator , RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { eventsApi, ChatEvent } from "../../api/events";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "Events">;

export function EventsScreen({ navigation }: Props) {
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const userId = useAuthStore((s) => s.user?.id);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    eventsApi.getUpcoming().then(setEvents).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    eventsApi.getUpcoming().then(setEvents).catch(() => {}).finally(() => setRefreshing(false));
  }, []);

  const handleRsvp = async (eventId: string, status: "going" | "maybe" | "not_going") => {
    try {
      await eventsApi.rsvp(eventId, status);
      const updated = await eventsApi.getUpcoming();
      setEvents(updated);
    } catch {}
  };

  const getMyRsvp = (event: ChatEvent) => event.rsvps?.find((r) => r.userId === userId);

  const renderEvent = ({ item }: { item: ChatEvent }) => {
    const date = new Date(item.startAt);
    const myRsvp = getMyRsvp(item);
    const goingCount = item.rsvps?.filter((r) => r.status === "going").length ?? 0;

    return (
      <View style={[styles.eventCard, { borderLeftColor: item.color }]}>
        <View style={styles.dateColumn}>
          <Text style={styles.dateMonth}>{date.toLocaleDateString("uz-UZ", { month: "short" }).toUpperCase()}</Text>
          <Text style={styles.dateDay}>{date.getDate()}</Text>
          <Text style={styles.dateTime}>{item.isAllDay ? "Kun bo'yi" : date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          {item.location && <Text style={styles.eventLocation}>📍 {item.location}</Text>}
          {item.conversation && <Text style={styles.eventGroup}>💬 {item.conversation.name}</Text>}
          <Text style={styles.eventCreator}>{item.creator.displayName} · {goingCount} boruvchi</Text>

          <View style={styles.rsvpRow}>
            {(["going", "maybe", "not_going"] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.rsvpBtn, myRsvp?.status === status && styles.rsvpBtnActive]}
                onPress={() => handleRsvp(item.id, status)}
              >
                <Text style={[styles.rsvpBtnText, myRsvp?.status === status && styles.rsvpBtnTextActive]}>
                  {status === "going" ? "Boraman" : status === "maybe" ? "Balki" : "Bormayman"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  if (error) {
    return <ErrorView message="Tadbirlarni yuklab bo'lmadi" onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>Kelgusi tadbirlar yo'q</Text>
            <Text style={styles.emptyHint}>Guruh yoki kanaldagi tadbirlar shu yerda ko'rinadi</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  list: { padding: 12, paddingBottom: 20 },
  eventCard: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, gap: 14 },
  dateColumn: { alignItems: "center", width: 50 },
  dateMonth: { fontSize: 10, fontWeight: "700", color: "#FF3B30", letterSpacing: 0.5 },
  dateDay: { fontSize: 28, fontWeight: "700", color: colors.text },
  dateTime: { fontSize: 10, color: colors.textSecondary },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 4 },
  eventLocation: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  eventGroup: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  eventCreator: { fontSize: 11, color: colors.textSecondary, marginBottom: 8 },
  rsvpRow: { flexDirection: "row", gap: 6 },
  rsvpBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: colors.surface },
  rsvpBtnActive: { backgroundColor: colors.primary },
  rsvpBtnText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  rsvpBtnTextActive: { color: "#fff" },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
  emptyHint: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
});
