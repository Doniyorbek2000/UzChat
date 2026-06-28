import { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from "react-native";
import { API_URL } from "../config/env";
import { colors } from "../theme/colors";
import appJson from "../../app.json";

const APP_VERSION = appJson.expo.version;
const STORE_URL = Platform.select({
  ios: "https://apps.apple.com/app/uzchat/id000000000",
  android: "https://play.google.com/store/apps/details?id=com.uzchat.app",
}) ?? "";

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

export function ForceUpdateModal() {
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (data.minAppVersion && compareVersions(APP_VERSION, data.minAppVersion) < 0) {
          setNeedsUpdate(true);
        }
      } catch {
        // ignore
      }
    }
    check();
  }, []);

  if (!needsUpdate) return null;

  return (
    <Modal visible animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Yangilanish kerak</Text>
          <Text style={styles.message}>
            UzChat'ning yangi versiyasi mavjud. Davom etish uchun ilovani yangilang.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => Linking.openURL(STORE_URL)}>
            <Text style={styles.buttonText}>Yangilash</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 12 },
  message: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
