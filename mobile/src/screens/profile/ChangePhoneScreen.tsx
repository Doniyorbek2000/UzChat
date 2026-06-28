import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { authApi } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ChangePhone">;

export function ChangePhoneScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [newPhone, setNewPhone] = useState("+998");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const onRequestOtp = async () => {
    if (!/^\+[1-9]\d{7,14}$/.test(newPhone.trim())) {
      Alert.alert("Xatolik", "Telefon raqam +998901234567 formatida bo'lishi kerak");
      return;
    }
    setLoading(true);
    try {
      await authApi.requestPhoneChange(newPhone.trim());
      setStep("otp");
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Kod yuborib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    if (code.length !== 6) {
      Alert.alert("Xatolik", "6 xonali kodni kiriting");
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyPhoneChange(newPhone.trim(), code);
      await refreshProfile();
      Alert.alert("Saqlandi", "Telefon raqam muvaffaqiyatli o'zgartirildi", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Kod noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    const canVerify = code.length === 6 && !loading;
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Tasdiqlash kodi</Text>
          <Text style={styles.hint}>{newPhone.trim()} raqamiga yuborilgan 6 xonali kodni kiriting</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="000000"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            autoFocus
          />
          <TouchableOpacity style={[styles.button, !canVerify && styles.buttonDisabled]} onPress={onVerifyOtp} disabled={!canVerify}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Tasdiqlash</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep("phone")} disabled={loading}>
            <Text style={styles.secondaryButtonText}>Raqamni o'zgartirish</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const canRequest = /^\+[1-9]\d{7,14}$/.test(newPhone.trim()) && !loading;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Joriy raqam</Text>
        <Text style={styles.hint}>{user?.phone}</Text>

        <Text style={styles.label}>Yangi raqam</Text>
        <TextInput
          style={styles.input}
          placeholder="+998901234567"
          placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad"
          value={newPhone}
          onChangeText={setNewPhone}
          autoFocus
        />

        <TouchableOpacity style={[styles.button, !canRequest && styles.buttonDisabled]} onPress={onRequestOtp} disabled={!canRequest}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Kod yuborish</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16 },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 8, marginTop: 4 },
  hint: { fontSize: 15, color: colors.text, marginBottom: 16 },
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
  codeInput: { color: colors.text,
    fontSize: 24, textAlign: "center", letterSpacing: 8 },
  button: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryButton: { alignItems: "center", paddingVertical: 14 },
  secondaryButtonText: { color: colors.primary, fontSize: 14 },
});
