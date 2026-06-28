import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { devicesApi, DeviceKey } from "../../api/devices";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "DeviceKeys">;

export function DeviceKeysScreen({}: Props) {
  const [devices, setDevices] = useState<DeviceKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await devicesApi.list();
      setDevices(data);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try { setDevices(await devicesApi.list()); } catch {}
    setRefreshing(false);
  };

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const onRemove = (device: DeviceKey) => {
    Alert.alert(
      "Qurilmani o'chirish",
      `"${device.label ?? device.deviceId}" qurilmasini o'chirilsinmi? Bu qurilmadagi suhbat kalitlari bekor qilinadi.`,
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "O'chirish",
          style: "destructive",
          onPress: async () => {
            try {
              await devicesApi.remove(device.deviceId);
              setDevices((prev) => prev.filter((d) => d.id !== device.id));
            } catch {
              Alert.alert("Xatolik", "Qurilmani o'chirib bo'lmadi");
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
    return <ErrorView message="Qurilmalarni yuklab bo'lmadi" onRetry={loadDevices} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Bu yerda siz ro'yxatdan o'tgan barcha qurilmalaringiz ko'rsatiladi.
        Har bir qurilma uchun alohida E2EE kaliti mavjud.
      </Text>
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={Separator}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.deviceIcon}>
              <Text style={styles.deviceIconText}>📱</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.label}>{item.label ?? "Noma'lum qurilma"}</Text>
              <Text style={styles.deviceId} numberOfLines={1}>
                Kalit: {item.publicKey.substring(0, 16)}...
              </Text>
              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity onPress={() => onRemove(item)} hitSlop={8}>
              <Text style={styles.removeBtn}>🗑</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Hech qanday qurilma ro'yxatdan o'tmagan</Text>
          </View>
        }
      />
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  hint: { fontSize: 13, color: colors.textSecondary, padding: 16, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  deviceIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: "center", justifyContent: "center",
  },
  deviceIconText: { fontSize: 20 },
  info: { flex: 1 },
  label: { fontSize: 16, fontWeight: "600", color: colors.text },
  deviceId: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  date: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  removeBtn: { fontSize: 18, padding: 4 },
});
