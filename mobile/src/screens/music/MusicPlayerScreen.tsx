import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Audio } from "expo-av";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { musicApi, MusicTrack } from "../../api/music";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "MusicPlayer">;

export function MusicPlayerScreen(_props: Props) {
  const [tab, setTab] = useState<"trending" | "search">("trending");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "search" && search.trim()) {
        setTracks(await musicApi.search(search.trim()));
      } else {
        setTracks(await musicApi.getTrending());
      }
    } catch {
      Alert.alert("Xatolik", "Musiqalarni yuklab bo'lmadi");
    }
    setLoading(false);
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const handlePlay = async (track: MusicTrack) => {
    if (playing === track.id && soundRef.current) {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
      return;
    }

    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }

    setPlaying(track.id);
    setIsPlaying(true);
    setProgress(0);
    musicApi.play(track.id).catch(() => {});

    if (track.audioUrl) {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: track.audioUrl },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              if (status.durationMillis && status.positionMillis) {
                setProgress(status.positionMillis / status.durationMillis);
              }
              if (status.didJustFinish) {
                setIsPlaying(false);
                setProgress(0);
              }
            }
          }
        );
        soundRef.current = sound;
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const handleLike = async (trackId: string) => {
    await musicApi.toggleLike(trackId).catch(() => {});
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Qo'shiq qidirish..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={(t) => { setSearch(t); setTab(t.trim() ? "search" : "trending"); }}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(""); setTab("trending"); }} hitSlop={8}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {!search.trim() && (
        <Text style={styles.sectionTitle}>🔥 Trendda</Text>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={tracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isActive = playing === item.id;
            return (
              <TouchableOpacity
                style={[styles.trackCard, isActive && styles.trackPlaying]}
                activeOpacity={0.7}
                onPress={() => handlePlay(item)}
              >
                <View style={[styles.trackCover, isActive && styles.trackCoverActive]}>
                  <Text style={styles.trackCoverText}>{isActive && isPlaying ? "⏸" : "▶"}</Text>
                </View>
                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.trackArtist}>{item.artist}</Text>
                  <Text style={styles.trackMeta}>{formatDuration(item.duration)} · {item.playCount.toLocaleString()} tinglash</Text>
                  {isActive && (
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                  )}
                </View>
                <TouchableOpacity style={styles.likeBtn} onPress={() => handleLike(item.id)}>
                  <Text style={styles.likeBtnText}>♥ {item.likeCount}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎵</Text>
              <Text style={styles.emptyTitle}>{search.trim() ? "Qo'shiq topilmadi" : "Hozircha qo'shiqlar yo'q"}</Text>
              <Text style={styles.emptyHint}>{search.trim() ? "Boshqa kalit so'z bilan qidiring" : "Tez orada yangi qo'shiqlar qo'shiladi"}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: "#fff", height: "100%", padding: 0 },
  searchClear: { fontSize: 16, color: "#888", paddingHorizontal: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#fff", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  trackCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    marginBottom: 4,
    gap: 12,
  },
  trackPlaying: { backgroundColor: "rgba(0,122,255,0.12)" },
  trackCover: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  trackCoverActive: { backgroundColor: colors.primary },
  trackCoverText: { fontSize: 18, color: "#fff" },
  trackInfo: { flex: 1 },
  trackTitle: { fontSize: 15, fontWeight: "600", color: "#fff" },
  trackArtist: { fontSize: 12, color: "#aaa", marginTop: 2 },
  trackMeta: { fontSize: 10, color: "#777", marginTop: 2 },
  progressBar: { height: 3, backgroundColor: "#333", borderRadius: 2, marginTop: 6 },
  progressFill: { height: 3, backgroundColor: colors.primary, borderRadius: 2 },
  likeBtn: { paddingHorizontal: 10 },
  likeBtnText: { fontSize: 13, color: "#FF2D55" },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#fff", marginBottom: 6 },
  emptyHint: { fontSize: 14, color: "#888", textAlign: "center" },
});
