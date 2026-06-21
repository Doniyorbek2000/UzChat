import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

interface Props {
  count: number;
  size?: number;
  color?: string;
}

export function Badge({ count, size = 20, color = colors.danger }: Props) {
  if (count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);
  const minWidth = label.length > 1 ? size + 8 : size;

  return (
    <View style={[styles.badge, { minWidth, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.text, { fontSize: size * 0.55 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  text: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },
});
