import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Switch } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { usersApi } from "../../api/users";
import { colors } from "../../theme/colors";
import { GroupAddPrivacy, LastSeenPrivacy, MessagePrivacy } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "PrivacySettings">;

const LAST_SEEN_OPTIONS: { value: LastSeenPrivacy; label: string; description: string }[] = [
  { value: "EVERYONE", label: "Hamma", description: "Barcha foydalanuvchilar oxirgi marta qachon onlayn bo'lganingizni ko'ra oladi" },
  { value: "CONTACTS", label: "Faqat kontaktlar", description: "Faqat sizning kontaktlaringiz oxirgi marta onlayn bo'lganingizni ko'ra oladi" },
  { value: "NOBODY", label: "Hech kim", description: "Hech kim oxirgi marta onlayn bo'lganingizni ko'ra olmaydi" },
];

const GROUP_ADD_OPTIONS: { value: GroupAddPrivacy; label: string; description: string }[] = [
  { value: "EVERYONE", label: "Hamma", description: "Istalgan foydalanuvchi sizni guruhga qo'sha oladi" },
  { value: "CONTACTS", label: "Faqat kontaktlar", description: "Faqat sizning kontaktlaringiz sizni guruhga qo'sha oladi" },
  { value: "NOBODY", label: "Hech kim", description: "Sizni hech kim guruhga qo'sha olmaydi, faqat taklif havolasi orqali qo'shilishingiz mumkin" },
];

const MESSAGE_PRIVACY_OPTIONS: { value: MessagePrivacy; label: string; description: string }[] = [
  { value: "EVERYONE", label: "Hamma", description: "Istalgan foydalanuvchi sizga yangi xabar yozishni boshlay oladi" },
  { value: "CONTACTS", label: "Faqat kontaktlar", description: "Faqat sizning kontaktlaringiz siz bilan yangi suhbat boshlay oladi" },
  { value: "NOBODY", label: "Hech kim", description: "Hech kim siz bilan yangi suhbat boshlay olmaydi. Mavjud suhbatlaringizga ta'sir qilmaydi" },
];

export function PrivacySettingsScreen({}: Props) {
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [saving, setSaving] = useState<string | null>(null);

  if (!user) return null;

  const onSelectLastSeen = async (value: LastSeenPrivacy) => {
    if (value === user.lastSeenPrivacy || saving) return;
    setSaving(`lastSeen:${value}`);
    try {
      await usersApi.updateMe({ lastSeenPrivacy: value });
      await refreshProfile();
    } catch {
      Alert.alert("Xatolik", "Sozlamani o'zgartirib bo'lmadi");
    } finally {
      setSaving(null);
    }
  };

  const onSelectGroupAdd = async (value: GroupAddPrivacy) => {
    if (value === user.groupAddPrivacy || saving) return;
    setSaving(`groupAdd:${value}`);
    try {
      await usersApi.updateMe({ groupAddPrivacy: value });
      await refreshProfile();
    } catch {
      Alert.alert("Xatolik", "Sozlamani o'zgartirib bo'lmadi");
    } finally {
      setSaving(null);
    }
  };

  const onSelectMessagePrivacy = async (value: MessagePrivacy) => {
    if (value === user.messagePrivacy || saving) return;
    setSaving(`messagePrivacy:${value}`);
    try {
      await usersApi.updateMe({ messagePrivacy: value });
      await refreshProfile();
    } catch {
      Alert.alert("Xatolik", "Sozlamani o'zgartirib bo'lmadi");
    } finally {
      setSaving(null);
    }
  };

  const onToggleReadReceipts = async (value: boolean) => {
    if (saving) return;
    setSaving("readReceipts");
    try {
      await usersApi.updateMe({ readReceiptsEnabled: value });
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
      {LAST_SEEN_OPTIONS.map((option) => {
        const selected = user.lastSeenPrivacy === option.value;
        return (
          <TouchableOpacity key={option.value} style={styles.row} onPress={() => onSelectLastSeen(option.value)} disabled={!!saving}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{option.label}</Text>
              <Text style={styles.rowDescription}>{option.description}</Text>
            </View>
            {saving === `lastSeen:${option.value}` ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioDot} />}
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <Text style={[styles.sectionTitle, styles.sectionSpacer]}>Kim meni guruhlarga qo'sha oladi</Text>
      {GROUP_ADD_OPTIONS.map((option) => {
        const selected = user.groupAddPrivacy === option.value;
        return (
          <TouchableOpacity key={option.value} style={styles.row} onPress={() => onSelectGroupAdd(option.value)} disabled={!!saving}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{option.label}</Text>
              <Text style={styles.rowDescription}>{option.description}</Text>
            </View>
            {saving === `groupAdd:${option.value}` ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioDot} />}
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <Text style={[styles.sectionTitle, styles.sectionSpacer]}>Kim menga yangi xabar yoza oladi</Text>
      {MESSAGE_PRIVACY_OPTIONS.map((option) => {
        const selected = user.messagePrivacy === option.value;
        return (
          <TouchableOpacity key={option.value} style={styles.row} onPress={() => onSelectMessagePrivacy(option.value)} disabled={!!saving}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{option.label}</Text>
              <Text style={styles.rowDescription}>{option.description}</Text>
            </View>
            {saving === `messagePrivacy:${option.value}` ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioDot} />}
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <Text style={[styles.sectionTitle, styles.sectionSpacer]}>O'qilgan xabarlar</Text>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Ko'rilgan belgisi</Text>
          <Text style={styles.rowDescription}>
            O'chirilsa, shaxsiy suhbatlarda xabaringiz o'qilganini boshqalar ko'ra olmaydi va siz ham ularning
            o'qilgan xabarlarini ko'ra olmaysiz
          </Text>
        </View>
        {saving === "readReceipts" ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Switch value={user.readReceiptsEnabled} onValueChange={onToggleReadReceipts} trackColor={{ true: colors.primary }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  sectionTitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  sectionSpacer: { marginTop: 12 },
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
