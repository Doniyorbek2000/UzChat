import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { usersApi } from "../../api/users";
import { colors } from "../../theme/colors";
import { LastSeenPrivacy } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "PrivacySettings">;

const OPTIONS: { value: LastSeenPrivacy; label: string; description: string }[] = [
  { value: "EVERYONE", label: "Hamma", description: "Barcha foydalanuvchilar oxirgi marta qachon onlayn bo'lganingizni ko'ra oladi" },
  { value: "CONTACTS", label: "Faqat kontaktlar", description: "Faqat sizning kontaktlaringiz oxirgi marta onlayn bo'lganingizni ko'ra oladi" },
  { value: "NOBODY", label: "Hech kim", description: "Hech kim oxirgi marta onlayn bo'lganingizni ko'ra olmaydi" },
];

export function PrivacySettingsScreen({}: Props) {
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [saving, setSaving] = useState<LastSeenPrivacy | null>(null);

  if (!user) return null;

  const onSelect = async (value: LastSeenPrivacy) => {
    if (value === user.lastSeenPrivacy || saving) return;
    setSaving(value);
    try {
      await usersApi.updateMe({ lastSeenPrivacy: value });
      await refreshProfile();
    } catch {
      Alert.alert("Xatolik", "Sozlamani o'zgartirib bo'lmadi");
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Oxirgi marta onlayn bo'lgan vaqtni kim ko'ra oladi</Text>
      {OPTIONS.map((option) => {
        const selected = user.lastSeenPrivacy === option.value;
        return (
          <TouchableOpacity key={option.value} style={styles.row} onPress={() => onSelect(option.value)} disabled={!!saving}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{option.label}</Text>
              <Text style={styles.rowDescription}>{option.description}</Text>
            </View>
            {saving === option.value ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioDot} />}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  sectionTitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 16, color: colors.text, fontWeight: "600" },
  rowDescription: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
});
