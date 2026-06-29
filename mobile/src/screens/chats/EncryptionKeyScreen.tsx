import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView, FlatList } from "react-native";
import * as Clipboard from "expo-clipboard";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { usersApi } from "../../api/users";
import { devicesApi, KeyTransparencyEntry } from "../../api/devices";
import { useAuthStore } from "../../store/authStore";
import { useVerifiedContactsStore } from "../../store/verifiedContactsStore";
import { getSecurityCode, computeKeyFingerprint } from "../../crypto/e2ee";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "EncryptionKey">;

export function EncryptionKeyScreen({ route }: Props) {
  const { userId, displayName } = route.params;
  const user = useAuthStore((s) => s.user);
  const [securityCode, setSecurityCode] = useState<string | null>(null);
  const [peerPublicKey, setPeerPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"code" | "keys" | "log">("code");
  const [devices, setDevices] = useState<{ deviceId: string; publicKey: string }[]>([]);
  const [transparencyLog, setTransparencyLog] = useState<KeyTransparencyEntry[]>([]);
  const verifiedCode = useVerifiedContactsStore((s) => s.verified[userId]);
  const setVerified = useVerifiedContactsStore((s) => s.setVerified);
  const removeVerified = useVerifiedContactsStore((s) => s.removeVerified);

  useEffect(() => {
    usersApi
      .getById(userId)
      .then((profile) => {
        setPeerPublicKey(profile.publicKey);
        if (user) setSecurityCode(getSecurityCode(user.publicKey, profile.publicKey));
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    devicesApi.getUserKeys(userId).then(setDevices).catch(() => {});
    devicesApi.getKeyTransparencyLog(userId).then(setTransparencyLog).catch(() => {});
  }, [userId, user]);

  const onCopy = () => {
    if (!securityCode) return;
    Clipboard.setStringAsync(securityCode).catch(() => {});
    Alert.alert("Nusxalandi", "Xavfsizlik kodi vaqtinchalik xotiraga nusxalandi");
  };

  const onCopyFingerprint = (fp: string) => {
    Clipboard.setStringAsync(fp).catch(() => {});
    Alert.alert("Nusxalandi", "Kalit barmoq izi nusxalandi");
  };

  const isVerified = !!securityCode && verifiedCode === securityCode;
  const keyChanged = !!verifiedCode && verifiedCode !== securityCode;

  const onToggleVerified = () => {
    if (!securityCode) return;
    if (isVerified) {
      removeVerified(userId).catch(() => {});
    } else {
      setVerified(userId, securityCode).catch(() => {});
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString("uz")} ${d.toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const actionLabels: Record<string, string> = {
    REGISTER: "Qurilma ro'yxatga olindi",
    REMOVE: "Qurilma o'chirildi",
    KEY_CHANGE: "Kalit yangilandi",
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === "code" && styles.tabActive]} onPress={() => setTab("code")}>
          <Text style={[styles.tabText, tab === "code" && styles.tabTextActive]}>Xavfsizlik kodi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === "keys" && styles.tabActive]} onPress={() => setTab("keys")}>
          <Text style={[styles.tabText, tab === "keys" && styles.tabTextActive]}>Kalitlar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === "log" && styles.tabActive]} onPress={() => setTab("log")}>
          <Text style={[styles.tabText, tab === "log" && styles.tabTextActive]}>Tarix</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : tab === "code" ? (
        <ScrollView contentContainerStyle={styles.content}>
          {!securityCode ? (
            <Text style={styles.emptyText}>Kodni hisoblab bo'lmadi</Text>
          ) : (
            <>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>🔐</Text>
              </View>
              <Text style={styles.title}>Xavfsizlik kodi</Text>
              <Text style={styles.description}>
                Bu kod siz va {displayName} o'rtasidagi shifrlash kalitlaridan hisoblanadi. Agar bu kod ikkingizning
                qurilmalaringizda bir xil bo'lsa, suhbatingiz uchinchi tomon tomonidan kuzatilmayapti degani.
              </Text>
              <View style={styles.codeBox}>
                <Text style={styles.code}>{securityCode}</Text>
              </View>
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>Tasdiqlangan</Text>
                </View>
              )}
              {keyChanged && (
                <View style={styles.warningBadge}>
                  <Text style={styles.warningBadgeText}>
                    Xavfsizlik kodi o'zgardi! Avval tasdiqlangan kod endi mos kelmaydi. Qaytadan tasdiqlang.
                  </Text>
                </View>
              )}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={onCopy}>
                  <Text style={styles.actionButtonText}>Nusxalash</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonOutline]}
                  onPress={onToggleVerified}
                >
                  <Text style={[styles.actionButtonText, styles.actionButtonOutlineText]}>
                    {isVerified ? "Bekor qilish" : "Tasdiqlash"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>🛡️</Text>
                  <Text style={styles.infoText}>End-to-end shifrlash faol</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>🔒</Text>
                  <Text style={styles.infoText}>Xabarlar faqat siz va {displayName} tomonidan o'qilishi mumkin</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>🚫</Text>
                  <Text style={styles.infoText}>Server xabarlarni o'qiy olmaydi — faqat shifrlangan matn saqlanadi</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>🔑</Text>
                  <Text style={styles.infoText}>Signal Protocol asosidagi shifrlash ishlatiladi</Text>
                </View>
              </View>
              <Text style={styles.hint}>
                Kodni solishtirish uchun uni boshqa kanal orqali (masalan, telefon qo'ng'irog'i) {displayName}ga yuboring
                va o'zingizdagi kod bilan taqqoslang.
              </Text>
            </>
          )}
        </ScrollView>
      ) : tab === "keys" ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>{displayName} qurilmalari</Text>
          {devices.length === 0 ? (
            <Text style={styles.emptyText}>Qurilmalar topilmadi</Text>
          ) : (
            devices.map((d) => {
              const fp = computeKeyFingerprint(d.publicKey);
              return (
                <TouchableOpacity key={d.deviceId} style={styles.deviceCard} onPress={() => onCopyFingerprint(fp)}>
                  <View style={styles.deviceIconContainer}>
                    <Text style={styles.deviceIcon}>📱</Text>
                  </View>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceId}>Qurilma: {d.deviceId.slice(0, 8)}...</Text>
                    <Text style={styles.fingerprint}>{fp}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          {peerPublicKey && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Asosiy kalit barmoq izi</Text>
              <View style={styles.fingerprintCard}>
                <Text style={styles.fingerprintLarge}>{computeKeyFingerprint(peerPublicKey)}</Text>
              </View>
            </>
          )}
          {user && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Sizning kalit barmoq izingiz</Text>
              <View style={styles.fingerprintCard}>
                <Text style={styles.fingerprintLarge}>{computeKeyFingerprint(user.publicKey)}</Text>
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={transparencyLog}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.logList}
          renderItem={({ item }) => (
            <View style={styles.logEntry}>
              <View style={[styles.logDot, { backgroundColor: item.action === "REMOVE" ? colors.danger : colors.primary }]} />
              <View style={styles.logContent}>
                <Text style={styles.logAction}>{actionLabels[item.action] ?? item.action}</Text>
                <Text style={styles.logDevice}>Qurilma: {item.deviceId.slice(0, 8)}...</Text>
                <Text style={styles.logDate}>{formatDate(item.createdAt)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Tarix yo'q</Text>
              <Text style={styles.emptyHint}>Kalit o'zgarishlari bu yerda ko'rsatiladi</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" },
  tabTextActive: { color: colors.primary, fontWeight: "600" },
  loader: { marginTop: 48 },
  content: { padding: 24, alignItems: "center" },
  emptyText: { color: colors.textSecondary, marginTop: 48, textAlign: "center" },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  icon: { fontSize: 40 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 12 },
  description: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  codeBox: {
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  code: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    letterSpacing: 3,
    fontFamily: "monospace",
  },
  verifiedBadge: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#34C759",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifiedBadgeText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  warningBadge: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.danger + "15",
    borderWidth: 1,
    borderColor: colors.danger,
    width: "100%",
  },
  warningBadgeText: { color: colors.danger, fontSize: 13, fontWeight: "600", textAlign: "center" },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    backgroundColor: colors.primary,
  },
  actionButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  actionButtonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  actionButtonOutlineText: { color: colors.primary },
  infoCard: {
    marginTop: 24,
    backgroundColor: colors.primary + "08",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    gap: 12,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoIcon: { fontSize: 18, width: 28 },
  infoText: { fontSize: 13, color: colors.text, flex: 1, lineHeight: 18 },
  hint: { fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 20, lineHeight: 18 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.text, alignSelf: "flex-start", marginBottom: 12 },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    width: "100%",
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  deviceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  deviceIcon: { fontSize: 20 },
  deviceInfo: { flex: 1 },
  deviceId: { fontSize: 14, fontWeight: "600", color: colors.text },
  fingerprint: { fontSize: 11, color: colors.textSecondary, fontFamily: "monospace", marginTop: 4 },
  fingerprintCard: {
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  fingerprintLarge: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    fontFamily: "monospace",
    letterSpacing: 1,
    textAlign: "center",
  },
  logList: { padding: 16 },
  logEntry: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16, gap: 12 },
  logDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  logContent: { flex: 1 },
  logAction: { fontSize: 14, fontWeight: "600", color: colors.text },
  logDevice: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  logDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
