import { Image, View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

interface Props {
  uri?: string | null;
  name: string;
  size?: number;
}

export function Avatar({ uri, name, size = 48 }: Props) {
  const dimension = { width: size, height: size, borderRadius: size / 4 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, dimension]} />;
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <View style={[styles.placeholder, dimension]}>
      <Text style={[styles.initial, { fontSize: size / 2 }]}>{initial}</Text>
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
});
