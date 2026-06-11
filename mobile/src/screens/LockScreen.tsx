import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { PinPad } from "../components/PinPad";
import { useAppLockStore } from "../store/appLockStore";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";

export function LockScreen() {
  const unlock = useAppLockStore((s) => s.unlock);
  const reset = useAppLockStore((s) => s.reset);
  const logout = useAuthStore((s) => s.logout);
  const [error, setError] = useState("");
  const [resetKey, setResetKey] = useState(0);

  const onComplete = async (pin: string) => {
    const ok = await unlock(pin);
    if (!ok) {
      setError("Noto'g'ri PIN kod");
      setResetKey((k) => k + 1);
    } else {
      setError("");
    }
  };

  const onLogout = () => {
    Alert.alert("Hisobdan chiqish", "PIN kodni unutdingizmi? Hisobdan chiqishingiz mumkin.", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "Chiqish",
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
        title="Ilova qulflangan"
        subtitle="Davom etish uchun PIN kodni kiriting"
        error={error}
        resetKey={resetKey}
        onComplete={onComplete}
      />
      <TouchableOpacity style={styles.logout} onPress={onLogout}>
        <Text style={styles.logoutText}>Hisobdan chiqish</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, backgroundColor: colors.surface, alignItems: "center" },
  logout: { position: "absolute", bottom: 48 },
  logoutText: { fontSize: 15, color: colors.danger, fontWeight: "500" },
});
