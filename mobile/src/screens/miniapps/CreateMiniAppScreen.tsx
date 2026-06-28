import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView , KeyboardAvoidingView, Platform} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { miniAppsApi } from "../../api/miniapps";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "CreateMiniApp">;

const CATEGORIES = [
  { key: "games", label: "O'yinlar" },
  { key: "tools", label: "Asboblar" },
  { key: "finance", label: "Moliya" },
  { key: "social", label: "Ijtimoiy" },
  { key: "other", label: "Boshqa" },
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
      Alert.alert("Xatolik", "Nomni kiriting");
      return;
    }
    if (!url.trim() || !url.startsWith("http")) {
      Alert.alert("Xatolik", "To'g'ri URL kiriting (https://...)");
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
      Alert.alert("Muvaffaqiyat", "Mini-dastur yaratildi");
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Yaratib bo'lmadi");
    } finally {
      setCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>

    <ScrollView keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Nomi *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={64} placeholder="Mini-dastur nomi" placeholderTextColor={colors.textSecondary} />

      <Text style={styles.label}>URL *</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        placeholder="https://example.com/app"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        keyboardType="url"
      />

      <Text style={styles.label}>Tavsif</Text>
      <TextInput
        style={[styles.input, styles.descInput]}
        value={description}
        onChangeText={setDescription}
        maxLength={256}
        placeholder="Qisqacha tavsif"
        placeholderTextColor={colors.textSecondary}
        multiline
      />

      <Text style={styles.label}>Ikon URL</Text>
      <TextInput
        style={styles.input}
        value={iconUrl}
        onChangeText={setIconUrl}
        placeholder="https://example.com/icon.png"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        keyboardType="url"
      />

      <Text style={styles.label}>Kategoriya</Text>
      <View style={styles.categoryRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[styles.categoryChip, category === c.key && styles.categoryChipActive]}
            onPress={() => setCategory(c.key)}
          >
            <Text style={[styles.categoryText, category === c.key && styles.categoryTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.createBtn} onPress={onCreate} disabled={creating}>
        {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Yaratish</Text>}
      </TouchableOpacity>
    </ScrollView>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16 },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descInput: { minHeight: 80, textAlignVertical: "top" },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { fontSize: 13, color: colors.textSecondary },
  categoryTextActive: { color: "#fff", fontWeight: "600" },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 32,
  },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
