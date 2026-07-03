import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Share, Alert } from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import * as Clipboard from "expo-clipboard";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { usersApi } from "../../api/users";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "QRCode">;

function getQRImageUrl(data: string, size = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export function QRCodeScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<"my" | "scan">("my");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const onBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (scanned) return;
      setScanned(true);

      const data = result.data;
      const usernameMatch = data.match(/uzchat:\/\/profile\/([a-zA-Z0-9_]+)/);
      if (usernameMatch) {
        const scannedUsername = usernameMatch[1];
        try {
          const results = await usersApi.search(scannedUsername);
          const found = results.find(
            (u: { username: string }) => u.username.toLowerCase() === scannedUsername.toLowerCase()
          );
          if (found) {
            navigation.replace("UserProfile", { userId: found.id });
            return;
          }
        } catch {
          Alert.alert(tr("Xatolik"), tr("Foydalanuvchini qidirib bo'lmadi"), [
            { text: tr("OK"), onPress: () => setScanned(false) },
          ]);
          return;
        }
        Alert.alert(tr("Topilmadi"), `@${scannedUsername} foydalanuvchi topilmadi`, [
          { text: tr("OK"), onPress: () => setScanned(false) },
        ]);
      } else {
        Alert.alert(tr("Noto'g'ri QR kod"), tr("Bu QR kod UzChat profili emas"), [
          { text: tr("OK"), onPress: () => setScanned(false) },
        ]);
      }
    },
    [scanned, navigation]
  );

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
    Alert.alert(tr("Nusxalandi"), tr("Profil havolasi nusxalandi"));
  };

  const renderScanTab = () => {
    if (!permission) {
      return (
        <View style={styles.scanContainer}>
          <Text style={styles.scanHint}>{tr("Kamera ruxsatini tekshirmoqda...")}</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.scanContainer}>
          <Text style={styles.scanIcon}>📷</Text>
          <Text style={styles.scanTitle}>{tr("Kamera ruxsati kerak")}</Text>
          <Text style={styles.scanHint}>
            {tr("QR kodni skanerlash uchun kameraga ruxsat bering")}
          </Text>
          <TouchableOpacity style={styles.scanButton} onPress={requestPermission}>
            <Text style={styles.scanButtonText}>{tr("Ruxsat berish")}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
        />
        <View style={styles.cameraOverlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanInstructions}>
            {tr("QR kodni ramka ichiga joylashtiring")}
          </Text>
        </View>
        {scanned && (
          <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
            <Text style={styles.rescanBtnText}>{tr("Qayta skanerlash")}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === "my" && styles.tabActive]} onPress={() => setTab("my")}>
          <Text style={[styles.tabText, tab === "my" && styles.tabTextActive]}>{tr("Mening QR kodom")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === "scan" && styles.tabActive]} onPress={() => setTab("scan")}>
          <Text style={[styles.tabText, tab === "scan" && styles.tabTextActive]}>{tr("Skanerlash")}</Text>
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

          <Text style={styles.hint}>{tr("Bu QR kodni skanerlash orqali boshqalar sizni topishi mumkin")}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={onShare}>
              <Text style={styles.actionBtnText}>{tr("Ulashish")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={onCopy}>
              <Text style={styles.actionBtnText}>{tr("Nusxalash")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        renderScanTab()
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
    backgroundColor: colors.surface,
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
  cameraContainer: { flex: 1, position: "relative" },
  camera: { flex: 1 },
  cameraOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: colors.primary,
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  scanInstructions: {
    color: "#fff",
    fontSize: 14,
    marginTop: 20,
    textAlign: "center",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  rescanBtn: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  rescanBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
