import { useState } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator, Switch } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { usersApi } from "../../api/users";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "NotificationSettings">;

export function NotificationSettingsScreen({}: Props) {
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [saving, setSaving] = useState<string | null>(null);

  if (!user) return null;

  const onToggle = async (
    key: "notifyPrivateChats" | "notifyGroupChats" | "notifyReactions" | "hideNotificationContent",
    value: boolean
  ) => {
    if (saving) return;
    setSaving(key);
    try {
      await usersApi.updateMe({ [key]: value });
      await refreshProfile();
    } catch {
      Alert.alert("Xatolik", "Sozlamani o'zgartirib bo'lmadi");
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Bu sozlamalar barcha bildirishnomalarga taalluqli. Ovozsiz qilingan suhbatlar bu yerdagi sozlamalardan
        qat'i nazar bildirishnoma yubormaydi, lekin sizga yo'naltirilgan eslatma va javoblar har doim keladi.
      </Text>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Shaxsiy suhbatlar</Text>
          <Text style={styles.rowDescription}>Shaxsiy suhbatlardagi yangi xabarlar uchun bildirishnoma</Text>
        </View>
        {saving === "notifyPrivateChats" ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Switch
            value={user.notifyPrivateChats}
            onValueChange={(v) => onToggle("notifyPrivateChats", v)}
            trackColor={{ true: colors.primary }}
          />
        )}
      </View>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Guruhlar</Text>
          <Text style={styles.rowDescription}>Guruh suhbatlaridagi yangi xabarlar uchun bildirishnoma</Text>
        </View>
        {saving === "notifyGroupChats" ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Switch
            value={user.notifyGroupChats}
            onValueChange={(v) => onToggle("notifyGroupChats", v)}
            trackColor={{ true: colors.primary }}
          />
        )}
      </View>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Reaksiyalar</Text>
          <Text style={styles.rowDescription}>Xabarlaringizga reaksiya qo'yilganda bildirishnoma</Text>
        </View>
        {saving === "notifyReactions" ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Switch
            value={user.notifyReactions}
            onValueChange={(v) => onToggle("notifyReactions", v)}
            trackColor={{ true: colors.primary }}
          />
        )}
      </View>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Matnni yashirish</Text>
          <Text style={styles.rowDescription}>
            Bildirishnomalarda yuboruvchi ismi va xabar matni ko'rsatilmaydi
          </Text>
        </View>
        {saving === "hideNotificationContent" ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Switch
            value={user.hideNotificationContent}
            onValueChange={(v) => onToggle("hideNotificationContent", v)}
            trackColor={{ true: colors.primary }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  hint: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 16 },
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
});
