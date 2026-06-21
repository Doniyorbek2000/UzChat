import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { reelsApi } from "../../api/reels";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "CreateReel">;

export function CreateReelScreen({ navigation }: Props) {
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!videoUrl.trim()) {
      Alert.alert("Xatolik", "Video URL kiritilishi shart");
      return;
    }
    setCreating(true);
    try {
      await reelsApi.create({
        videoUrl: videoUrl.trim(),
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        caption: caption.trim() || undefined,
        musicTitle: musicTitle.trim() || undefined,
        hashtags: hashtags.trim()
          ? hashtags.split(",").map((h) => h.trim()).filter(Boolean)
          : undefined,
      });
      Alert.alert("Muvaffaqiyat", "Reel yaratildi!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message || "Reel yaratib bo'lmadi");
    }
    setCreating(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.uploadArea}>
        <Text style={styles.uploadIcon}>🎬</Text>
        <Text style={styles.uploadText}>Video yuklash</Text>
        <Text style={styles.uploadHint}>Yoki URL kiriting</Text>
      </View>

      <Text style={styles.label}>Video URL</Text>
      <TextInput
        style={styles.input}
        placeholder="https://..."
        placeholderTextColor="#999"
        value={videoUrl}
        onChangeText={setVideoUrl}
        autoCapitalize="none"
        keyboardType="url"
      />

      <Text style={styles.label}>Muqova rasm URL (ixtiyoriy)</Text>
      <TextInput
        style={styles.input}
        placeholder="https://..."
        placeholderTextColor="#999"
        value={thumbnailUrl}
        onChangeText={setThumbnailUrl}
        autoCapitalize="none"
        keyboardType="url"
      />

      <Text style={styles.label}>Tavsif</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Reel haqida..."
        placeholderTextColor="#999"
        value={caption}
        onChangeText={setCaption}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Musiqa nomi (ixtiyoriy)</Text>
      <TextInput
        style={styles.input}
        placeholder="Qo'shiq nomi"
        placeholderTextColor="#999"
        value={musicTitle}
        onChangeText={setMusicTitle}
      />

      <Text style={styles.label}>Hashtaglar (vergul bilan)</Text>
      <TextInput
        style={styles.input}
        placeholder="uzchat, video, reel"
        placeholderTextColor="#999"
        value={hashtags}
        onChangeText={setHashtags}
      />

      <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={creating}>
        {creating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.createBtnText}>Reel joylash</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  content: { padding: 16, paddingBottom: 40 },
  uploadArea: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  uploadIcon: { fontSize: 40 },
  uploadText: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 8 },
  uploadHint: { color: "#888", fontSize: 12, marginTop: 4 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#333",
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
