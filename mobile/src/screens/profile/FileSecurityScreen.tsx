import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { fileSecurityApi, FileSecuritySettings } from "../../api/fileSecurity";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "FileSecurity">;

const FILE_SIZE_OPTIONS = [
  { label: "5 MB", value: 5 * 1024 * 1024 },
  { label: "10 MB", value: 10 * 1024 * 1024 },
  { label: "25 MB", value: 25 * 1024 * 1024 },
  { label: "50 MB", value: 50 * 1024 * 1024 },
];

export function FileSecurityScreen({}: Props) {
  const [settings, setSettings] = useState<FileSecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customBlockType, setCustomBlockType] = useState("");

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    fileSecurityApi.getSettings().then(setSettings).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const update = async (patch: Partial<FileSecuritySettings>) => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await fileSecurityApi.updateSettings(patch);
      setSettings(updated);
    } catch {
      Alert.alert("Xatolik", "Sozlamalarni saqlab bo'lmadi");
    }
    setSaving(false);
  };

  const addBlockedType = () => {
    if (!customBlockType.trim() || !settings) return;
    const ext = customBlockType.trim().toLowerCase().replace(".", "");
    if (settings.blockedFileTypes.includes(ext)) {
      Alert.alert("Xatolik", "Bu tur allaqachon bloklangan");
      return;
    }
    update({ blockedFileTypes: [...settings.blockedFileTypes, ext] });
    setCustomBlockType("");
  };

  const removeBlockedType = (ext: string) => {
    if (!settings) return;
    update({ blockedFileTypes: settings.blockedFileTypes.filter((t) => t !== ext) });
  };

  if (loading || (!settings && !error)) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  if (error || !settings) {
    return <ErrorView message="Sozlamalarni yuklab bo'lmadi" onRetry={loadData} />;
  }

  return (
    <ScrollView keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={styles.content}>
      {/* Xavfli fayllar */}
      <Text style={styles.sectionTitle}>Xavfli fayllar himoyasi</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Bajariladigan fayllarni bloklash</Text>
            <Text style={styles.settingHint}>APK, EXE, BAT, CMD va boshqa xavfli fayllar</Text>
          </View>
          <Switch
            value={settings.blockExecutableFiles}
            onValueChange={(v) => update({ blockExecutableFiles: v })}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Barcha fayllarni bloklash</Text>
            <Text style={styles.settingHint}>Hech qanday fayl qabul qilinmaydi</Text>
          </View>
          <Switch
            value={settings.blockAllFiles}
            onValueChange={(v) => update({ blockAllFiles: v })}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Notanishlardan media bloklash</Text>
            <Text style={styles.settingHint}>Kontaktlar ro'yxatida bo'lmaganlardan</Text>
          </View>
          <Switch
            value={settings.blockMediaFromStrangers}
            onValueChange={(v) => update({ blockMediaFromStrangers: v })}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </View>

      {/* Fayl hajmi */}
      <Text style={styles.sectionTitle}>Maksimal fayl hajmi</Text>
      <View style={styles.card}>
        <View style={styles.sizeOptions}>
          {FILE_SIZE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sizeBtn, settings.maxFileSize === opt.value && styles.sizeBtnActive]}
              onPress={() => update({ maxFileSize: opt.value })}
            >
              <Text style={[styles.sizeBtnText, settings.maxFileSize === opt.value && styles.sizeBtnTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bloklangan turlar */}
      <Text style={styles.sectionTitle}>Bloklangan fayl turlari</Text>
      <View style={styles.card}>
        <View style={styles.tagContainer}>
          {settings.blockedFileTypes.map((ext) => (
            <TouchableOpacity key={ext} style={styles.tag} onPress={() => removeBlockedType(ext)}>
              <Text style={styles.tagText}>.{ext}</Text>
              <Text style={styles.tagRemove}>✕</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.addTypeRow}>
          <TextInput
            style={styles.addTypeInput}
            placeholder="Yangi tur qo'shish (masalan: zip)"
            placeholderTextColor={colors.textSecondary}
            value={customBlockType}
            onChangeText={setCustomBlockType}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.addTypeBtn} onPress={addBlockedType}>
            <Text style={styles.addTypeBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Avtomatik yuklab olish */}
      <Text style={styles.sectionTitle}>Avtomatik yuklab olish</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Media avtomatik yuklash</Text>
            <Text style={styles.settingHint}>Rasmlar, video, ovozli xabarlar</Text>
          </View>
          <Switch
            value={settings.autoDownloadMedia}
            onValueChange={(v) => update({ autoDownloadMedia: v })}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Wi-Fi da yuklab olish</Text>
          </View>
          <Switch
            value={settings.autoDownloadOnWifi}
            onValueChange={(v) => update({ autoDownloadOnWifi: v })}
            trackColor={{ true: colors.primary }}
            disabled={!settings.autoDownloadMedia}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Mobil internetda yuklab olish</Text>
            <Text style={styles.settingHint}>Internet trafigini tejash uchun o'chiring</Text>
          </View>
          <Switch
            value={settings.autoDownloadOnMobile}
            onValueChange={(v) => update({ autoDownloadOnMobile: v })}
            trackColor={{ true: colors.primary }}
            disabled={!settings.autoDownloadMedia}
          />
        </View>
      </View>

      {/* Ogohlantirish */}
      <View style={styles.warningCard}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <Text style={styles.warningText}>
          Hech qachon notanish manbalardan APK, EXE yoki boshqa bajariladigan fayllarni o'rnatmang.
          Ular qurilmangizga zararli dastur o'rnatishi yoki shaxsiy ma'lumotlaringizni o'g'irlashi mumkin.
        </Text>
      </View>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginTop: 16, marginBottom: 8, marginLeft: 4, textTransform: "uppercase" },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 8 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  settingInfo: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 15, fontWeight: "500", color: colors.text },
  settingHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.background, marginVertical: 12 },
  sizeOptions: { flexDirection: "row", gap: 8 },
  sizeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.surface, alignItems: "center" },
  sizeBtnActive: { backgroundColor: colors.primary },
  sizeBtnText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  sizeBtnTextActive: { color: "#fff" },
  tagContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE5E5",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  tagText: { fontSize: 12, fontWeight: "600", color: "#CC0000" },
  tagRemove: { fontSize: 10, color: "#CC0000" },
  addTypeRow: { flexDirection: "row", gap: 8 },
  addTypeInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
  },
  addTypeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addTypeBtnText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  warningCard: {
    flexDirection: "row",
    backgroundColor: "#FFF9E6",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 10,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  warningIcon: { fontSize: 20 },
  warningText: { flex: 1, fontSize: 13, color: "#7A6200", lineHeight: 18 },
  savingOverlay: { position: "absolute", top: 20, right: 20 },
});
