import { Image, View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

interface Props {
  uri?: string | null;
  name: string;
  size?: number;
  online?: boolean;
  // Renders this emoji instead of an initial letter (e.g. 🔖 for "Saved Messages").
  icon?: string;
}

export function Avatar({ uri, name, size = 48, online, icon }: Props) {
  const dimension = { width: size, height: size, borderRadius: size / 4 };
  const badgeSize = Math.max(10, size / 4);
  const badge = online ? (
    <View
      style={[
        styles.badge,
        { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, borderWidth: Math.max(2, badgeSize / 5) },
      ]}
    />
  ) : null;

  const a11yLabel = online ? `${name}, onlayn` : name;

  if (uri) {
    return (
      <View accessibilityLabel={a11yLabel} accessibilityRole="image">
        <Image source={{ uri }} style={[styles.image, dimension]} />
        {badge}
      </View>
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <View accessibilityLabel={a11yLabel} accessibilityRole="image">
      <View style={[styles.placeholder, dimension]}>
        {icon ? (
          <Text style={{ fontSize: size / 2 }}>{icon}</Text>
        ) : (
          <Text style={[styles.initial, { fontSize: size / 2 }]}>{initial}</Text>
        )}
      </View>
      {badge}
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.border },
  placeholder: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { color: "#fff", fontWeight: "700" },
  badge: {
    position: "absolute",
    right: -1,
    bottom: -1,
    backgroundColor: colors.online,
    borderColor: colors.surface,
  },
});
