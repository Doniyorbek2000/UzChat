import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useColors } from "../../theme/colors";
import { useThemeStore } from "../../store/themeStore";

type ThemeMode = "light" | "dark" | "system";

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "Tizim sozlamasiga moslash" },
  { value: "light", label: "Yorug' rejim" },
  { value: "dark", label: "Qorong'u rejim" },
];

export function ThemeSettingsScreen() {
  const colors = useColors();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[styles.row, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
          onPress={() => setMode(option.value)}
        >
          <Text style={[styles.label, { color: colors.text }]}>{option.label}</Text>
          {mode === option.value && <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 16 },
});
