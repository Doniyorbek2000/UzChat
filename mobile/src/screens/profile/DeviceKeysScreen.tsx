import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { devicesApi, DeviceKey } from "../../api/devices";
import { computeKeyFingerprint } from "../../crypto/e2ee";
import { keyManager } from "../../crypto/keyManager";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "DeviceKeys">;

export function DeviceKeysScreen({}: Props) {
  const [devices, setDevices] = useState<DeviceKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [data, devId] = await Promise.all([devicesApi.list(), keyManager.getDeviceId()]);
      setDevices(data);
      setCurrentDeviceId(devId);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setDevices(await devicesApi.list());
    } catch {}
    setRefreshing(false);
  };

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const onUploadPreKeys = async () => {
    try {
      await keyManager.uploadPreKeysIfNeeded();
      Alert.alert(tr("Muvaffaqiyat"), tr("Pre-key'lar yuklandi"));
      onRefresh();
    } catch {
      Alert.alert(tr("Xatolik"), tr("Pre-key'larni yuklab bo'lmadi"));
    }
  };

  const onRemove = (device: DeviceKey) => {
    if (device.deviceId === currentDeviceId) {
      Alert.alert(tr("Ogohlantirish"), tr("Joriy qurilmani o'chirib bo'lmaydi"));
      return;
    }
    Alert.alert(tr("Qurilmani o'chirish"),
      `"${device.label ?? device.deviceId.slice(0, 8)}" qurilmasini o'chirilsinmi? Bu qurilmadagi suhbat kalitlari bekor qilinadi.`,
      [
        { text: tr("Bekor qilish"), style: "cancel" },
        {
          text: tr("O'chirish"),
          style: "destructive",
          onPress: async () => {
            try {
              await devicesApi.remove(device.deviceId);
              setDevices((prev) => prev.filter((d) => d.id !== device.id));
            } catch {
              Alert.alert(tr("Xatolik"), tr("Qurilmani o'chirib bo'lmadi"));
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message={tr("Qurilmalarni yuklab bo'lmadi")} onRetry={loadDevices} />;
  }

  const getPreKeyStatus = (device: DeviceKey) => {
    const count = device._count?.preKeys ?? 0;
    if (count === 0) return { text: tr("Pre-key yo'q"), color: colors.danger };
    if (count < 20) return { text: `${count} ta pre-key (kam)`, color: "#FF9500" };
    return { text: `${count} ta pre-key`, color: "#34C759" };
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerIconBox}>
          <Text style={styles.headerIcon}>🔐</Text>
        </View>
        <Text style={styles.headerTitle}>{tr("Qurilma kalitlari")}</Text>
        <Text style={styles.headerDesc}>
          {tr("Har bir qurilmada alohida Signal Protocol kaliti mavjud. Pre-key'lar xavfsiz kalit almashish uchun ishlatiladi.")}
        </Text>
      </View>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const isCurrent = item.deviceId === currentDeviceId;
          const preKeyStatus = getPreKeyStatus(item);
          const fingerprint = computeKeyFingerprint(item.publicKey);
          return (
            <View style={[styles.deviceCard, isCurrent && styles.deviceCardCurrent]}>
              <View style={styles.deviceHeader}>
                <View style={[styles.deviceIconBox, isCurrent && styles.deviceIconBoxCurrent]}>
                  <Text style={styles.deviceIconText}>{isCurrent ? "📲" : "📱"}</Text>
                </View>
                <View style={styles.deviceInfo}>
                  <View style={styles.deviceNameRow}>
                    <Text style={styles.deviceLabel}>{item.label ?? "Qurilma"}</Text>
                    {isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>{tr("Joriy")}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.deviceId}>ID: {item.deviceId.slice(0, 12)}...</Text>
                </View>
                {!isCurrent && (
                  <TouchableOpacity onPress={() => onRemove(item)} hitSlop={8} style={styles.removeButton}>
                    <Text style={styles.removeIcon}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.deviceDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{tr("Barmoq izi")}</Text>
                  <Text style={styles.detailFingerprint}>{fingerprint}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{tr("Pre-key holati")}</Text>
                  <View style={styles.preKeyStatusRow}>
                    <View style={[styles.preKeyDot, { backgroundColor: preKeyStatus.color }]} />
                    <Text style={[styles.detailValue, { color: preKeyStatus.color }]}>{preKeyStatus.text}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{tr("Signed Pre-key")}</Text>
                  <Text style={styles.detailValue}>{item.signedPreKey ? "Mavjud" : "Yo'q"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{tr("Ro'yxatga olingan")}</Text>
                  <Text style={styles.detailValue}>
                    {new Date(item.createdAt).toLocaleDateString("uz")}
                  </Text>
                </View>
              </View>

              {isCurrent && preKeyStatus.color !== "#34C759" && (
                <TouchableOpacity style={styles.refillButton} onPress={onUploadPreKeys}>
                  <Text style={styles.refillButtonText}>{tr("Pre-key'larni yangilash")}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📱</Text>
            <Text style={styles.emptyTitle}>{tr("Qurilmalar yo'q")}</Text>
            <Text style={styles.emptyDesc}>{tr("Hech qanday qurilma ro'yxatdan o'tmagan")}</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🛡️</Text>
                <Text style={styles.infoText}>{tr("Signal Protocol asosidagi shifrlash")}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🔄</Text>
                <Text style={styles.infoText}>{tr("Pre-key'lar avtomatik yangilanadi")}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🔒</Text>
                <Text style={styles.infoText}>{tr("Maxfiy kalitlar faqat qurilmada saqlanadi")}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🚫</Text>
                <Text style={styles.infoText}>{tr("Server hech qachon maxfiy kalitlarni ko'rmaydi")}</Text>
              </View>
            </View>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  headerCard: {
    backgroundColor: colors.surface,
    padding: 24,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerIcon: { fontSize: 32 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 8 },
  headerDesc: { fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 18 },
  list: { padding: 16, gap: 12 },
  deviceCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  deviceCardCurrent: {
    borderWidth: 1.5,
    borderColor: colors.primary + "40",
  },
  deviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  deviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceIconBoxCurrent: {
    backgroundColor: colors.primary + "18",
  },
  deviceIconText: { fontSize: 22 },
  deviceInfo: { flex: 1 },
  deviceNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  deviceLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.primary + "20",
  },
  currentBadgeText: { fontSize: 11, color: colors.primary, fontWeight: "600" },
  deviceId: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontFamily: "monospace" },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.danger + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  removeIcon: { fontSize: 14, color: colors.danger, fontWeight: "700" },
  deviceDetails: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: { fontSize: 13, color: colors.textSecondary },
  detailValue: { fontSize: 13, color: colors.text, fontWeight: "500" },
  detailFingerprint: {
    fontSize: 11,
    color: colors.text,
    fontFamily: "monospace",
    maxWidth: 200,
    textAlign: "right",
  },
  preKeyStatusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  preKeyDot: { width: 8, height: 8, borderRadius: 4 },
  refillButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  refillButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary },
  footer: { paddingTop: 8 },
  infoCard: {
    backgroundColor: colors.primary + "08",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoIcon: { fontSize: 18, width: 28 },
  infoText: { fontSize: 13, color: colors.text, flex: 1, lineHeight: 18 },
});
