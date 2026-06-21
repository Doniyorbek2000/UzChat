import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { liveStreamApi, LiveStream } from "../../api/livestream";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "LiveStreamView">;

export function LiveStreamViewScreen({ route, navigation }: Props) {
  const { streamId } = route.params;
  const userId = useAuthStore((s) => s.user?.id);
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    liveStreamApi.get(streamId).then((s) => {
      setStream(s);
      if (s.status === "LIVE") liveStreamApi.recordView(streamId).catch(() => {});
    }).catch(() => navigation.goBack()).finally(() => setLoading(false));
  }, [streamId, navigation]);

  const handleLike = async () => {
    try {
      await liveStreamApi.like(streamId);
      setLiked(!liked);
      setStream((prev) => prev ? { ...prev, likeCount: prev.likeCount + (liked ? -1 : 1) } : prev);
    } catch {}
  };

  const handleStart = async () => {
    try {
      const updated = await liveStreamApi.start(streamId);
      setStream(updated);
    } catch {
      Alert.alert("Xatolik", "Efirni boshlab bo'lmadi");
    }
  };

  const handleEnd = () => {
    Alert.alert("Tugatish", "Efirni tugatmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "Tugatish",
        style: "destructive",
        onPress: async () => {
          try {
            await liveStreamApi.end(streamId);
            navigation.goBack();
          } catch {}
        },
      },
    ]);
  };

  if (loading || !stream) {
    return <ActivityIndicator size="large" color="#FF3B30" style={{ flex: 1, justifyContent: "center", backgroundColor: "#000" }} />;
  }

  const isHost = stream.hostId === userId;

  return (
    <View style={styles.container}>
      <View style={styles.videoArea}>
        <Text style={styles.placeholderIcon}>📡</Text>
        <Text style={styles.placeholderText}>
          {stream.status === "LIVE" ? "Jonli efir" : stream.status === "SCHEDULED" ? "Rejalashtirilgan" : "Tugagan"}
        </Text>
      </View>

      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>✕</Text>
          </TouchableOpacity>
          <View style={styles.topInfo}>
            {stream.status === "LIVE" && (
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>JONLI</Text>
              </View>
            )}
            <Text style={styles.viewerCount}>👁 {stream.viewerCount.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.bottomBar}>
          <View style={styles.streamDetails}>
            <Text style={styles.streamTitle}>{stream.title}</Text>
            <Text style={styles.streamHost}>{stream.host?.displayName}</Text>
            {stream.description && <Text style={styles.streamDesc}>{stream.description}</Text>}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
              <Text style={styles.actionIcon}>{liked ? "❤️" : "🤍"}</Text>
              <Text style={styles.actionCount}>{stream.likeCount}</Text>
            </TouchableOpacity>

            <View style={styles.actionBtn}>
              <Text style={styles.actionIcon}>👁</Text>
              <Text style={styles.actionCount}>{stream.peakViewers}</Text>
            </View>
          </View>

          {isHost && stream.status === "SCHEDULED" && (
            <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
              <Text style={styles.startBtnText}>Efirni boshlash</Text>
            </TouchableOpacity>
          )}

          {isHost && stream.status === "LIVE" && (
            <TouchableOpacity style={styles.endBtn} onPress={handleEnd}>
              <Text style={styles.endBtnText}>Efirni tugatish</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  videoArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  placeholderIcon: { fontSize: 64 },
  placeholderText: { fontSize: 16, color: "#666", marginTop: 12 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "space-between" },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingTop: 50 },
  backBtn: { fontSize: 24, color: "#fff", fontWeight: "600" },
  topInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  liveBadge: { backgroundColor: "#FF3B30", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  liveBadgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  viewerCount: { fontSize: 14, color: "#fff", fontWeight: "600" },
  bottomBar: { padding: 16, paddingBottom: 40, backgroundColor: "rgba(0,0,0,0.6)" },
  streamDetails: { marginBottom: 12 },
  streamTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  streamHost: { fontSize: 14, color: "#ccc", marginTop: 4 },
  streamDesc: { fontSize: 13, color: "#aaa", marginTop: 6 },
  actions: { flexDirection: "row", gap: 20, marginBottom: 12 },
  actionBtn: { alignItems: "center" },
  actionIcon: { fontSize: 24 },
  actionCount: { fontSize: 12, color: "#fff", marginTop: 2 },
  startBtn: { backgroundColor: "#FF3B30", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  startBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  endBtn: { backgroundColor: "#333", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  endBtnText: { color: "#FF3B30", fontWeight: "700", fontSize: 16 },
});
