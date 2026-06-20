import React, { useCallback, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { redPacketsApi, RedPacket } from "../../api/redpackets";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ClaimRedPacket">;

export function ClaimRedPacketScreen({ route, navigation }: Props) {
  const packetId = route.params?.packetId;
  const [inputId, setInputId] = useState(packetId ?? "");
  const [packet, setPacket] = useState<RedPacket | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const loadPacket = async () => {
    if (!inputId.trim()) return;
    setLoading(true);
    try {
      const p = await redPacketsApi.getById(inputId.trim());
      setPacket(p);
    } catch {
      Alert.alert("Xatolik", "Konvert topilmadi");
    }
    setLoading(false);
  };

  const handleClaim = async () => {
    if (!packet) return;
    setClaiming(true);
    try {
      await redPacketsApi.claim(packet.id);
      Alert.alert(
        "Tabriklaymiz! 🎉",
        `Siz ${packet.amount.toLocaleString()} ${packet.currency} oldingiz!`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert("Xatolik", e?.response?.data?.error?.message ?? "Konvertni ochib bo'lmadi");
    }
    setClaiming(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.envelope}>
        <Text style={styles.envelopeIcon}>🧧</Text>
        <Text style={styles.envelopeTitle}>Qizil Konvert</Text>
      </View>

      {!packet ? (
        <View style={styles.inputSection}>
          <Text style={styles.label}>Konvert ID ni kiriting</Text>
          <TextInput
            style={styles.input}
            value={inputId}
            onChangeText={setInputId}
            placeholder="Konvert ID..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.openBtn, (!inputId.trim() || loading) && styles.openBtnDisabled]}
            onPress={loadPacket}
            disabled={!inputId.trim() || loading}
          >
            {loading ? <ActivityIndicator color="#C41E3A" /> : <Text style={styles.openBtnText}>Qidirish</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.detailSection}>
          <Text style={styles.senderName}>{packet.sender?.displayName ?? "Noma'lum"} dan</Text>
          {packet.message && <Text style={styles.message}>"{packet.message}"</Text>}
          <Text style={styles.amount}>{packet.amount.toLocaleString()} {packet.currency}</Text>

          {packet.status === "ACTIVE" ? (
            <TouchableOpacity
              style={[styles.claimBtn, claiming && styles.claimBtnDisabled]}
              onPress={handleClaim}
              disabled={claiming}
            >
              {claiming ? <ActivityIndicator color="#C41E3A" /> : <Text style={styles.claimBtnText}>Ochish</Text>}
            </TouchableOpacity>
          ) : (
            <Text style={styles.statusText}>
              {packet.status === "CLAIMED"
                ? `${packet.claimedBy?.displayName ?? "Kimdir"} tomonidan olingan`
                : "Muddati tugagan"}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#C41E3A", padding: 20 },
  envelope: { alignItems: "center", paddingVertical: 30 },
  envelopeIcon: { fontSize: 64 },
  envelopeTitle: { fontSize: 24, fontWeight: "700", color: "#FFD700", marginTop: 10 },
  inputSection: { marginTop: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#FFD700", marginBottom: 8 },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: "#fff", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
  },
  openBtn: { backgroundColor: "#FFD700", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 16 },
  openBtnDisabled: { opacity: 0.5 },
  openBtnText: { color: "#C41E3A", fontSize: 16, fontWeight: "700" },
  detailSection: { alignItems: "center", marginTop: 20 },
  senderName: { fontSize: 18, fontWeight: "600", color: "#fff" },
  message: { fontSize: 16, color: "rgba(255,255,255,0.9)", marginTop: 8, fontStyle: "italic" },
  amount: { fontSize: 36, fontWeight: "800", color: "#FFD700", marginTop: 16 },
  claimBtn: { backgroundColor: "#FFD700", paddingHorizontal: 40, paddingVertical: 14, borderRadius: 25, marginTop: 24 },
  claimBtnDisabled: { opacity: 0.5 },
  claimBtnText: { color: "#C41E3A", fontSize: 18, fontWeight: "700" },
  statusText: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 16 },
});
