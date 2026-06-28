import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useColors } from "../../theme/colors";
import { useThemeStore } from "../../store/themeStore";

type ThemeMode = "light" | "dark" | "system";

const OPTIONS: { value: ThemeMode; label: string; icon: string; desc: string }[] = [
  { value: "system", label: "Tizim sozlamasi", icon: "📱", desc: "Qurilma sozlamasiga moslashadi" },
  { value: "light", label: "Yorug' rejim", icon: "☀️", desc: "Oq fon, qora matn" },
  { value: "dark", label: "Qorong'u rejim", icon: "🌙", desc: "Qora fon, oq matn" },
];

export function ThemeSettingsScreen() {
  const colors = useColors();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Ilovaning ko'rinishini tanlang. Tizim sozlamasi tanlansa, qurilmangiz mavzusiga avtomatik moslashadi.
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {OPTIONS.map((option, i) => {
          const selected = mode === option.value;
          return (
            <View key={option.value}>
              <TouchableOpacity
                style={styles.row}
                onPress={() => setMode(option.value)}
                activeOpacity={0.6}
              >
                <View style={[styles.iconBg, { backgroundColor: (selected ? colors.primary : colors.textSecondary) + "18" }]}>
                  <Text style={styles.iconEmoji}>{option.icon}</Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.label, { color: colors.text }]}>{option.label}</Text>
                  <Text style={[styles.desc, { color: colors.textSecondary }]}>{option.desc}</Text>
                </View>
                {selected && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
              {i < OPTIONS.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
  card: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  iconBg: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  iconEmoji: { fontSize: 18 },
  rowText: { flex: 1 },
  label: { fontSize: 16, fontWeight: "600" },
  desc: { fontSize: 12, marginTop: 2 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  checkMark: { color: "#fff", fontSize: 14, fontWeight: "700" },
  divider: { height: 1, marginLeft: 64 },
});
