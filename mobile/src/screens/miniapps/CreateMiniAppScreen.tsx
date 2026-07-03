import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { miniAppsApi } from "../../api/miniapps";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "CreateMiniApp">;

const CATEGORIES = [
  { key: "transport", label: tr("Transport"), icon: "🚕" },
  { key: "food", label: tr("Ovqat"), icon: "🍽️" },
  { key: "health", label: tr("Sog'liq"), icon: "🏥" },
  { key: "shopping", label: tr("Xaridlar"), icon: "🛍️" },
  { key: "finance", label: tr("Moliya"), icon: "💰" },
  { key: "games", label: tr("O'yinlar"), icon: "🎮" },
  { key: "news", label: tr("Yangiliklar"), icon: "📰" },
  { key: "entertainment", label: tr("Ko'ngilochar"), icon: "🎬" },
  { key: "travel", label: tr("Sayohat"), icon: "✈️" },
  { key: "other", label: tr("Boshqa"), icon: "📦" },
];

export function CreateMiniAppScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [category, setCategory] = useState("other");
  const [creating, setCreating] = useState(false);

  const onCreate = async () => {
    if (!name.trim()) {
      Alert.alert(tr("Xatolik"), tr("Nomni kiriting"));
      return;
    }
    if (!url.trim() || !url.startsWith("http")) {
      Alert.alert(tr("Xatolik"), tr("To'g'ri URL kiriting (https://...)"));
      return;
    }
    setCreating(true);
    try {
      await miniAppsApi.create({
        name: name.trim(),
        url: url.trim(),
        description: description.trim() || undefined,
        iconUrl: iconUrl.trim() || undefined,
        category,
      });
      Alert.alert(tr("Muvaffaqiyat"), tr("Mini-dastur yaratildi"));
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(tr("Xatolik"), err?.response?.data?.error?.message ?? "Yaratib bo'lmadi");
    } finally {
      setCreating(false);
    }
  };

  const previewLetter = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.previewCard}>
          <View style={styles.previewIcon}>
            <Text style={styles.previewIconText}>{previewLetter}</Text>
          </View>
          <Text style={styles.previewName}>{name.trim() || "Mini-dastur nomi"}</Text>
          <Text style={styles.previewHint}>{tr("Oldindan ko'rinish")}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{tr("Asosiy ma'lumotlar")}</Text>

          <Text style={styles.label}>{tr("Nomi *")}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={64} placeholder={tr("Mini-dastur nomi")} placeholderTextColor={colors.textSecondary} />

          <Text style={styles.label}>{tr("URL *")}</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder={tr("https://example.com/app")}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            keyboardType="url"
          />

          <Text style={styles.label}>{tr("Tavsif")}</Text>
          <TextInput
            style={[styles.input, styles.descInput]}
            value={description}
            onChangeText={setDescription}
            maxLength={256}
            placeholder={tr("Qisqacha tavsif")}
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          <Text style={styles.charCounter}>{description.length}/256</Text>

          <Text style={styles.label}>{tr("Ikon URL")}</Text>
          <TextInput
            style={styles.input}
            value={iconUrl}
            onChangeText={setIconUrl}
            placeholder={tr("https://example.com/icon.png")}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{tr("Kategoriya")}</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text style={styles.categoryIcon}>{c.icon}</Text>
                  <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, (!name.trim() || !url.trim() || creating) && styles.createBtnDisabled]}
          onPress={onCreate}
          disabled={!name.trim() || !url.trim() || creating}
          activeOpacity={0.7}
        >
          {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>{tr("Yaratish")}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  previewCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  previewIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  previewIconText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  previewName: { fontSize: 16, fontWeight: "600", color: colors.text },
  previewHint: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  formTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 8 },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: 14, marginBottom: 6, fontWeight: "500" },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descInput: { minHeight: 80, textAlignVertical: "top" },
  charCounter: { fontSize: 12, color: colors.textSecondary, textAlign: "right", marginTop: 4 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryIcon: { fontSize: 14 },
  categoryText: { fontSize: 13, color: colors.text, fontWeight: "500" },
  categoryTextActive: { color: "#fff", fontWeight: "600" },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
