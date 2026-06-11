import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { usersApi } from "../../api/users";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ChangePassword">;

export function ChangePasswordScreen({ navigation }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const onSubmit = async () => {
    if (newPassword.length < 8) {
      Alert.alert("Xatolik", "Yangi parol kamida 8 ta belgidan iborat bo'lishi kerak");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Xatolik", "Yangi parollar mos kelmadi");
      return;
    }
    setSaving(true);
    try {
      await usersApi.changePassword(currentPassword, newPassword);
      Alert.alert("Saqlandi", "Parol muvaffaqiyatli o'zgartirildi", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Parolni o'zgartirib bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Joriy parol</Text>
      <TextInput
        style={styles.input}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        autoFocus
      />

      <Text style={styles.label}>Yangi parol</Text>
      <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry />

      <Text style={styles.label}>Yangi parolni tasdiqlang</Text>
      <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

      <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Saqlash</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.surface },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  button: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
