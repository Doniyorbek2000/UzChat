import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator , KeyboardAvoidingView, Platform} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { themesApi } from "../../api/themes";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "CreateTheme">;

const COLOR_PRESETS = [
  { label: "Ko'k", primary: "#007AFF", bg: "#FFFFFF", surface: "#F2F2F7", text: "#000000" },
  { label: "Qora", primary: "#0A84FF", bg: "#000000", surface: "#1C1C1E", text: "#FFFFFF" },
  { label: "Yashil", primary: "#34C759", bg: "#F0FFF4", surface: "#E8F5E9", text: "#1B5E20" },
  { label: "Binafsha", primary: "#AF52DE", bg: "#FDF4FF", surface: "#F3E5F5", text: "#4A148C" },
];

export function CreateThemeScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#007AFF");
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [surfaceColor, setSurfaceColor] = useState("#F2F2F7");
  const [textColor, setTextColor] = useState("#000000");
  const [isDark, setIsDark] = useState(false);
  const [saving, setSaving] = useState(false);

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setPrimaryColor(preset.primary);
    setBackgroundColor(preset.bg);
    setSurfaceColor(preset.surface);
    setTextColor(preset.text);
    setIsDark(preset.bg === "#000000");
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Xatolik", "Mavzu nomini kiriting");
      return;
    }
    setSaving(true);
    try {
      await themesApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        primaryColor,
        backgroundColor,
        surfaceColor,
        textColor,
        isDark,
      });
      Alert.alert("Muvaffaqiyat", "Mavzu yaratildi!", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch {
      Alert.alert("Xatolik", "Mavzuni yaratib bo'lmadi");
    }
    setSaving(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>

    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Mavzu nomi</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Masalan: Mening mavzum" placeholderTextColor={colors.textSecondary} maxLength={50} />

      <Text style={styles.label}>Tavsif (ixtiyoriy)</Text>
      <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Qisqacha tavsif..." placeholderTextColor={colors.textSecondary} multiline maxLength={200} />

      <Text style={styles.label}>Tayyor ranglar</Text>
      <View style={styles.presets}>
        {COLOR_PRESETS.map((p) => (
          <TouchableOpacity key={p.label} style={[styles.presetBtn, { backgroundColor: p.primary }]} onPress={() => applyPreset(p)}>
            <Text style={styles.presetLabel}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Asosiy rang</Text>
      <TextInput style={styles.input} value={primaryColor} onChangeText={setPrimaryColor} placeholder="#007AFF" placeholderTextColor={colors.textSecondary} />

      <Text style={styles.label}>Fon rangi</Text>
      <TextInput style={styles.input} value={backgroundColor} onChangeText={setBackgroundColor} placeholder="#FFFFFF" placeholderTextColor={colors.textSecondary} />

      <Text style={styles.label}>Yuza rangi</Text>
      <TextInput style={styles.input} value={surfaceColor} onChangeText={setSurfaceColor} placeholder="#F2F2F7" placeholderTextColor={colors.textSecondary} />

      <Text style={styles.label}>Matn rangi</Text>
      <TextInput style={styles.input} value={textColor} onChangeText={setTextColor} placeholder="#000000" placeholderTextColor={colors.textSecondary} />

      <TouchableOpacity style={styles.toggleRow} onPress={() => setIsDark(!isDark)}>
        <Text style={styles.toggleLabel}>Qorong'u mavzu</Text>
        <View style={[styles.toggle, isDark && styles.toggleActive]}>
          <View style={[styles.toggleThumb, isDark && styles.toggleThumbActive]} />
        </View>
      </TouchableOpacity>

      <View style={styles.previewSection}>
        <Text style={styles.label}>Ko'rinish</Text>
        <View style={[styles.preview, { backgroundColor }]}>
          <View style={[styles.previewHeader, { backgroundColor: surfaceColor }]}>
            <View style={[styles.previewDot, { backgroundColor: primaryColor }]} />
            <View style={[styles.previewBar, { backgroundColor: textColor, opacity: 0.3 }]} />
          </View>
          <View style={styles.previewBody}>
            <View style={[styles.previewBubble, { backgroundColor: primaryColor }]} />
            <View style={[styles.previewBubbleRight, { backgroundColor: surfaceColor }]} />
          </View>
        </View>
      </View>

      <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Mavzuni saqlash</Text>}
      </TouchableOpacity>
    </ScrollView>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text },
  multiline: { minHeight: 60, textAlignVertical: "top" },
  presets: { flexDirection: "row", gap: 8 },
  presetBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  presetLabel: { color: "#fff", fontWeight: "600", fontSize: 12 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, padding: 14, borderRadius: 10, marginTop: 16 },
  toggleLabel: { fontSize: 15, color: colors.text },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: colors.background, justifyContent: "center", paddingHorizontal: 2 },
  toggleActive: { backgroundColor: colors.primary },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface },
  toggleThumbActive: { alignSelf: "flex-end" },
  previewSection: { marginTop: 8 },
  preview: { height: 140, borderRadius: 12, padding: 10, overflow: "hidden" },
  previewHeader: { height: 28, borderRadius: 6, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, gap: 6, marginBottom: 10 },
  previewDot: { width: 12, height: 12, borderRadius: 6 },
  previewBar: { flex: 1, height: 5, borderRadius: 3 },
  previewBody: { flex: 1, gap: 6, justifyContent: "center" },
  previewBubble: { width: "60%", height: 18, borderRadius: 9, opacity: 0.8 },
  previewBubbleRight: { width: "50%", height: 18, borderRadius: 9, alignSelf: "flex-end", opacity: 0.5 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
