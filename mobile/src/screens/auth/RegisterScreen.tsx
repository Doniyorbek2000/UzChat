import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { authApi } from "../../api/auth";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;

export function RegisterScreen({ navigation }: Props) {
  const requestRegisterOtp = useAuthStore((s) => s.requestRegisterOtp);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const trimmed = username.trim();
    if (!USERNAME_PATTERN.test(trimmed)) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    checkTimer.current = setTimeout(() => {
      authApi
        .checkUsername(trimmed)
        .then((available) => setUsernameStatus(available ? "available" : "taken"))
        .catch(() => setUsernameStatus("idle"));
    }, 500);
    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, [username]);

  const onSubmit = async () => {
    if (!displayName || !username || !phone || !password) {
      Alert.alert("Xatolik", "Barcha maydonlarni to'ldiring");
      return;
    }
    if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      Alert.alert("Xatolik", "Parol kamida 10 ta belgi, 1 katta harf, 1 kichik harf va 1 raqam bo'lishi kerak");
      return;
    }
    if (usernameStatus === "taken") {
      Alert.alert("Xatolik", "Bu username band");
      return;
    }
    setLoading(true);
    try {
      await requestRegisterOtp(phone.trim());
      navigation.navigate("VerifyOtp", {
        phone: phone.trim(),
        displayName: displayName.trim(),
        username: username.trim(),
        password,
      });
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Ro'yxatdan o'tishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Ro'yxatdan o'tish</Text>

          <TextInput
            style={styles.input}
            placeholder="Ismingiz"
            value={displayName}
            onChangeText={setDisplayName}
            returnKeyType="next"
            onSubmitEditing={() => usernameRef.current?.focus()}
          />
          <View style={styles.usernameWrapper}>
            <TextInput
              ref={usernameRef}
              style={[styles.input, styles.usernameInput]}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
            />
            {usernameStatus === "checking" && <ActivityIndicator style={styles.usernameStatusIcon} size="small" color={colors.textSecondary} />}
            {usernameStatus === "available" && <Text style={[styles.usernameStatusIcon, styles.usernameAvailable]}>✓</Text>}
            {usernameStatus === "taken" && <Text style={[styles.usernameStatusIcon, styles.usernameTaken]}>✕</Text>}
          </View>
          {usernameStatus === "taken" && <Text style={styles.usernameHint}>Bu username band</Text>}
          {usernameStatus === "available" && <Text style={[styles.usernameHint, styles.usernameAvailable]}>Username bo'sh</Text>}
          <TextInput
            ref={phoneRef}
            style={styles.input}
            placeholder="+998901234567"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <TextInput
            ref={passwordRef}
            style={styles.input}
            placeholder="Parol (kamida 10 ta belgi, AaBb1)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />

          <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Davom etish</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.link}>Hisobingiz bormi? Kirish</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 32 },
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
  usernameWrapper: { position: "relative" },
  usernameInput: { paddingRight: 40 },
  usernameStatusIcon: { position: "absolute", right: 14, top: 14, fontSize: 18, fontWeight: "700" },
  usernameAvailable: { color: colors.online },
  usernameTaken: { color: colors.danger },
  usernameHint: { fontSize: 12, color: colors.danger, marginTop: -8, marginBottom: 8, marginLeft: 4 },
});
