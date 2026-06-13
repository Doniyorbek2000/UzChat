import { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Switch } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import { colors } from "../../theme/colors";
import { formatFileSize } from "../../utils/mediaFile";
import { useChatSettingsStore } from "../../store/chatSettingsStore";

interface CacheBreakdown {
  media: number;
  exports: number;
  temp: number;
}

const EMPTY_BREAKDOWN: CacheBreakdown = { media: 0, exports: 0, temp: 0 };

async function scanCache(): Promise<CacheBreakdown> {
  const dir = FileSystem.cacheDirectory;
  if (!dir) return EMPTY_BREAKDOWN;

  const names = await FileSystem.readDirectoryAsync(dir).catch(() => [] as string[]);
  const breakdown: CacheBreakdown = { ...EMPTY_BREAKDOWN };

  for (const name of names) {
    const info = await FileSystem.getInfoAsync(`${dir}${name}`).catch(() => null);
    if (!info?.exists || info.isDirectory) continue;

    if (name.startsWith("uzchat-export-")) breakdown.exports += info.size;
    else if (name.startsWith("uzchat-")) breakdown.media += info.size;
    else if (name.startsWith("upload-")) breakdown.temp += info.size;
  }

  return breakdown;
}

async function clearCache(): Promise<void> {
  const dir = FileSystem.cacheDirectory;
  if (!dir) return;

  const names = await FileSystem.readDirectoryAsync(dir).catch(() => [] as string[]);
  for (const name of names) {
    if (name.startsWith("uzchat-") || name.startsWith("upload-")) {
      await FileSystem.deleteAsync(`${dir}${name}`, { idempotent: true });
    }
  }
}

export function StorageUsageScreen() {
  const [breakdown, setBreakdown] = useState<CacheBreakdown | null>(null);
  const [clearing, setClearing] = useState(false);
  const autoDownloadMedia = useChatSettingsStore((s) => s.autoDownloadMedia);
  const setAutoDownloadMedia = useChatSettingsStore((s) => s.setAutoDownloadMedia);

  const refresh = useCallback(() => {
    scanCache()
      .then(setBreakdown)
      .catch(() => setBreakdown(EMPTY_BREAKDOWN));
  }, []);

  useFocusEffect(refresh);

  const total = breakdown ? breakdown.media + breakdown.exports + breakdown.temp : 0;

  const onClear = () => {
    Alert.alert("Keshni tozalash", "Yuklab olingan media va vaqtinchalik fayllar o'chiriladi. Davom etilsinmi?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "Tozalash",
        style: "destructive",
        onPress: async () => {
          setClearing(true);
          try {
            await clearCache();
            refresh();
          } finally {
            setClearing(false);
          }
        },
      },
    ]);
  };

  if (!breakdown) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.row, styles.toggleRow]}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>📥 Mediani avtomatik yuklab olish</Text>
          <Text style={styles.rowDescription}>
            O'chirilganda, rasm va ovozli xabarlar faqat ustiga bosilganda yuklab olinadi
          </Text>
        </View>
        <Switch value={autoDownloadMedia} onValueChange={setAutoDownloadMedia} trackColor={{ true: colors.primary }} />
      </View>

      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>Jami kesh hajmi</Text>
        <Text style={styles.totalValue}>{formatFileSize(total)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>🖼 Media fayllar</Text>
        <Text style={styles.rowValue}>{formatFileSize(breakdown.media)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>📤 Eksport qilingan suhbatlar</Text>
        <Text style={styles.rowValue}>{formatFileSize(breakdown.exports)}</Text>
      </View>
      <View style={[styles.row, styles.rowLast]}>
        <Text style={styles.rowLabel}>🗑 Vaqtinchalik fayllar</Text>
        <Text style={styles.rowValue}>{formatFileSize(breakdown.temp)}</Text>
      </View>

      <Text style={styles.hint}>
        Yuklab olingan rasm, video, audio va boshqa fayllar qurilmangizda saqlanadi. Keshni tozalash xabarlarni
        o'chirmaydi - kerak bo'lganda media qayta yuklab olinadi.
      </Text>

      <TouchableOpacity
        style={[styles.clearButton, total === 0 && styles.clearButtonDisabled]}
        onPress={onClear}
        disabled={clearing || total === 0}
      >
        {clearing ? <ActivityIndicator color="#fff" /> : <Text style={styles.clearButtonText}>Keshni tozalash</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  totalBox: { backgroundColor: colors.background, borderRadius: 8, padding: 16, marginBottom: 16, alignItems: "center" },
  totalLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  totalValue: { fontSize: 28, fontWeight: "700", color: colors.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 1,
  },
  rowLast: { marginBottom: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  rowLabel: { fontSize: 15, color: colors.text },
  rowValue: { fontSize: 15, color: colors.textSecondary },
  toggleRow: { marginBottom: 16 },
  rowText: { flex: 1, marginRight: 12 },
  rowDescription: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },
  hint: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginTop: 16 },
  clearButton: { backgroundColor: colors.danger, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  clearButtonDisabled: { opacity: 0.5 },
  clearButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
