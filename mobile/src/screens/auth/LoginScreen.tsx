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
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const login = useAuthStore((s) => s.login);
  const requestLoginOtp = useAuthStore((s) => s.requestLoginOtp);
  const verifyLoginOtp = useAuthStore((s) => s.verifyLoginOtp);

  const [phone, setPhone] = useState("+998");
  const [step, setStep] = useState<"phone" | "otp" | "password">("phone");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const codeRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      await requestLoginOtp(phone.trim());
      setStep("otp");
      startCountdown();
      setTimeout(() => codeRef.current?.focus(), 300);
    } catch (err: any) {
      Alert.alert(tr("Xatolik"), err?.response?.data?.error?.message ?? "SMS yuborishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    if (code.length !== 6) {
      Alert.alert(tr("Xatolik"), tr("6 xonali kodni kiriting"));
      return;
    }
    setLoading(true);
    try {
      await verifyLoginOtp(phone.trim(), code);
    } catch (err: any) {
      Alert.alert(tr("Xatolik"), err?.response?.data?.error?.message ?? "Kod noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  const onPasswordLogin = async () => {
    setLoading(true);
    try {
      const result = await login(phone.trim(), password);
      if (result.requires2FA) {
        navigation.navigate("TwoFactorLogin", { pendingToken: result.pendingToken, hint: result.hint });
      }
    } catch (err: any) {
      Alert.alert(tr("Xatolik"), err?.response?.data?.error?.message ?? "Kirishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const onResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      await requestLoginOtp(phone.trim());
      startCountdown();
      Alert.alert(tr("Yuborildi"), tr("Yangi tasdiqlash kodi yuborildi"));
    } catch (err: any) {
      Alert.alert(tr("Xatolik"), err?.response?.data?.error?.message ?? "Qaytadan yuborishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Text style={styles.title}>{tr("UzChat")}</Text>

        {step === "phone" && (
          <>
            <Text style={styles.subtitle}>{tr("Telefon raqamingizni kiriting")}</Text>
            <Text style={styles.hint}>{tr("SMS orqali tasdiqlash kodi yuboramiz")}</Text>

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
              accessibilityRole="button"
              accessibilityLabel={tr("Davom etish")}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{tr("Davom etish")}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep("password")} accessibilityRole="link">
              <Text style={styles.link}>{tr("Parol bilan kirish")}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("Register")} accessibilityRole="link">
              <Text style={styles.link}>{tr("Hisobingiz yo'qmi? Ro'yxatdan o'ting")}</Text>
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
              onChangeText={(text) => {
                setCode(text.replace(/\D/g, "").slice(0, 6));
              }}
              maxLength={6}
              returnKeyType="go"
              onSubmitEditing={onVerifyOtp}
              autoFocus
              accessibilityLabel={tr("Tasdiqlash kodi")}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={onVerifyOtp}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{tr("Tasdiqlash")}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={onResendOtp} disabled={countdown > 0}>
              <Text style={[styles.link, countdown > 0 && styles.linkDisabled]}>
                {countdown > 0 ? `Qaytadan yuborish (${countdown}s)` : "Qaytadan yuborish"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setStep("phone");
                setCode("");
              }}
            >
              <Text style={styles.link}>{tr("Raqamni o'zgartirish")}</Text>
            </TouchableOpacity>
          </>
        )}

        {step === "password" && (
          <>
            <Text style={styles.subtitle}>{tr("Parol bilan kirish")}</Text>

            <TextInput
              style={styles.input}
              placeholder="+998901234567"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad" autoComplete="tel"
              value={phone}
              onChangeText={setPhone}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              accessibilityLabel={tr("Telefon raqam")}
            />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder={tr("Parol")}
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
                autoComplete="password"
              value={password}
              onChangeText={setPassword}
              returnKeyType="go"
              onSubmitEditing={onPasswordLogin}
              accessibilityLabel={tr("Parol")}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={onPasswordLogin}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{tr("Kirish")}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} accessibilityRole="link">
              <Text style={styles.link}>{tr("Parolni unutdingizmi?")}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep("phone")} accessibilityRole="link">
              <Text style={styles.link}>{tr("SMS orqali kirish")}</Text>
            </TouchableOpacity>
          </>
        )}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.background },
  title: { fontSize: 36, fontWeight: "700", color: colors.primary, textAlign: "center", marginBottom: 8 },
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
});
