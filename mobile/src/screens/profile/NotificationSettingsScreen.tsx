import { useState } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator, Switch, TouchableOpacity, ScrollView, Modal, Pressable, FlatList } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { usersApi } from "../../api/users";
import { sendTestNotification } from "../../utils/pushNotifications";
import { formatDateTime } from "../../utils/conversation";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "NotificationSettings">;
type UpdateMeInput = Parameters<typeof usersApi.updateMe>[0];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(minutes: number | null): string {
  if (minutes == null) return "--:--";
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:00`;
}

export function NotificationSettingsScreen({}: Props) {
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [timePicker, setTimePicker] = useState<"start" | "end" | null>(null);

  if (!user) return null;

  const onToggle = async (
    key:
      | "notifyPrivateChats"
      | "notifyGroupChats"
      | "notifyReactions"
      | "notifyMentions"
      | "hideNotificationContent"
      | "includeMutedInBadge"
      | "quietHoursEnabled",
    value: boolean
  ) => {
    if (saving) return;
    setSaving(key);
    try {
      const data: UpdateMeInput = { [key]: value };
      if (key === "quietHoursEnabled" && value && (user.quietHoursStart == null || user.quietHoursEnd == null)) {
        data.quietHoursStart = 23 * 60;
        data.quietHoursEnd = 7 * 60;
        data.quietHoursTimezoneOffset = -new Date().getTimezoneOffset();
      }
      await usersApi.updateMe(data);
      await refreshProfile();
    } catch {
      Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
    } finally {
      setSaving(null);
    }
  };

  const onSelectHour = async (hour: number) => {
    if (!timePicker || saving) return;
    setSaving("quietHours");
    try {
      const minutes = hour * 60;
      const data: UpdateMeInput =
        timePicker === "start"
          ? { quietHoursStart: minutes, quietHoursEnd: user.quietHoursEnd ?? 7 * 60 }
          : { quietHoursStart: user.quietHoursStart ?? 23 * 60, quietHoursEnd: minutes };
      data.quietHoursTimezoneOffset = -new Date().getTimezoneOffset();
      await usersApi.updateMe(data);
      await refreshProfile();
      setTimePicker(null);
    } catch {
      Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
    } finally {
      setSaving(null);
    }
  };

  const isPaused =
    user.notificationsPaused || (user.notificationsPausedUntil != null && new Date(user.notificationsPausedUntil).getTime() > Date.now());

  const onPauseNotifications = async (duration: "1h" | "8h" | "1d" | "forever" | "off") => {
    if (saving) return;
    setSaving("pauseNotifications");
    try {
      await usersApi.updateMe({ pauseNotificationsFor: duration });
      await refreshProfile();
    } catch {
      Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
    } finally {
      setSaving(null);
    }
  };

  const onPausePress = () => {
    if (isPaused) {
      onPauseNotifications("off");
      return;
    }
    Alert.alert(tr("Bezovta qilmang"), tr("Bildirishnomalarni qancha vaqtga o'chirmoqchisiz?"), [
      { text: tr("1 soat"), onPress: () => onPauseNotifications("1h") },
      { text: tr("8 soat"), onPress: () => onPauseNotifications("8h") },
      { text: tr("1 kun"), onPress: () => onPauseNotifications("1d") },
      { text: tr("Doimiy"), onPress: () => onPauseNotifications("forever") },
      { text: tr("Bekor qilish"), style: "cancel" },
    ]);
  };

  const onTestNotification = async () => {
    if (testing) return;
    setTesting(true);
    try {
      const sent = await sendTestNotification();
      if (!sent) Alert.alert(tr("Ruxsat kerak"), tr("Bildirishnomalarga ruxsat berilmagan"));
    } catch {
      Alert.alert(tr("Xatolik"), tr("Sinov bildirishnomasini yuborib bo'lmadi"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Bu sozlamalar barcha bildirishnomalarga taalluqli. Ovozsiz qilingan suhbatlar bu yerdagi sozlamalardan
        qat'i nazar bildirishnoma yubormaydi, lekin sizga yo'naltirilgan eslatma va javoblar (eslatishlar
        o'chirilmagan bo'lsa) har doim keladi.
      </Text>

      <TouchableOpacity style={styles.row} onPress={onPausePress} disabled={saving === "pauseNotifications"}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{tr("🔕 Bezovta qilmang")}</Text>
          <Text style={styles.rowDescription}>
            {isPaused
              ? user.notificationsPaused
                ? "Bildirishnomalar doimiy o'chirilgan. Yoqish uchun bosing"
                : `Bildirishnomalar ${formatDateTime(user.notificationsPausedUntil!)} gacha o'chirilgan. Yoqish uchun bosing`
              : "Barcha bildirishnomalarni vaqtincha o'chirish"}
          </Text>
        </View>
        {saving === "pauseNotifications" ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          isPaused && <Text style={styles.pausedBadge}>{tr("Yoniq")}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{tr("Shaxsiy suhbatlar")}</Text>
          <Text style={styles.rowDescription}>{tr("Shaxsiy suhbatlardagi yangi xabarlar uchun bildirishnoma")}</Text>
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
          <Text style={styles.rowLabel}>{tr("Guruhlar")}</Text>
          <Text style={styles.rowDescription}>{tr("Guruh suhbatlaridagi yangi xabarlar uchun bildirishnoma")}</Text>
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
          <Text style={styles.rowLabel}>{tr("Reaksiyalar")}</Text>
          <Text style={styles.rowDescription}>{tr("Xabarlaringizga reaksiya qo'yilganda bildirishnoma")}</Text>
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
          <Text style={styles.rowLabel}>{tr("Eslatishlar (@)")}</Text>
          <Text style={styles.rowDescription}>
            {tr("Sizni @-eslatib o'tgan xabarlar uchun bildirishnoma, ovozsiz qilingan suhbatlarda ham")}
          </Text>
        </View>
        {saving === "notifyMentions" ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Switch
            value={user.notifyMentions}
            onValueChange={(v) => onToggle("notifyMentions", v)}
            trackColor={{ true: colors.primary }}
          />
        )}
      </View>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{tr("Matnni yashirish")}</Text>
          <Text style={styles.rowDescription}>
            {tr("Bildirishnomalarda yuboruvchi ismi va xabar matni ko'rsatilmaydi")}
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

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{tr("Ovozsiz suhbatlar hisoblagichda")}</Text>
          <Text style={styles.rowDescription}>
            {tr("Ovozsiz qilingan suhbatlar ilova belgisi va papka hisoblagichlariga qo'shiladi")}
          </Text>
        </View>
        {saving === "includeMutedInBadge" ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Switch
            value={user.includeMutedInBadge}
            onValueChange={(v) => onToggle("includeMutedInBadge", v)}
            trackColor={{ true: colors.primary }}
          />
        )}
      </View>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{tr("🌙 Sokin soatlar")}</Text>
          <Text style={styles.rowDescription}>
            {tr("Belgilangan vaqt oralig'ida hech qanday bildirishnoma kelmaydi")}
          </Text>
        </View>
        {saving === "quietHoursEnabled" ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Switch
            value={user.quietHoursEnabled}
            onValueChange={(v) => onToggle("quietHoursEnabled", v)}
            trackColor={{ true: colors.primary }}
          />
        )}
      </View>

      {user.quietHoursEnabled && (
        <>
          <TouchableOpacity style={styles.row} onPress={() => setTimePicker("start")}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{tr("Boshlanish vaqti")}</Text>
            </View>
            <Text style={styles.timeValue}>{formatHour(user.quietHoursStart)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={() => setTimePicker("end")}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{tr("Tugash vaqti")}</Text>
            </View>
            <Text style={styles.timeValue}>{formatHour(user.quietHoursEnd)}</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.testButton} onPress={onTestNotification} disabled={testing}>
        {testing ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.testButtonText}>{tr("🔔 Sinov bildirishnomasini yuborish")}</Text>
        )}
      </TouchableOpacity>

      <Modal visible={timePicker !== null} transparent animationType="fade" onRequestClose={() => setTimePicker(null)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setTimePicker(null)}>
          <Pressable style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>{timePicker === "start" ? "Boshlanish vaqti" : "Tugash vaqti"}</Text>
            <FlatList
              data={HOURS}
              keyExtractor={(h) => String(h)}
              style={styles.pickerList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const current = timePicker === "start" ? user.quietHoursStart : user.quietHoursEnd;
                const selected = current === item * 60;
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                    onPress={() => onSelectHour(item)}
                    disabled={saving === "quietHours"}
                  >
                    <Text style={[styles.pickerItemText, selected && styles.pickerItemTextSelected]}>
                      {`${String(item).padStart(2, "0")}:00`}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16 },
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
  timeValue: { fontSize: 16, color: colors.primary, fontWeight: "600" },
  pausedBadge: { fontSize: 13, fontWeight: "600", color: colors.danger },
  testButton: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  testButtonText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  pickerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  pickerSheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    width: "70%",
    maxWidth: 240,
  },
  pickerTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12, textAlign: "center" },
  pickerList: { height: 220 },
  pickerItem: { paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  pickerItemSelected: { backgroundColor: colors.primary },
  pickerItemText: { fontSize: 15, color: colors.text },
  pickerItemTextSelected: { color: "#fff", fontWeight: "700" },
});
