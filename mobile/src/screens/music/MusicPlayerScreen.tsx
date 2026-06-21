import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from "react-native";
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "search" && search.trim()) {
        setTracks(await musicApi.search(search.trim()));
      } else {
        setTracks(await musicApi.getTrending());
      }
    } catch {}
    setLoading(false);
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);

  const handlePlay = async (track: MusicTrack) => {
    setPlaying(track.id);
    await musicApi.play(track.id).catch(() => {});
  };

  const handleLike = async (trackId: string) => {
    await musicApi.toggleLike(trackId).catch(() => {});
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <View style={styles.container}>
      <TextInput style={styles.searchInput} placeholder="Qo'shiq qidirish..." placeholderTextColor="#999" value={search} onChangeText={(t) => { setSearch(t); setTab(t.trim() ? "search" : "trending"); }} returnKeyType="search" />

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.trackCard, playing === item.id && styles.trackPlaying]} onPress={() => handlePlay(item)}>
              <View style={styles.trackCover}>
                <Text style={styles.trackCoverText}>{playing === item.id ? "▶" : "♪"}</Text>
              </View>
              <View style={styles.trackInfo}>
                <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.trackArtist}>{item.artist}</Text>
                <Text style={styles.trackMeta}>{formatDuration(item.duration)} · {item.playCount.toLocaleString()} tinglash</Text>
              </View>
              <TouchableOpacity style={styles.likeBtn} onPress={() => handleLike(item.id)}>
                <Text style={styles.likeBtnText}>♥ {item.likeCount}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎵</Text>
              <Text style={styles.emptyText}>{search.trim() ? "Qo'shiq topilmadi" : "Hozircha qo'shiqlar yo'q"}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111" },
  searchInput: { margin: 12, backgroundColor: "#222", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: "#fff" },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  trackCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, marginBottom: 4, gap: 12 },
  trackPlaying: { backgroundColor: "rgba(0,122,255,0.15)" },
  trackCover: { width: 48, height: 48, borderRadius: 8, backgroundColor: "#333", alignItems: "center", justifyContent: "center" },
  trackCoverText: { fontSize: 20, color: "#fff" },
  trackInfo: { flex: 1 },
  trackTitle: { fontSize: 15, fontWeight: "600", color: "#fff" },
  trackArtist: { fontSize: 12, color: "#aaa", marginTop: 2 },
  trackMeta: { fontSize: 10, color: "#666", marginTop: 2 },
  likeBtn: { paddingHorizontal: 10 },
  likeBtnText: { fontSize: 13, color: "#FF2D55" },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#aaa", marginTop: 12 },
});
