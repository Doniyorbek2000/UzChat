import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { authApi } from "../../api/auth";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [step, setStep] = useState<"phone" | "reset">("phone");
  const [phone, setPhone] = useState("+998");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onRequestCode = async () => {
    setLoading(true);
    try {
      await authApi.requestPasswordReset(phone.trim());
      setStep("reset");
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Kod yuborib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const onReset = async () => {
    if (code.length !== 6) {
      Alert.alert("Xatolik", "6 xonali kodni kiriting");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Xatolik", "Yangi parol kamida 8 ta belgidan iborat bo'lishi kerak");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Xatolik", "Yangi parollar mos kelmadi");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(phone.trim(), code, newPassword);
      Alert.alert("Tiklandi", "Parolingiz muvaffaqiyatli tiklandi. Endi yangi parol bilan kiring.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Parolni tiklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  if (step === "reset") {
    const canReset = code.length === 6 && newPassword.length >= 8 && confirmPassword.length > 0 && !loading;
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Parolni tiklash</Text>
          <Text style={styles.subtitle}>{phone} raqamiga yuborilgan 6 xonali kodni va yangi parolni kiriting</Text>

          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            autoFocus
          />
          <TextInput
            style={styles.input}
            placeholder="Yangi parol"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Yangi parolni tasdiqlang"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity style={[styles.button, !canReset && styles.buttonDisabled]} onPress={onReset} disabled={!canReset}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Parolni tiklash</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={() => setStep("phone")} disabled={loading}>
            <Text style={styles.linkButtonText}>Orqaga</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const canRequest = phone.trim().length >= 9 && !loading;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Parolni tiklash</Text>
        <Text style={styles.subtitle}>Telefon raqamingizni kiriting, sizga tasdiqlash kodi yuboriladi</Text>

        <TextInput
          style={styles.input}
          placeholder="+998901234567"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          autoCapitalize="none"
          autoFocus
        />

        <TouchableOpacity style={[styles.button, !canRequest && styles.buttonDisabled]} onPress={onRequestCode} disabled={!canRequest}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Kod yuborish</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 16 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeInput: { fontSize: 24, textAlign: "center", letterSpacing: 8 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkButton: { alignItems: "center", paddingVertical: 14 },
  linkButtonText: { color: colors.primary, fontSize: 14 },
});
