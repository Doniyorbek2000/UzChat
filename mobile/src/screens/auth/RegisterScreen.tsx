import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { authApi } from "../../api/auth";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;

type Step = "phone" | "otp" | "profile";

export function RegisterScreen({ navigation }: Props) {
  const requestRegisterOtp = useAuthStore((s) => s.requestRegisterOtp);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+998");
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);
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

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const onRequestOtp = async () => {
    if (phone.trim().length < 10) {
      Alert.alert(tr("Xatolik"), tr("Telefon raqamni to'g'ri kiriting"));
      return;
    }
    setLoading(true);
    try {
      await requestRegisterOtp(phone.trim());
      setStep("otp");
      startCountdown();
      setTimeout(() => codeRef.current?.focus(), 300);
    } catch (err: any) {
      Alert.alert(tr("Xatolik"), err?.response?.data?.error?.message ?? "SMS yuborishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyCode = () => {
    if (code.length !== 6) {
      Alert.alert(tr("Xatolik"), tr("6 xonali kodni kiriting"));
      return;
    }
    setStep("profile");
  };

  const onResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      await requestRegisterOtp(phone.trim());
      startCountdown();
      Alert.alert(tr("Yuborildi"), tr("Yangi tasdiqlash kodi yuborildi"));
    } catch (err: any) {
      Alert.alert(tr("Xatolik"), err?.response?.data?.error?.message ?? "Qaytadan yuborishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const onComplete = async () => {
    if (!displayName.trim()) {
      Alert.alert(tr("Xatolik"), tr("Ismingizni kiriting"));
      return;
    }
    if (!USERNAME_PATTERN.test(username.trim())) {
      Alert.alert(tr("Xatolik"), tr("Username 3-24 ta belgi, faqat harf, raqam va _ bo'lishi kerak"));
      return;
    }
    if (usernameStatus === "taken") {
      Alert.alert(tr("Xatolik"), tr("Bu username band"));
      return;
    }
    if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      Alert.alert(tr("Xatolik"), tr("Parol kamida 10 ta belgi, 1 katta harf, 1 kichik harf, 1 raqam va 1 maxsus belgi (!@#$%) bo'lishi kerak"));
      return;
    }

    navigation.navigate("VerifyOtp", {
      phone: phone.trim(),
      displayName: displayName.trim(),
      username: username.trim(),
      password,
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{tr("Ro'yxatdan o'tish")}</Text>

          {step === "phone" && (
            <>
              <Text style={styles.subtitle}>{tr("Telefon raqamingizni kiriting")}</Text>
              <Text style={styles.hint}>{tr("Tasdiqlash kodi SMS orqali yuboriladi")}</Text>

              <TextInput
                style={styles.input}
                placeholder="+998901234567"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad" autoComplete="tel"
                value={phone}
                onChangeText={setPhone}
                autoCapitalize="none"
                returnKeyType="go"
                onSubmitEditing={onRequestOtp}
                accessibilityLabel={tr("Telefon raqam")}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={onRequestOtp}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{tr("Davom etish")}</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.link}>{tr("Hisobingiz bormi? Kirish")}</Text>
              </TouchableOpacity>
            </>
          )}

          {step === "otp" && (
            <>
              <Text style={styles.subtitle}>{tr("Tasdiqlash kodi")}</Text>
              <Text style={styles.hint}>{phone} raqamiga yuborilgan 6 xonali kodni kiriting</Text>

              <TextInput
                ref={codeRef}
                style={[styles.input, styles.codeInput]}
                placeholder="000000"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                value={code}
                onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                returnKeyType="go"
                onSubmitEditing={onVerifyCode}
                autoFocus
                accessibilityLabel={tr("Tasdiqlash kodi")}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={onVerifyCode}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{tr("Tasdiqlash")}</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={onResendOtp} disabled={countdown > 0}>
                <Text style={[styles.link, countdown > 0 && styles.linkDisabled]}>
                  {countdown > 0 ? `Qaytadan yuborish (${countdown}s)` : "Qaytadan yuborish"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setStep("phone"); setCode(""); }}>
                <Text style={styles.link}>{tr("Raqamni o'zgartirish")}</Text>
              </TouchableOpacity>
            </>
          )}

          {step === "profile" && (
            <>
              <Text style={styles.subtitle}>{tr("Profilingizni yarating")}</Text>

              <TextInput
                style={styles.input}
                placeholder={tr("Ismingiz")}
                placeholderTextColor={colors.textSecondary}
                value={displayName}
                onChangeText={setDisplayName}
                returnKeyType="next"
                onSubmitEditing={() => usernameRef.current?.focus()}
                accessibilityLabel={tr("Ism")}
              />

              <View style={styles.usernameWrapper}>
                <TextInput
                  ref={usernameRef}
                  style={[styles.input, styles.usernameInput]}
                  placeholder={tr("Username")}
                  placeholderTextColor={colors.textSecondary}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  accessibilityLabel={tr("Username")}
                />
                {usernameStatus === "checking" && (
                  <ActivityIndicator style={styles.usernameStatusIcon} size="small" color={colors.textSecondary} />
                )}
                {usernameStatus === "available" && (
                  <Text style={[styles.usernameStatusIcon, styles.usernameAvailable]}>✓</Text>
                )}
                {usernameStatus === "taken" && (
                  <Text style={[styles.usernameStatusIcon, styles.usernameTaken]}>✕</Text>
                )}
              </View>
              {usernameStatus === "taken" && <Text style={styles.usernameHint}>{tr("Bu username band")}</Text>}
              {usernameStatus === "available" && (
                <Text style={[styles.usernameHint, styles.usernameAvailable]}>{tr("Username bo'sh")}</Text>
              )}

              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder={tr("Parol (kamida 10 ta belgi, AaBb1!)")}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                returnKeyType="go"
                onSubmitEditing={onComplete}
                accessibilityLabel={tr("Parol")}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={onComplete}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{tr("Ro'yxatdan o'tish")}</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep("otp")}>
                <Text style={styles.link}>{tr("Orqaga")}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "700", color: colors.primary, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 18, fontWeight: "600", color: colors.text, textAlign: "center", marginBottom: 8 },
  hint: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 24 },
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
  codeInput: {
    textAlign: "center",
    color: colors.text,
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: "700",
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { color: colors.primary, textAlign: "center", marginTop: 20, fontSize: 14 },
  linkDisabled: { color: colors.textSecondary },
  usernameWrapper: { position: "relative" },
  usernameInput: { paddingRight: 40 },
  usernameStatusIcon: { position: "absolute", right: 14, top: 14, fontSize: 18, fontWeight: "700" },
  usernameAvailable: { color: colors.online },
  usernameTaken: { color: colors.danger },
  usernameHint: { fontSize: 12, color: colors.danger, marginTop: -8, marginBottom: 8, marginLeft: 4 },
});
