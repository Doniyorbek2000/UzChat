import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, RefreshControl, KeyboardAvoidingView, Platform } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { paymentsApi, Payment, WalletBalance } from "../../api/payments";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { EmptyState } from "../../components/EmptyState";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Wallet">;

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString()} ${currency}`;
}

export function WalletScreen({ navigation }: Props) {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [history, setHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpVisible, setTopUpVisible] = useState(false);
  const currentUser = useAuthStore((s) => s.user);

  const loadData = useCallback(async () => {
    try {
      const [bal, hist] = await Promise.all([paymentsApi.getBalance(), paymentsApi.getHistory()]);
      setBalance(bal);
      setHistory(hist);
      setError(false);
    } catch {
      setError(true);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Xatolik", "To'g'ri miqdor kiriting");
      return;
    }
    try {
      const result = await paymentsApi.topUp(amount);
      setBalance(result);
      setTopUpAmount("");
      setTopUpVisible(false);
      Alert.alert("Muvaffaqiyat", `${formatAmount(amount, "UZS")} hisobga qo'shildi`);
      loadData();
    } catch {
      Alert.alert("Xatolik", "Hisobni to'ldirib bo'lmadi");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message="Hamyon ma'lumotlarini yuklab bo'lmadi" onRetry={() => { setLoading(true); loadData(); }} />;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Joriy balans</Text>
        <Text style={styles.balanceAmount}>
          {balance ? formatAmount(balance.balance, balance.currency) : "0 UZS"}
        </Text>
        <View style={styles.balanceActions}>
          <TouchableOpacity style={styles.balanceBtn} onPress={() => setTopUpVisible(!topUpVisible)}>
            <Text style={styles.balanceBtnText}>+ To'ldirish</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.balanceBtn} onPress={() => navigation.navigate("SendPayment")}>
            <Text style={styles.balanceBtnText}>Yuborish</Text>
          </TouchableOpacity>
        </View>
      </View>

      {topUpVisible && (
        <View style={styles.topUpRow}>
          <TextInput
            style={styles.topUpInput}
            placeholder="Miqdor (UZS)"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={topUpAmount}
            onChangeText={setTopUpAmount}
          />
          <TouchableOpacity style={styles.topUpBtn} onPress={onTopUp}>
            <Text style={styles.topUpBtnText}>Tasdiqlash</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>To'lovlar tarixi</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const isSent = item.sender.id === currentUser?.id;
          const otherUser = isSent ? item.receiver : item.sender;
          return (
            <View style={styles.historyRow}>
              <Avatar uri={otherUser.avatarUrl} name={otherUser.displayName} size={40} />
              <View style={styles.historyInfo}>
                <Text style={styles.historyName}>{otherUser.displayName}</Text>
                {item.note && <Text style={styles.historyNote}>{item.note}</Text>}
                <Text style={styles.historyDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[styles.historyAmount, isSent ? styles.amountSent : styles.amountReceived]}>
                {isSent ? "-" : "+"}{formatAmount(item.amount, item.currency)}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="💰" title="Hali to'lovlar yo'q" subtitle="Birinchi to'lovni yuborish uchun pastdagi tugmani bosing" />
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  balanceCard: {
    backgroundColor: colors.primary,
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  balanceLabel: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
  balanceAmount: { color: "#fff", fontSize: 32, fontWeight: "700", marginTop: 8 },
  balanceActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  balanceBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  balanceBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  topUpRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  topUpInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topUpBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  topUpBtnText: { color: "#fff", fontWeight: "600" },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  historyRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  historyInfo: { flex: 1 },
  historyName: { fontSize: 15, fontWeight: "500", color: colors.text },
  historyNote: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  historyDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: "600" },
  amountSent: { color: colors.danger },
  amountReceived: { color: colors.online },
});
