import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

interface Props {
  message?: string;
}

export function LoadingScreen({ message }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
