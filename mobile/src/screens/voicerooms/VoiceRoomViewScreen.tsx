import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { voiceRoomsApi, VoiceRoom, VoiceRoomParticipant } from "../../api/voiceRooms";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "VoiceRoomView">;

export function VoiceRoomViewScreen({ route, navigation }: Props) {
  const { roomId } = route.params;
  const userId = useAuthStore((s) => s.user?.id);
  const [room, setRoom] = useState<VoiceRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    voiceRoomsApi.get(roomId).then((r) => {
      setRoom(r);
      setJoined(r.participants?.some((p) => p.userId === userId) ?? false);
    }).catch(() => navigation.goBack()).finally(() => setLoading(false));
  }, [roomId, userId, navigation]);

  const handleJoin = async () => {
    try {
      await voiceRoomsApi.join(roomId);
      setJoined(true);
      const updated = await voiceRoomsApi.get(roomId);
      setRoom(updated);
    } catch {
      Alert.alert("Xatolik", "Xonaga qo'shilib bo'lmadi");
    }
  };

  const handleLeave = async () => {
    try {
      await voiceRoomsApi.leave(roomId);
      setJoined(false);
      navigation.goBack();
    } catch {}
  };

  const handleEnd = () => {
    Alert.alert("Tugatish", "Xonani tugatmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "Tugatish",
        style: "destructive",
        onPress: async () => {
          try {
            await voiceRoomsApi.end(roomId);
            navigation.goBack();
          } catch {}
        },
      },
    ]);
  };

  const handleToggleMute = async () => {
    try {
      await voiceRoomsApi.toggleMute(roomId);
      const updated = await voiceRoomsApi.get(roomId);
      setRoom(updated);
    } catch {}
  };

  if (loading || !room) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  const isHost = room.hostId === userId;
  const speakers = room.participants?.filter((p) => p.role === "speaker") ?? [];
  const listeners = room.participants?.filter((p) => p.role === "listener") ?? [];
  const myParticipant = room.participants?.find((p) => p.userId === userId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: room.status === "LIVE" ? "#FF3B30" : "#FF9500" }]} />
          <Text style={styles.statusText}>{room.status === "LIVE" ? "JONLI" : room.status}</Text>
        </View>
        <Text style={styles.title}>{room.title}</Text>
        <Text style={styles.host}>{room.host?.displayName}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>So'zlovchilar ({speakers.length})</Text>
        <View style={styles.speakerGrid}>
          {speakers.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.speakerCard}
              onLongPress={() => {
                if (isHost && p.userId !== userId) {
                  Alert.alert(p.user.displayName, undefined, [
                    { text: "Tinglovchiga aylantirish", onPress: () => voiceRoomsApi.demoteToListener(roomId, p.userId).then(() => voiceRoomsApi.get(roomId).then(setRoom)) },
                    { text: "Bekor qilish", style: "cancel" },
                  ]);
                }
              }}
            >
              <View style={styles.speakerAvatar}>
                <Text style={styles.speakerAvatarText}>{p.user.displayName.charAt(0).toUpperCase()}</Text>
                {!p.isMuted && <View style={styles.speakingIndicator} />}
              </View>
              <Text style={styles.speakerName} numberOfLines={1}>{p.user.displayName}</Text>
              {p.isMuted && <Text style={styles.mutedIcon}>🔇</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tinglovchilar ({listeners.length})</Text>
        <FlatList
          data={listeners}
          keyExtractor={(item) => item.id}
          numColumns={4}
          renderItem={({ item }: { item: VoiceRoomParticipant }) => (
            <TouchableOpacity
              style={styles.listenerCard}
              onLongPress={() => {
                if (isHost) {
                  Alert.alert(item.user.displayName, undefined, [
                    { text: "So'zlovchiga ko'tarish", onPress: () => voiceRoomsApi.promoteToSpeaker(roomId, item.userId).then(() => voiceRoomsApi.get(roomId).then(setRoom)) },
                    { text: "Bekor qilish", style: "cancel" },
                  ]);
                }
              }}
            >
              <View style={styles.listenerAvatar}>
                <Text style={styles.listenerAvatarText}>{item.user.displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.listenerName} numberOfLines={1}>{item.user.displayName}</Text>
            </TouchableOpacity>
          )}
          scrollEnabled={false}
        />
      </View>

      <View style={styles.controls}>
        {joined && myParticipant && (
          <TouchableOpacity style={styles.muteBtn} onPress={handleToggleMute}>
            <Text style={styles.muteBtnText}>{myParticipant.isMuted ? "🔇 Ovozni yoqish" : "🎤 Ovozni o'chirish"}</Text>
          </TouchableOpacity>
        )}
        {!joined && room.status === "LIVE" && (
          <TouchableOpacity style={styles.joinBtn} onPress={handleJoin}>
            <Text style={styles.joinBtnText}>Qo'shilish</Text>
          </TouchableOpacity>
        )}
        {joined && (
          <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
            <Text style={styles.leaveBtnText}>Chiqish</Text>
          </TouchableOpacity>
        )}
        {isHost && room.status === "LIVE" && (
          <TouchableOpacity style={styles.endBtn} onPress={handleEnd}>
            <Text style={styles.endBtnText}>Tugatish</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { padding: 20, alignItems: "center", backgroundColor: "#fff", borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 12, fontWeight: "700", color: "#888", letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: "700", color: "#333", textAlign: "center" },
  host: { fontSize: 14, color: "#666", marginTop: 4 },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#666", marginBottom: 12 },
  speakerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  speakerCard: { alignItems: "center", width: 72 },
  speakerAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  speakerAvatarText: { fontSize: 22, fontWeight: "700", color: "#fff" },
  speakingIndicator: { position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: "#4CD964", borderWidth: 2, borderColor: "#fff" },
  speakerName: { fontSize: 11, color: "#333", marginTop: 4, textAlign: "center" },
  mutedIcon: { fontSize: 10 },
  listenerCard: { alignItems: "center", width: "25%", marginBottom: 12 },
  listenerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#C7C7CC", alignItems: "center", justifyContent: "center" },
  listenerAvatarText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  listenerName: { fontSize: 10, color: "#666", marginTop: 4, textAlign: "center" },
  controls: { flexDirection: "row", gap: 10, padding: 16, position: "absolute", bottom: 30, left: 0, right: 0, justifyContent: "center" },
  muteBtn: { backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24 },
  muteBtnText: { fontSize: 13, fontWeight: "600", color: "#333" },
  joinBtn: { backgroundColor: colors.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 24 },
  joinBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  leaveBtn: { backgroundColor: "#FF9500", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 },
  leaveBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  endBtn: { backgroundColor: "#FF3B30", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 },
  endBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
});
