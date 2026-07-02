import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useChatStore } from "../../store/chatStore";
import { exportAccountData } from "../../utils/dataExport";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

export function AccountDataExportScreen() {
  const user = useAuthStore((s) => s.user);
  const conversations = useChatStore((s) => s.conversations);
  const [exporting, setExporting] = useState(false);

  const onExport = async () => {
    if (!user || exporting) return;
    setExporting(true);
    try {
      await exportAccountData(user, conversations);
    } catch {
      Alert.alert(tr("Xatolik"), tr("Ma'lumotlarni eksport qilib bo'lmadi"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Profil ma'lumotlaringiz, maxfiylik va bildirishnoma sozlamalari, kontaktlar ro'yxati, bloklangan
        foydalanuvchilar va suhbatlar ro'yxati yagona JSON fayl sifatida tayyorlanadi va ulashish menyusi
        orqali saqlanadi.
      </Text>
      <Text style={styles.note}>
        Xabarlar matni end-to-end shifrlangan va serverda saqlanmaydi, shuning uchun bu yerga kiritilmaydi.
        Muayyan suhbat tarixini yuklab olish uchun shu suhbat menyusidagi "Suhbatni eksport qilish"
        funksiyasidan foydalaning.
      </Text>
      <TouchableOpacity style={styles.button} onPress={onExport} disabled={exporting}>
        {exporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{tr("Yuklab olish")}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  description: { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 12 },
  note: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 24 },
  button: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
