import { Image, View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

interface Props {
  uri?: string | null;
  name: string;
  size?: number;
  online?: boolean;
}

export function Avatar({ uri, name, size = 48, online }: Props) {
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

  if (uri) {
    return (
      <View>
        <Image source={{ uri }} style={[styles.image, dimension]} />
        {badge}
      </View>
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <View>
      <View style={[styles.placeholder, dimension]}>
        <Text style={[styles.initial, { fontSize: size / 2 }]}>{initial}</Text>
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
