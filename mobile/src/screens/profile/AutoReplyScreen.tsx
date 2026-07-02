import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { autoReplyApi, AutoReplySettings } from "../../api/autoReply";
import { invalidateAutoReplyCache } from "../../utils/autoReply";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "AutoReplySettings">;

export function AutoReplyScreen(_props: Props) {
  const [settings, setSettings] = useState<AutoReplySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState("Hozirda band. Tez orada javob beraman.");
  const [isEnabled, setIsEnabled] = useState(false);
  const [onlyStrangers, setOnlyStrangers] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    autoReplyApi.get().then((ar) => {
      if (ar) {
        setSettings(ar);
        setMessage(ar.message);
        setIsEnabled(ar.isEnabled);
        setOnlyStrangers(ar.onlyForStrangers);
      }
    }).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await autoReplyApi.update({ isEnabled, message, onlyForStrangers: onlyStrangers });
      setSettings(updated);
      invalidateAutoReplyCache();
      Alert.alert("Saqlandi", "Avtomatik javob sozlamalari saqlandi");
    } catch {
      Alert.alert("Xatolik", "Sozlamalarni saqlab bo'lmadi");
    }
    setSaving(false);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  if (error) {
    return <ErrorView message="Sozlamalarni yuklab bo'lmadi" onRetry={loadData} />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
    <View style={styles.container}>
      <TouchableOpacity style={styles.toggleRow} onPress={() => setIsEnabled(!isEnabled)}>
        <Text style={styles.toggleLabel}>Avtomatik javob</Text>
        <View style={[styles.toggle, isEnabled && styles.toggleActive]}>
          <View style={[styles.toggleThumb, isEnabled && styles.toggleThumbActive]} />
        </View>
      </TouchableOpacity>

      <Text style={styles.label}>Javob matni</Text>
      <TextInput style={[styles.input, styles.multiline]} value={message} onChangeText={setMessage} placeholder="Avtomatik javob matni..." placeholderTextColor={colors.textSecondary} multiline maxLength={500} />

      <TouchableOpacity style={styles.toggleRow} onPress={() => setOnlyStrangers(!onlyStrangers)}>
        <View>
          <Text style={styles.toggleLabel}>Faqat notanishlar uchun</Text>
          <Text style={styles.toggleHint}>Kontaktlaringizga avtomatik javob yuborilmaydi</Text>
        </View>
        <View style={[styles.toggle, onlyStrangers && styles.toggleActive]}>
          <View style={[styles.toggleThumb, onlyStrangers && styles.toggleThumbActive]} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Saqlash</Text>}
      </TouchableOpacity>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, padding: 14, borderRadius: 10, marginBottom: 12 },
  toggleLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
  toggleHint: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: colors.background, justifyContent: "center", paddingHorizontal: 2 },
  toggleActive: { backgroundColor: colors.primary },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface },
  toggleThumbActive: { alignSelf: "flex-end" },
  label: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border },
  multiline: { minHeight: 100, textAlignVertical: "top", marginBottom: 12 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
