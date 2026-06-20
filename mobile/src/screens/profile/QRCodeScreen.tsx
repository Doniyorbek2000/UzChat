import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Share, Alert } from "react-native";
import * as Clipboard from "expo-clipboard";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "QRCode">;

function getQRImageUrl(data: string, size = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export function QRCodeScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<"my" | "scan">("my");

  if (!user) return null;

  const profileLink = `uzchat://profile/${user.username}`;
  const qrUrl = getQRImageUrl(profileLink);

  const onShare = async () => {
    try {
      await Share.share({
        message: `UzChat da meni toping: @${user.username}\n${profileLink}`,
      });
    } catch {}
  };

  const onCopy = async () => {
    await Clipboard.setStringAsync(profileLink);
    Alert.alert("Nusxalandi", "Profil havolasi nusxalandi");
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === "my" && styles.tabActive]} onPress={() => setTab("my")}>
          <Text style={[styles.tabText, tab === "my" && styles.tabTextActive]}>Mening QR kodom</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === "scan" && styles.tabActive]} onPress={() => setTab("scan")}>
          <Text style={[styles.tabText, tab === "scan" && styles.tabTextActive]}>Skanerlash</Text>
        </TouchableOpacity>
      </View>

      {tab === "my" ? (
        <View style={styles.qrContainer}>
          <Avatar uri={user.avatarUrl} name={user.displayName} size={80} />
          <Text style={styles.displayName}>{user.displayName}</Text>
          <Text style={styles.username}>@{user.username}</Text>

          <View style={styles.qrBox}>
            <Image source={{ uri: qrUrl }} style={styles.qrImage} resizeMode="contain" />
          </View>

          <Text style={styles.hint}>Bu QR kodni skanerlash orqali boshqalar sizni topishi mumkin</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={onShare}>
              <Text style={styles.actionBtnText}>Ulashish</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={onCopy}>
              <Text style={styles.actionBtnText}>Nusxalash</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.scanContainer}>
          <Text style={styles.scanIcon}>📷</Text>
          <Text style={styles.scanTitle}>QR kodni skanerlang</Text>
          <Text style={styles.scanHint}>
            Boshqa foydalanuvchining QR kodini kamera bilan skanerlang
          </Text>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => Alert.alert("Ma'lumot", "Kamera orqali skanerlash funksiyasi tez orada qo'shiladi")}
          >
            <Text style={styles.scanButtonText}>Kamerani ochish</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 15, color: colors.textSecondary, fontWeight: "500" },
  tabTextActive: { color: colors.primary },
  qrContainer: { flex: 1, alignItems: "center", paddingTop: 32, paddingHorizontal: 24 },
  displayName: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 12 },
  username: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
  qrBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrImage: { width: 220, height: 220 },
  hint: { fontSize: 13, color: colors.textSecondary, textAlign: "center", marginTop: 16, paddingHorizontal: 32 },
  actions: { flexDirection: "row", gap: 12, marginTop: 24 },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  scanContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  scanIcon: { fontSize: 64 },
  scanTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 16 },
  scanHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginTop: 8 },
  scanButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 24,
  },
  scanButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
