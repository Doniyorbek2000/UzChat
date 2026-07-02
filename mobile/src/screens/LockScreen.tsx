import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { PinPad } from "../components/PinPad";
import { useAppLockStore } from "../store/appLockStore";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";
import { tr } from "../i18n";

export function LockScreen() {
  const unlock = useAppLockStore((s) => s.unlock);
  const reset = useAppLockStore((s) => s.reset);
  const getRemainingLockSeconds = useAppLockStore((s) => s.getRemainingLockSeconds);
  const failedAttempts = useAppLockStore((s) => s.failedAttempts);
  const logout = useAuthStore((s) => s.logout);
  const [error, setError] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const remaining = getRemainingLockSeconds();
    if (remaining <= 0) return;
    setCountdown(remaining);
    const timer = setInterval(() => {
      const r = getRemainingLockSeconds();
      setCountdown(r);
      if (r <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [failedAttempts]);

  const onComplete = async (pin: string) => {
    const remaining = getRemainingLockSeconds();
    if (remaining > 0) {
      setError(`${remaining} soniya kutib turing`);
      setResetKey((k) => k + 1);
      return;
    }
    const ok = await unlock(pin);
    if (!ok) {
      const newRemaining = getRemainingLockSeconds();
      setError(newRemaining > 0 ? `Noto'g'ri PIN. ${newRemaining}s kutib turing` : "Noto'g'ri PIN kod");
      setResetKey((k) => k + 1);
    } else {
      setError("");
    }
  };

  const onLogout = () => {
    Alert.alert(tr("Hisobdan chiqish"), tr("PIN kodni unutdingizmi? Hisobdan chiqishingiz mumkin."), [
      { text: tr("Bekor qilish"), style: "cancel" },
      {
        text: tr("Chiqish"),
        style: "destructive",
        onPress: async () => {
          await reset();
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <PinPad
        title={tr("Ilova qulflangan")}
        subtitle={countdown > 0 ? `${countdown} soniya kutib turing` : "Davom etish uchun PIN kodni kiriting"}
        error={error}
        resetKey={resetKey}
        onComplete={onComplete}
      />
      <TouchableOpacity style={styles.logout} onPress={onLogout}>
        <Text style={styles.logoutText}>{tr("Hisobdan chiqish")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, backgroundColor: colors.surface, alignItems: "center" },
  logout: { position: "absolute", bottom: 48 },
  logoutText: { fontSize: 15, color: colors.danger, fontWeight: "500" },
});
