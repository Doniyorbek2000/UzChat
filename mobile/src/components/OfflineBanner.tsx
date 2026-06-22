import { useEffect, useState } from "react";
import { View, Text, StyleSheet, AppState } from "react-native";
import { API_URL } from "../config/env";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        await fetch(`${API_URL}/health`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (mounted) setOffline(false);
      } catch {
        if (mounted) setOffline(true);
      }
    }

    check();
    const interval = setInterval(check, 15000);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  if (!offline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Internet aloqasi yo'q</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#FF3B30",
    paddingVertical: 6,
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
