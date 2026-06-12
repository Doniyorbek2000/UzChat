import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useWallpaperStore } from "../../store/wallpaperStore";
import { colors } from "../../theme/colors";
import {
  CHAT_WALLPAPERS,
  ChatWallpaper,
  DEFAULT_WALLPAPER_KEY,
  getCustomWallpaperUri,
  makeCustomWallpaperId,
} from "../../theme/wallpapers";

type Props = NativeStackScreenProps<RootStackParamList, "ChatWallpaper">;

export function ChatWallpaperScreen({ route }: Props) {
  const { conversationId } = route.params;
  const wallpapers = useWallpaperStore((s) => s.wallpapers);
  const setWallpaper = useWallpaperStore((s) => s.setWallpaper);
  const [picking, setPicking] = useState(false);
  const activeId = wallpapers[conversationId] ?? wallpapers[DEFAULT_WALLPAPER_KEY] ?? "standard";
  const customUri = getCustomWallpaperUri(activeId);

  const onSetForAll = () => {
    Alert.alert("Barcha suhbatlar uchun", "Tanlangan fonni barcha suhbatlar uchun standart qilib o'rnatasizmi?", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "O'rnatish", onPress: () => setWallpaper(DEFAULT_WALLPAPER_KEY, activeId).catch(() => {}) },
    ]);
  };

  const onPickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Ruxsat kerak", "Surat tanlash uchun galereyaga ruxsat bering");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;

    setPicking(true);
    try {
      const dir = `${FileSystem.documentDirectory}wallpapers`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
      const ext = result.assets[0].uri.split(".").pop() || "jpg";
      const destUri = `${dir}/${conversationId}-${Date.now()}.${ext}`;
      await FileSystem.copyAsync({ from: result.assets[0].uri, to: destUri });
      await setWallpaper(conversationId, makeCustomWallpaperId(destUri));
    } catch {
      Alert.alert("Xatolik", "Suratni fon qilib o'rnatib bo'lmadi");
    } finally {
      setPicking(false);
    }
  };

  const renderItem = ({ item }: { item: ChatWallpaper }) => {
    const selected = item.id === activeId;
    return (
      <TouchableOpacity style={styles.cell} onPress={() => setWallpaper(conversationId, item.id).catch(() => {})}>
        <View style={[styles.swatch, { backgroundColor: item.color }, selected && styles.swatchSelected]}>
          {selected && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.label}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.galleryButton} onPress={onPickFromGallery} disabled={picking}>
        {customUri ? (
          <Image source={{ uri: customUri }} style={styles.galleryThumb} />
        ) : (
          <View style={styles.galleryIconWrap}>
            <Text style={styles.galleryIcon}>🖼️</Text>
          </View>
        )}
        <Text style={styles.galleryButtonText}>
          {picking ? "Yuklanmoqda..." : customUri ? "Galereyadan surat o'rnatildi ✓" : "Galereyadan surat tanlash"}
        </Text>
      </TouchableOpacity>
      <FlatList
        data={CHAT_WALLPAPERS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={3}
        contentContainerStyle={styles.grid}
      />
      <TouchableOpacity style={styles.defaultButton} onPress={onSetForAll}>
        <Text style={styles.defaultButtonText}>Barcha suhbatlar uchun standart qilish</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  grid: { padding: 16 },
  cell: { flex: 1 / 3, alignItems: "center", marginBottom: 20 },
  swatch: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchSelected: { borderWidth: 3, borderColor: colors.primary },
  checkmark: { fontSize: 24, fontWeight: "700", color: colors.primary },
  label: { marginTop: 6, fontSize: 13, color: colors.text },
  galleryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 14,
    margin: 16,
    marginBottom: 0,
    gap: 12,
  },
  galleryThumb: { width: 48, height: 48, borderRadius: 8 },
  galleryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  galleryIcon: { fontSize: 22 },
  galleryButtonText: { fontSize: 15, color: colors.text, fontWeight: "600", flexShrink: 1 },
  defaultButton: { margin: 16, padding: 14, borderRadius: 10, backgroundColor: colors.background, alignItems: "center" },
  defaultButtonText: { fontSize: 15, fontWeight: "600", color: colors.primaryDark },
});
