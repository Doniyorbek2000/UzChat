import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { feedApi } from "../../api/feed";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "CreatePost">;

const VISIBILITY_OPTIONS = [
  { key: "PUBLIC", label: "Hammaga" },
  { key: "CONTACTS", label: "Kontaktlar" },
  { key: "PRIVATE", label: "Faqat men" },
] as const;

export function CreatePostScreen({ navigation }: Props) {
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "CONTACTS" | "PRIVATE">("PUBLIC");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert("Xatolik", "Post matni kiriting");
      return;
    }
    setSubmitting(true);
    try {
      await feedApi.createPost({ content: content.trim(), visibility });
      navigation.goBack();
    } catch {
      Alert.alert("Xatolik", "Post yaratib bo'lmadi");
    }
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={styles.scroll}>
        <TextInput
          style={styles.textInput}
          placeholder="Nima haqida o'ylayapsiz?"
          placeholderTextColor={colors.textSecondary}
          value={content}
          onChangeText={setContent}
          multiline
          autoFocus
          maxLength={2000}
        />

        <Text style={styles.sectionTitle}>Ko'rinish</Text>
        <View style={styles.visibilityRow}>
          {VISIBILITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.visibilityChip, visibility === opt.key && styles.visibilityChipActive]}
              onPress={() => setVisibility(opt.key)}
            >
              <Text style={[styles.visibilityText, visibility === opt.key && styles.visibilityTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.charCount}>{content.length}/2000</Text>
      </ScrollView>

      <TouchableOpacity
        style={[styles.submitBtn, (!content.trim() || submitting) && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={!content.trim() || submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Joylash</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 16, flex: 1 },
  textInput: {
    fontSize: 16,
    color: colors.text,
    minHeight: 150,
    textAlignVertical: "top",
    lineHeight: 24,
  },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginTop: 16, marginBottom: 8 },
  visibilityRow: { flexDirection: "row", gap: 8 },
  visibilityChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  visibilityChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  visibilityText: { fontSize: 13, color: colors.textSecondary },
  visibilityTextActive: { color: "#fff", fontWeight: "600" },
  charCount: { fontSize: 12, color: colors.textSecondary, textAlign: "right", marginTop: 8 },
  submitBtn: {
    backgroundColor: colors.primary,
    margin: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
