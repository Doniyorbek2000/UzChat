import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useWallpaperStore } from "../../store/wallpaperStore";
import { colors } from "../../theme/colors";
import { CHAT_WALLPAPERS, ChatWallpaper, DEFAULT_WALLPAPER_KEY } from "../../theme/wallpapers";

type Props = NativeStackScreenProps<RootStackParamList, "ChatWallpaper">;

export function ChatWallpaperScreen({ route }: Props) {
  const { conversationId } = route.params;
  const wallpapers = useWallpaperStore((s) => s.wallpapers);
  const setWallpaper = useWallpaperStore((s) => s.setWallpaper);
  const activeId = wallpapers[conversationId] ?? wallpapers[DEFAULT_WALLPAPER_KEY] ?? "standard";

  const onSetForAll = () => {
    Alert.alert("Barcha suhbatlar uchun", "Tanlangan fonni barcha suhbatlar uchun standart qilib o'rnatasizmi?", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "O'rnatish", onPress: () => setWallpaper(DEFAULT_WALLPAPER_KEY, activeId).catch(() => {}) },
    ]);
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
  defaultButton: { margin: 16, padding: 14, borderRadius: 10, backgroundColor: colors.background, alignItems: "center" },
  defaultButtonText: { fontSize: 15, fontWeight: "600", color: colors.primaryDark },
});
