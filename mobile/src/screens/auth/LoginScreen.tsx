import { useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const login = useAuthStore((s) => s.login);
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const onSubmit = async () => {
    setLoading(true);
    try {
      const result = await login(phone.trim(), password);
      if (result.requires2FA) {
        navigation.navigate("TwoFactorLogin", { pendingToken: result.pendingToken, hint: result.hint });
      }
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Kirishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Text style={styles.title}>UzChat</Text>
        <Text style={styles.subtitle}>Hisobingizga kiring</Text>

        <TextInput
          style={styles.input}
          placeholder="+998901234567"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          autoCapitalize="none"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          accessibilityLabel="Telefon raqam"
          accessibilityHint="Telefon raqamingizni kiriting"
        />
        <TextInput
          ref={passwordRef}
          style={styles.input}
          placeholder="Parol"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="go"
          onSubmitEditing={onSubmit}
          accessibilityLabel="Parol"
          accessibilityHint="Parolingizni kiriting"
        />

        <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading} accessibilityRole="button" accessibilityLabel="Kirish">
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Kirish</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} accessibilityRole="link">
          <Text style={styles.link}>Parolni unutdingizmi?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Register")} accessibilityRole="link">
          <Text style={styles.link}>Hisobingiz yo'qmi? Ro'yxatdan o'ting</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.background },
  title: { fontSize: 36, fontWeight: "700", color: colors.primary, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: "center", marginBottom: 32 },
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
  link: { color: colors.primary, textAlign: "center", marginTop: 20, fontSize: 14 },
});
