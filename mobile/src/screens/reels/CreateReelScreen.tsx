import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { reelsApi } from "../../api/reels";
import { uploadPlainFile } from "../../utils/mediaFile";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "CreateReel">;

export function CreateReelScreen({ navigation }: Props) {
  const [videoUrl, setVideoUrl] = useState("");
  const [videoLocalUri, setVideoLocalUri] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const onPickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Ruxsat kerak", "Video tanlash uchun gallereyaga ruxsat bering");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setVideoLocalUri(asset.uri);
    setUploading(true);
    try {
      const { url } = await uploadPlainFile(asset.uri, asset.mimeType ?? "video/mp4");
      setVideoUrl(url);
    } catch {
      Alert.alert("Xatolik", "Video yuklashda xatolik");
      setVideoLocalUri(null);
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!videoUrl.trim()) {
      Alert.alert("Xatolik", "Video tanlang yoki URL kiriting");
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
      <TouchableOpacity style={styles.uploadArea} onPress={onPickVideo} disabled={uploading}>
        {uploading ? (
          <>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.uploadText}>Yuklanmoqda...</Text>
          </>
        ) : videoLocalUri ? (
          <>
            <Image source={{ uri: videoLocalUri }} style={styles.uploadPreview} />
            <View style={styles.uploadOverlay}>
              <Text style={styles.uploadOverlayText}>O'zgartirish</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.uploadIcon}>🎬</Text>
            <Text style={styles.uploadText}>Video tanlash</Text>
            <Text style={styles.uploadHint}>Galereyadan tanlang yoki URL kiriting</Text>
          </>
        )}
      </TouchableOpacity>

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
  container: { flex: 1, backgroundColor: colors.surface },
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
  uploadHint: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  uploadPreview: { width: "100%", height: "100%", borderRadius: 16 },
  uploadOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.5)", padding: 8, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, alignItems: "center" },
  uploadOverlayText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
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
