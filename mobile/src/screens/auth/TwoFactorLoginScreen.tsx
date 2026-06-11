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
  const [password, setPassword] = useState("");
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ikki bosqichli tekshiruv</Text>
      <Text style={styles.subtitle}>Hisobingiz uchun qo'shimcha (bulutli) parolni kiriting</Text>
      {hint && <Text style={styles.hint}>Maslahat: {hint}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Qo'shimcha parol"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoFocus
      />

      <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Tasdiqlash</Text>}
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
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
