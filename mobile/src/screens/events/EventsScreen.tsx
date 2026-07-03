import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { eventsApi, ChatEvent } from "../../api/events";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";
import { tr } from "../../i18n";

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
    } catch {
      Alert.alert(tr("Xatolik"), tr("Ishtirokni belgilab bo'lmadi"));
    }
  };

  const getMyRsvp = (event: ChatEvent) => event.rsvps?.find((r) => r.userId === userId);

  const renderEvent = ({ item }: { item: ChatEvent }) => {
    const date = new Date(item.startAt);
    const myRsvp = getMyRsvp(item);
    const goingCount = item.rsvps?.filter((r) => r.status === "going").length ?? 0;

    return (
      <View style={styles.eventCard}>
        <View style={[styles.dateColumn, { backgroundColor: (item.color || colors.primary) + "15" }]}>
          <Text style={[styles.dateMonth, { color: item.color || colors.danger }]}>
            {date.toLocaleDateString("uz-UZ", { month: "short" }).toUpperCase()}
          </Text>
          <Text style={styles.dateDay}>{date.getDate()}</Text>
          <Text style={styles.dateTime}>
            {item.isAllDay ? "Kun bo'yi" : date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          {item.location && (
            <View style={styles.eventDetailRow}>
              <Text style={styles.eventDetailIcon}>📍</Text>
              <Text style={styles.eventDetailText}>{item.location}</Text>
            </View>
          )}
          {item.conversation && (
            <View style={styles.eventDetailRow}>
              <Text style={styles.eventDetailIcon}>💬</Text>
              <Text style={styles.eventDetailText}>{item.conversation.name}</Text>
            </View>
          )}
          <View style={styles.eventDetailRow}>
            <Text style={styles.eventDetailIcon}>👤</Text>
            <Text style={styles.eventDetailText}>{item.creator.displayName} · {goingCount} boruvchi</Text>
          </View>

          <View style={styles.rsvpRow}>
            {(["going", "maybe", "not_going"] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.rsvpBtn, myRsvp?.status === status && styles.rsvpBtnActive]}
                onPress={() => handleRsvp(item.id, status)}
                activeOpacity={0.7}
              >
                <Text style={[styles.rsvpBtnText, myRsvp?.status === status && styles.rsvpBtnTextActive]}>
                  {status === "going" ? "✓ Boraman" : status === "maybe" ? "? Balki" : "✕ Yo'q"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message={tr("Tadbirlarni yuklab bo'lmadi")} onRetry={loadData} />;
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
            <Text style={styles.emptyTitle}>{tr("Kelgusi tadbirlar yo'q")}</Text>
            <Text style={styles.emptyHint}>{tr("Guruh yoki kanaldagi tadbirlar shu yerda ko'rinadi")}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, paddingBottom: 20 },
  eventCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dateColumn: {
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  dateMonth: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  dateDay: { fontSize: 22, fontWeight: "700", color: colors.text },
  dateTime: { fontSize: 9, color: colors.textSecondary },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 4 },
  eventDetailRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  eventDetailIcon: { fontSize: 11 },
  eventDetailText: { fontSize: 12, color: colors.textSecondary },
  rsvpRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  rsvpBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  rsvpBtnActive: { backgroundColor: colors.primary },
  rsvpBtnText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  rsvpBtnTextActive: { color: "#fff" },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
