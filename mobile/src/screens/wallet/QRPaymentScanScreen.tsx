import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { qrPaymentsApi } from "../../api/qrPayments";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "QRPaymentScan">;

export function QRPaymentScanScreen({ navigation }: Props) {
  const [qrCode, setQrCode] = useState("");
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [info, setInfo] = useState<{ creator: string; requestedAmount: string | null; note: string | null } | null>(null);

  const handleLookup = async () => {
    if (!qrCode.trim()) return;
    try {
      const qr = await qrPaymentsApi.getByCode(qrCode.trim());
      setInfo({
        creator: qr.creator.displayName,
        requestedAmount: qr.amount ? `${Number(qr.amount).toLocaleString()} ${qr.currency}` : null,
        note: qr.note,
      });
      if (qr.amount) setAmount(String(qr.amount));
    } catch {
      Alert.alert("Xatolik", "QR kod topilmadi yoki muddati tugagan");
    }
  };

  const handlePay = async () => {
    if (!qrCode.trim()) return;
    setPaying(true);
    try {
      await qrPaymentsApi.pay({
        qrCode: qrCode.trim(),
        amount: amount ? parseFloat(amount) : undefined,
      });
      Alert.alert("Muvaffaqiyat", "To'lov amalga oshirildi!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message || "To'lov amalga oshirilmadi");
    }
    setPaying(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.scanArea}>
        <Text style={styles.scanIcon}>📷</Text>
        <Text style={styles.scanHint}>Kameradan QR kod skanerlash yoki qo'lda kiriting</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="QR kodni kiriting"
          placeholderTextColor={colors.textSecondary}
          value={qrCode}
          onChangeText={setQrCode}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.lookupBtn} onPress={handleLookup}>
          <Text style={styles.lookupBtnText}>Tekshirish</Text>
        </TouchableOpacity>

        {info && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Qabul qiluvchi: <Text style={styles.infoValue}>{info.creator}</Text></Text>
            {info.requestedAmount && (
              <Text style={styles.infoLabel}>Summa: <Text style={styles.infoValue}>{info.requestedAmount}</Text></Text>
            )}
            {info.note && (
              <Text style={styles.infoLabel}>Izoh: <Text style={styles.infoValue}>{info.note}</Text></Text>
            )}
          </View>
        )}

        {info && !info.requestedAmount && (
          <TextInput
            style={styles.input}
            placeholder="Summa kiriting"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        )}

        <TouchableOpacity style={styles.payBtn} onPress={handlePay} disabled={paying || !qrCode.trim()}>
          {paying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payBtnText}>To'lash</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scanArea: {
    height: 200,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
  },
  scanIcon: { fontSize: 48 },
  scanHint: { color: colors.textSecondary, fontSize: 13, marginTop: 12, textAlign: "center", paddingHorizontal: 40 },
  form: { padding: 16 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lookupBtn: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  lookupBtnText: { color: colors.text, fontWeight: "600", fontSize: 14 },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  infoLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  infoValue: { fontWeight: "600", color: colors.text },
  payBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  payBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
