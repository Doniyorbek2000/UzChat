import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { marketplaceApi } from "../../api/marketplace";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "CreateStore">;

const CATEGORIES = [
  { key: "electronics", label: tr("Elektronika") },
  { key: "clothing", label: tr("Kiyimlar") },
  { key: "food", label: tr("Oziq-ovqat") },
  { key: "home", label: tr("Uy-joy") },
  { key: "beauty", label: tr("Go'zallik") },
  { key: "general", label: tr("Boshqa") },
];

export function CreateStoreScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert(tr("Xatolik"), tr("Do'kon nomini kiriting"));
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
      Alert.alert(tr("Xatolik"), tr("Do'kon yaratib bo'lmadi"));
    }
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>

    <ScrollView keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>{tr("Do'kon nomi *")}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={tr("Do'kon nomini kiriting")} placeholderTextColor={colors.textSecondary} maxLength={100} />

      <Text style={styles.label}>{tr("Tavsif")}</Text>
      <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder={tr("Do'kon haqida")} placeholderTextColor={colors.textSecondary} multiline maxLength={500} />

      <Text style={styles.label}>{tr("Kategoriya")}</Text>
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
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{tr("Do'kon yaratish")}</Text>}
      </TouchableOpacity>
    </ScrollView>

    </KeyboardAvoidingView>
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
