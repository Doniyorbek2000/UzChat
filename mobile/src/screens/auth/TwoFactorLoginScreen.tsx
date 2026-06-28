import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "TwoFactorLogin">;

export function TwoFactorLoginScreen({ route }: Props) {
  const { pendingToken, hint } = route.params;
  const completeTwoFactorLogin = useAuthStore((s) => s.completeTwoFactorLogin);
  const requestTwoFactorRecovery = useAuthStore((s) => s.requestTwoFactorRecovery);
  const recoverTwoFactorLogin = useAuthStore((s) => s.recoverTwoFactorLogin);
  const [mode, setMode] = useState<"password" | "recover">("password");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!password) return;
    setLoading(true);
    try {
      await completeTwoFactorLogin(pendingToken, password);
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  const onRequestRecovery = async () => {
    setLoading(true);
    try {
      await requestTwoFactorRecovery(pendingToken);
      setMode("recover");
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Kod yuborib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyRecovery = async () => {
    if (code.length !== 6) {
      Alert.alert("Xatolik", "6 xonali kodni kiriting");
      return;
    }
    setLoading(true);
    try {
      await recoverTwoFactorLogin(pendingToken, code);
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Kod noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "recover") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Parolni tiklash</Text>
        <Text style={styles.subtitle}>Telefon raqamingizga yuborilgan 6 xonali kodni kiriting</Text>

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

        <TouchableOpacity style={styles.button} onPress={onVerifyRecovery} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Tasdiqlash</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => setMode("password")} disabled={loading}>
          <Text style={styles.linkButtonText}>Orqaga</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ikki bosqichli tekshiruv</Text>
      <Text style={styles.subtitle}>Hisobingiz uchun qo'shimcha (bulutli) parolni kiriting</Text>
      {hint && <Text style={styles.hint}>Maslahat: {hint}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Qo'shimcha parol"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoFocus
      />

      <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Tasdiqlash</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkButton} onPress={onRequestRecovery} disabled={loading}>
        <Text style={styles.linkButtonText}>Qo'shimcha parolni unutdingizmi?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 16 },
  hint: { fontSize: 13, color: colors.textSecondary, textAlign: "center", marginBottom: 16, fontStyle: "italic" },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeInput: { color: colors.text,
    fontSize: 24, textAlign: "center", letterSpacing: 8 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkButton: { alignItems: "center", paddingVertical: 14 },
  linkButtonText: { color: colors.primary, fontSize: 14 },
});
