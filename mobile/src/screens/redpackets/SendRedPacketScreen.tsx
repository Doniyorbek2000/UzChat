import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { redPacketsApi } from "../../api/redpackets";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "SendRedPacket">;

export function SendRedPacketScreen({ navigation }: Props) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSend = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      Alert.alert("Xatolik", "To'g'ri miqdor kiriting");
      return;
    }
    setSubmitting(true);
    try {
      const packet = await redPacketsApi.create({
        amount: num,
        message: message.trim() || undefined,
      });
      Alert.alert(
        "Qizil konvert yaratildi!",
        `ID: ${packet.id.slice(0, 8)}...\nMiqdor: ${num.toLocaleString()} UZS\n\nDo'stingizga konvert ID ni yuboring!`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch {
      Alert.alert("Xatolik", "Konvert yaratib bo'lmadi. Balansni tekshiring.");
    }
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>

    <ScrollView keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.envelope}>
        <Text style={styles.envelopeIcon}>🧧</Text>
        <Text style={styles.envelopeTitle}>Qizil Konvert</Text>
        <Text style={styles.envelopeSubtitle}>Pul sovg'a qiling</Text>
      </View>

      <Text style={styles.label}>Miqdor (UZS)</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        placeholder="10000"
        placeholderTextColor={colors.textSecondary}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Xabar (ixtiyoriy)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={message}
        onChangeText={setMessage}
        placeholder="Bayram muborak!"
        placeholderTextColor={colors.textSecondary}
        multiline
        maxLength={200}
      />

      <TouchableOpacity
        style={[styles.sendBtn, (!amount.trim() || submitting) && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={!amount.trim() || submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.sendBtnText}>Konvert yuborish</Text>
        )}
      </TouchableOpacity>
    </ScrollView>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#C41E3A" },
  content: { padding: 20 },
  envelope: { alignItems: "center", paddingVertical: 30 },
  envelopeIcon: { fontSize: 64 },
  envelopeTitle: { fontSize: 24, fontWeight: "700", color: "#FFD700", marginTop: 10 },
  envelopeSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  label: { fontSize: 14, fontWeight: "600", color: "#FFD700", marginTop: 20, marginBottom: 6 },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  textArea: { minHeight: 60, textAlignVertical: "top" },
  sendBtn: {
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 30,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: "#C41E3A", fontSize: 16, fontWeight: "700" },
});
