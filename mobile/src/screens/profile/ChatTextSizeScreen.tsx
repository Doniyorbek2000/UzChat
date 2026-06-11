import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { FONT_SCALES, FontScale, useChatSettingsStore } from "../../store/chatSettingsStore";
import { colors } from "../../theme/colors";

const LABELS: Record<FontScale, string> = {
  0.85: "Kichik",
  1: "O'rta",
  1.15: "Katta",
  1.3: "Juda katta",
};

export function ChatTextSizeScreen() {
  const fontScale = useChatSettingsStore((s) => s.fontScale);
  const setFontScale = useChatSettingsStore((s) => s.setFontScale);

  return (
    <View style={styles.container}>
      <View style={styles.preview}>
        <View style={[styles.bubble, styles.bubbleOther]}>
          <Text style={[styles.previewText, { fontSize: 16 * fontScale }]}>Salom! Qalaysiz?</Text>
        </View>
        <View style={[styles.bubble, styles.bubbleSelf]}>
          <Text style={[styles.previewText, { fontSize: 16 * fontScale }]}>Yaxshi, rahmat 🙂</Text>
        </View>
      </View>
      {FONT_SCALES.map((scale) => {
        const selected = scale === fontScale;
        return (
          <TouchableOpacity key={scale} style={styles.row} onPress={() => setFontScale(scale)}>
            <Text style={[styles.rowLabel, { fontSize: 16 * scale }]}>{LABELS[scale]}</Text>
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  preview: { backgroundColor: colors.background, borderRadius: 12, padding: 16, marginBottom: 24, gap: 8 },
  bubble: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, maxWidth: "80%" },
  bubbleOther: { backgroundColor: colors.bubbleOther, alignSelf: "flex-start" },
  bubbleSelf: { backgroundColor: colors.bubbleSelf, alignSelf: "flex-end" },
  previewText: { color: colors.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  rowLabel: { color: colors.text },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
});
