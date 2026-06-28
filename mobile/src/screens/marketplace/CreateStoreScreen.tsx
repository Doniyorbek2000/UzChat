import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { marketplaceApi } from "../../api/marketplace";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "CreateStore">;

const CATEGORIES = [
  { key: "electronics", label: "Elektronika" },
  { key: "clothing", label: "Kiyimlar" },
  { key: "food", label: "Oziq-ovqat" },
  { key: "home", label: "Uy-joy" },
  { key: "beauty", label: "Go'zallik" },
  { key: "general", label: "Boshqa" },
];

export function CreateStoreScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Xatolik", "Do'kon nomini kiriting");
      return;
    }
    setSubmitting(true);
    try {
      await marketplaceApi.createStore({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
      });
      navigation.goBack();
    } catch {
      Alert.alert("Xatolik", "Do'kon yaratib bo'lmadi");
    }
    setSubmitting(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Do'kon nomi *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Do'kon nomini kiriting" placeholderTextColor={colors.textSecondary} maxLength={100} />

      <Text style={styles.label}>Tavsif</Text>
      <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Do'kon haqida" placeholderTextColor={colors.textSecondary} multiline maxLength={500} />

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

      <TouchableOpacity
        style={[styles.submitBtn, (!name.trim() || submitting) && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={!name.trim() || submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Do'kon yaratish</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { fontSize: 13, color: colors.textSecondary },
  categoryTextActive: { color: "#fff", fontWeight: "600" },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 24 },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
