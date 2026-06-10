import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyOtp">;

export function VerifyOtpScreen({ route }: Props) {
  const { phone, displayName, username, password } = route.params;
  const verifyRegisterOtp = useAuthStore((s) => s.verifyRegisterOtp);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (code.length !== 6) {
      Alert.alert("Xatolik", "6 xonali kodni kiriting");
      return;
    }
    setLoading(true);
    try {
      await verifyRegisterOtp({ phone, code, username, displayName, password });
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Kod noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tasdiqlash kodi</Text>
      <Text style={styles.subtitle}>{phone} raqamiga yuborilgan 6 xonali kodni kiriting</Text>

      <TextInput
        style={styles.input}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
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
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 8,
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
