import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import * as Clipboard from "expo-clipboard";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { usersApi } from "../../api/users";
import { useAuthStore } from "../../store/authStore";
import { getSecurityCode } from "../../crypto/e2ee";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "EncryptionKey">;

export function EncryptionKeyScreen({ route }: Props) {
  const { userId, displayName } = route.params;
  const user = useAuthStore((s) => s.user);
  const [securityCode, setSecurityCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi
      .getById(userId)
      .then((profile) => {
        if (user) setSecurityCode(getSecurityCode(user.publicKey, profile.publicKey));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, user]);

  const onCopy = () => {
    if (!securityCode) return;
    Clipboard.setStringAsync(securityCode).catch(() => {});
    Alert.alert("Nusxalandi", "Xavfsizlik kodi vaqtinchalik xotiraga nusxalandi");
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : !securityCode ? (
        <Text style={styles.emptyText}>Kodni hisoblab bo'lmadi</Text>
      ) : (
        <>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>Xavfsizlik kodi</Text>
          <Text style={styles.description}>
            Bu kod siz va {displayName} o'rtasidagi shifrlash kalitlaridan hisoblanadi. Agar bu kod ikkingizning
            qurilmalaringizda bir xil bo'lsa, suhbatingiz uchinchi tomon tomonidan kuzatilmayapti degani.
          </Text>
          <View style={styles.codeBox}>
            <Text style={styles.code}>{securityCode}</Text>
          </View>
          <TouchableOpacity style={styles.copyButton} onPress={onCopy}>
            <Text style={styles.copyButtonText}>Nusxalash</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            Kodni solishtirish uchun uni boshqa kanal orqali (masalan, telefon qo'ng'irog'i) {displayName}ga yuboring
            va o'zingizdagi kod bilan taqqoslang.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, alignItems: "center", padding: 24 },
  loader: { marginTop: 48 },
  emptyText: { color: colors.textSecondary, marginTop: 48 },
  icon: { fontSize: 48, marginTop: 24, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 12 },
  description: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  codeBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    width: "100%",
  },
  code: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    letterSpacing: 2,
    fontFamily: "monospace",
  },
  copyButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    backgroundColor: colors.primary,
  },
  copyButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  hint: { fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 24, lineHeight: 18 },
});
