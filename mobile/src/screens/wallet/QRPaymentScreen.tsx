import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, FlatList } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { qrPaymentsApi, QrPayment } from "../../api/qrPayments";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "QRPayment">;

export function QRPaymentScreen({ navigation }: Props) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [history, setHistory] = useState<QrPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    qrPaymentsApi.listMine().then(setHistory).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const qr = await qrPaymentsApi.create({
        amount: amount ? parseFloat(amount) : undefined,
        note: note || undefined,
      });
      Alert.alert("QR kod yaratildi", `Kod: ${qr.qrCode}\n\nSumma: ${qr.amount ? `${qr.amount} UZS` : "Ixtiyoriy"}`);
      setAmount("");
      setNote("");
      setHistory((prev) => [qr, ...prev]);
    } catch {
      Alert.alert("Xatolik", "QR kod yaratib bo'lmadi");
    }
    setCreating(false);
  };

  const statusColor = (s: string) => {
    if (s === "COMPLETED") return colors.online;
    if (s === "EXPIRED" || s === "CANCELLED") return colors.danger;
    return "#FF9500";
  };

  const statusText = (s: string) => {
    if (s === "COMPLETED") return "To'langan";
    if (s === "EXPIRED") return "Muddati o'tgan";
    if (s === "CANCELLED") return "Bekor qilingan";
    return "Kutilmoqda";
  };

  return (
    <View style={styles.container}>
      <View style={styles.createSection}>
        <Text style={styles.sectionTitle}>QR to'lov yaratish</Text>
        <TextInput
          style={styles.input}
          placeholder="Summa (ixtiyoriy)"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={styles.input}
          placeholder="Izoh (ixtiyoriy)"
          placeholderTextColor={colors.textSecondary}
          value={note}
          onChangeText={setNote}
        />
        <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={creating}>
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createBtnText}>QR kod yaratish</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => navigation.navigate("QRPaymentScan")}
        >
          <Text style={styles.scanBtnText}>📷 QR kod skanerlash</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Tarix</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <ErrorView message="Tarixni yuklab bo'lmadi" onRetry={loadData} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={styles.historyRow}>
                <Text style={styles.historyAmount}>
                  {item.amount ? `${Number(item.amount).toLocaleString()} ${item.currency}` : "Ixtiyoriy summa"}
                </Text>
                <Text style={[styles.historyStatus, { color: statusColor(item.status) }]}>
                  {statusText(item.status)}
                </Text>
              </View>
              {item.note && <Text style={styles.historyNote}>{item.note}</Text>}
              <Text style={styles.historyDate}>
                {new Date(item.createdAt).toLocaleDateString("uz-UZ")}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Hali QR to'lovlar yo'q</Text>}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  createSection: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    marginBottom: 8,
  },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  createBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  scanBtn: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  scanBtnText: { color: colors.text, fontWeight: "600", fontSize: 15 },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
  },
  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyAmount: { fontSize: 15, fontWeight: "600", color: colors.text },
  historyStatus: { fontSize: 12, fontWeight: "600" },
  historyNote: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  historyDate: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  emptyText: { textAlign: "center", color: colors.textSecondary, fontSize: 15, padding: 20 },
});
