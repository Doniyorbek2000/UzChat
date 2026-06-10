import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../../store/authStore";
import { usersApi } from "../../api/users";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { uploadPlainFile } from "../../utils/mediaFile";
import { MainTabScreenProps } from "../../navigation/types";

type Props = MainTabScreenProps<"Profile">;

export function ProfileScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const logout = useAuthStore((s) => s.logout);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  if (!user) return null;

  const onSave = async () => {
    setSaving(true);
    try {
      await usersApi.updateMe({ displayName: displayName.trim(), bio: bio.trim() });
      await refreshProfile();
      Alert.alert("Saqlandi", "Profil yangilandi");
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  const onChangeAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Ruxsat kerak", "Avatar tanlash uchun galereyaga ruxsat bering");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const { url } = await uploadPlainFile(asset.uri, asset.mimeType ?? "image/jpeg");
      await usersApi.updateMe({ avatarUrl: url });
      await refreshProfile();
    } catch {
      Alert.alert("Xatolik", "Avatarni yangilab bo'lmadi");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onLogout = () => {
    Alert.alert("Chiqish", "Hisobdan chiqishni xohlaysizmi?", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "Chiqish", style: "destructive", onPress: () => logout() },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onChangeAvatar} disabled={uploadingAvatar}>
          <Avatar uri={user.avatarUrl} name={user.displayName} size={72} />
          {uploadingAvatar && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.username}>@{user.username}</Text>
          <Text style={styles.phone}>{user.phone}</Text>
        </View>
      </View>

      <Text style={styles.label}>Ism</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} />

      <Text style={styles.label}>Bio</Text>
      <TextInput style={[styles.input, styles.bioInput]} value={bio} onChangeText={setBio} multiline />

      <TouchableOpacity style={styles.button} onPress={onSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Saqlash</Text>}
      </TouchableOpacity>

      <View style={styles.securityBox}>
        <Text style={styles.securityTitle}>🔒 End-to-End shifrlash</Text>
        <Text style={styles.securityText}>
          Xabarlaringiz qurilmangizda shifrlanadi va faqat suhbatdoshingiz ochishi mumkin. Server hech qachon
          xabar matnini ko'rmaydi.
        </Text>
      </View>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("StarredMessages")}>
        <Text style={styles.menuRowText}>⭐ Saqlangan xabarlar</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Chiqish</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24, gap: 16 },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: { flex: 1 },
  username: { fontSize: 18, fontWeight: "700", color: colors.text },
  phone: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bioInput: { minHeight: 80, textAlignVertical: "top" },
  button: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  securityBox: { backgroundColor: colors.background, borderRadius: 8, padding: 16, marginTop: 24 },
  securityTitle: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 8 },
  securityText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  menuRowText: { fontSize: 15, color: colors.text },
  menuRowArrow: { fontSize: 18, color: colors.textSecondary },
  logoutButton: { marginTop: 32, alignItems: "center", paddingVertical: 14 },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: "600" },
});
