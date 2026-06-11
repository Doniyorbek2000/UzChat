import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

interface Props {
  title: string;
  subtitle?: string;
  error?: string;
  length?: number;
  resetKey?: number;
  onComplete: (pin: string) => void;
}

export function PinPad({ title, subtitle, error, length = 4, resetKey, onComplete }: Props) {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue("");
  }, [resetKey]);

  const onDigit = (digit: string) => {
    if (value.length >= length) return;
    const next = value + digit;
    setValue(next);
    if (next.length === length) onComplete(next);
  };

  const onBackspace = () => setValue((v) => v.slice(0, -1));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      <View style={styles.dots}>
        {Array.from({ length }).map((_, i) => (
          <View key={i} style={[styles.dot, i < value.length && styles.dotFilled]} />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.keypad}>
        {KEYS.map((key, i) =>
          key === "" ? (
            <View key={i} style={styles.key} />
          ) : (
            <TouchableOpacity
              key={i}
              style={styles.key}
              onPress={() => (key === "⌫" ? onBackspace() : onDigit(key))}
            >
              <Text style={styles.keyText}>{key}</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingTop: 48 },
  title: { fontSize: 18, fontWeight: "600", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  dots: { flexDirection: "row", gap: 16, marginTop: 32, marginBottom: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border },
  dotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  error: { fontSize: 13, color: colors.danger, marginBottom: 16 },
  keypad: { flexDirection: "row", flexWrap: "wrap", width: 264, justifyContent: "center" },
  key: { width: 88, height: 72, alignItems: "center", justifyContent: "center" },
  keyText: { fontSize: 28, color: colors.text, fontWeight: "500" },
});
