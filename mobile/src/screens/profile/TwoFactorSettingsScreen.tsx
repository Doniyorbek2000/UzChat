import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { usersApi } from "../../api/users";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "TwoFactorSettings">;

export function TwoFactorSettingsScreen({}: Props) {
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [currentPassword, setCurrentPassword] = useState("");
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hint, setHint] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const onEnable = async () => {
    if (twoFactorPassword.length < 8) {
      Alert.alert("Xatolik", "Qo'shimcha parol kamida 8 ta belgidan iborat bo'lishi kerak");
      return;
    }
    if (twoFactorPassword !== confirmPassword) {
      Alert.alert("Xatolik", "Qo'shimcha parollar mos kelmadi");
      return;
    }
    setSaving(true);
    try {
      await usersApi.setTwoFactor(currentPassword, twoFactorPassword, hint.trim() || undefined);
      await refreshProfile();
      setCurrentPassword("");
      setTwoFactorPassword("");
      setConfirmPassword("");
      setHint("");
      Alert.alert("Yoqildi", "Ikki bosqichli tekshiruv yoqildi");
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Yoqib bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  const onDisable = () => {
    Alert.alert("O'chirish", "Ikki bosqichli tekshiruvni o'chirishni xohlaysizmi?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: () => {
          Alert.prompt(
            "Joriy parolni kiriting",
            undefined,
            async (password) => {
              if (!password) return;
              setSaving(true);
              try {
                await usersApi.disableTwoFactor(password);
                await refreshProfile();
              } catch (err: any) {
                Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "O'chirib bo'lmadi");
              } finally {
                setSaving(false);
              }
            },
            "secure-text"
          );
        },
      },
    ]);
  };

  if (user.twoFactorEnabled) {
    return (
      <View style={styles.container}>
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>✅ Ikki bosqichli tekshiruv yoqilgan</Text>
          <Text style={styles.statusText}>
            Hisobingizga kirishda parolingizdan tashqari qo'shimcha parol ham so'raladi.
          </Text>
          {user.twoFactorHint && <Text style={styles.statusHint}>Maslahat: {user.twoFactorHint}</Text>}
        </View>

        <TouchableOpacity style={styles.dangerButton} onPress={onDisable} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.dangerButtonText}>O'chirish</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.description}>
        Yoqilganda, hisobingizga kirishda oddiy paroldan tashqari qo'shimcha (bulutli) parol ham so'raladi.
      </Text>

      <Text style={styles.label}>Joriy parol</Text>
      <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />

      <Text style={styles.label}>Qo'shimcha parol</Text>
      <TextInput style={styles.input} value={twoFactorPassword} onChangeText={setTwoFactorPassword} secureTextEntry />

      <Text style={styles.label}>Qo'shimcha parolni tasdiqlang</Text>
      <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

      <Text style={styles.label}>Maslahat (ixtiyoriy)</Text>
      <TextInput style={styles.input} value={hint} onChangeText={setHint} placeholder="Masalan, sevimli kitobim" placeholderTextColor={colors.textSecondary} />

      <TouchableOpacity style={styles.button} onPress={onEnable} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Yoqish</Text>}
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  description: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 16 },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  button: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  statusBox: { backgroundColor: colors.background, borderRadius: 8, padding: 16, marginBottom: 24 },
  statusTitle: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 8 },
  statusText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  statusHint: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginTop: 8, fontStyle: "italic" },
  dangerButton: { backgroundColor: colors.danger, borderRadius: 8, paddingVertical: 14, alignItems: "center" },
  dangerButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
