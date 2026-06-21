import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Share, Modal, FlatList, Pressable } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../../store/authStore";
import { usersApi } from "../../api/users";
import { authApi } from "../../api/auth";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { uploadPlainFile } from "../../utils/mediaFile";
import { formatBirthday, MAX_DAYS_IN_MONTH, UZ_MONTHS } from "../../utils/birthday";
import { CUSTOM_STATUS_DURATION_OPTIONS, formatCustomStatusDuration, formatCustomStatusExpiry } from "../../utils/customStatusDuration";
import { MainTabScreenProps } from "../../navigation/types";
import { UsernameHistoryEntry } from "../../types";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;
// How often a user may change their username (mirrors the backend limit).
const USERNAME_CHANGE_COOLDOWN_DAYS = 7;

type Props = MainTabScreenProps<"Profile">;

export function ProfileScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [username, setUsername] = useState(user?.username ?? "");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [customStatus, setCustomStatus] = useState(user?.customStatus ?? "");
  const [customStatusClearAfterSeconds, setCustomStatusClearAfterSeconds] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [birthdayModalVisible, setBirthdayModalVisible] = useState(false);
  const [savingBirthday, setSavingBirthday] = useState(false);
  const [pickedDay, setPickedDay] = useState(1);
  const [pickedMonth, setPickedMonth] = useState(1);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [usernameHistoryVisible, setUsernameHistoryVisible] = useState(false);
  const [usernameHistory, setUsernameHistory] = useState<UsernameHistoryEntry[]>([]);
  const [loadingUsernameHistory, setLoadingUsernameHistory] = useState(false);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const trimmed = username.trim();
    if (!USERNAME_PATTERN.test(trimmed) || trimmed === user?.username) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    checkTimer.current = setTimeout(() => {
      authApi
        .checkUsername(trimmed)
        .then((available) => setUsernameStatus(available ? "available" : "taken"))
        .catch(() => setUsernameStatus("idle"));
    }, 500);
    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, [username, user?.username]);

  if (!user) return null;

  const usernameCooldownRemainingDays = (() => {
    if (!user.usernameChangedAt) return 0;
    const cooldownEnds = new Date(user.usernameChangedAt).getTime() + USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((cooldownEnds - Date.now()) / (24 * 60 * 60 * 1000)));
  })();

  const onOpenUsernameHistory = async () => {
    setUsernameHistoryVisible(true);
    setLoadingUsernameHistory(true);
    try {
      const history = await usersApi.getUsernameHistory();
      setUsernameHistory(history);
    } catch {
      setUsernameHistory([]);
    } finally {
      setLoadingUsernameHistory(false);
    }
  };

  const onSave = async () => {
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 24 || !/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      Alert.alert("Xatolik", "Username 3-24 ta belgidan iborat bo'lib, faqat harf, raqam va '_' belgisini o'z ichiga olishi mumkin");
      return;
    }
    if (usernameStatus === "taken") {
      Alert.alert("Xatolik", "Bu username band");
      return;
    }
    setSaving(true);
    try {
      const trimmedStatus = customStatus.trim();
      const statusChanged = trimmedStatus !== (user?.customStatus ?? "");
      await usersApi.updateMe({
        username: trimmedUsername,
        displayName: displayName.trim(),
        bio: bio.trim(),
        ...(statusChanged || customStatusClearAfterSeconds !== null
          ? { customStatus: trimmedStatus, customStatusClearAfterSeconds }
          : {}),
      });
      await refreshProfile();
      Alert.alert("Saqlandi", "Profil yangilandi");
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  const onPickCustomStatusDuration = () => {
    Alert.alert(
      "Holatni tozalash vaqti",
      "Holat avtomatik tozalanadigan vaqtni tanlang",
      CUSTOM_STATUS_DURATION_OPTIONS.map((option) => ({
        text: option.label,
        onPress: () => setCustomStatusClearAfterSeconds(option.value),
      }))
    );
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

  const onShare = () => {
    Share.share({ message: `UzChat'da menga qo'shilish uchun: @${user.username}` }).catch(() => {});
  };

  const onOpenBirthdayPicker = () => {
    setPickedDay(user.birthdayDay ?? 1);
    setPickedMonth(user.birthdayMonth ?? 1);
    setBirthdayModalVisible(true);
  };

  const onSaveBirthday = async () => {
    setSavingBirthday(true);
    try {
      await usersApi.updateMe({ birthdayDay: pickedDay, birthdayMonth: pickedMonth });
      await refreshProfile();
      setBirthdayModalVisible(false);
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Saqlab bo'lmadi");
    } finally {
      setSavingBirthday(false);
    }
  };

  const onClearBirthday = async () => {
    setSavingBirthday(true);
    try {
      await usersApi.updateMe({ birthdayDay: null, birthdayMonth: null });
      await refreshProfile();
      setBirthdayModalVisible(false);
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "O'chirib bo'lmadi");
    } finally {
      setSavingBirthday(false);
    }
  };

  const onLogout = () => {
    Alert.alert("Chiqish", "Hisobdan chiqishni xohlaysizmi?", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "Chiqish", style: "destructive", onPress: () => logout() },
    ]);
  };

  const onDeleteAccount = () => {
    Alert.alert(
      "Hisobni o'chirish",
      "Hisobingiz, suhbatlaringiz va barcha xabarlaringiz butunlay o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi.",
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "Davom etish",
          style: "destructive",
          onPress: () => {
            Alert.prompt(
              "Joriy parolni kiriting",
              "Hisobni butunlay o'chirish uchun parolingizni tasdiqlang",
              async (password) => {
                if (!password) return;
                try {
                  await deleteAccount(password);
                } catch (err: any) {
                  Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Hisobni o'chirib bo'lmadi");
                }
              },
              "secure-text"
            );
          },
        },
      ]
    );
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

      <Text style={styles.label}>Username</Text>
      <View style={styles.usernameInputRow}>
        <Text style={styles.usernamePrefix}>@</Text>
        <TextInput
          style={styles.usernameInput}
          value={username}
          onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, ""))}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={24}
        />
        {usernameStatus === "checking" && <ActivityIndicator size="small" color={colors.textSecondary} />}
        {usernameStatus === "available" && <Text style={[styles.usernameStatusIcon, styles.usernameAvailable]}>✓</Text>}
        {usernameStatus === "taken" && <Text style={[styles.usernameStatusIcon, styles.usernameTaken]}>✕</Text>}
      </View>
      {usernameStatus === "taken" && <Text style={styles.usernameHint}>Bu username band</Text>}
      {usernameStatus === "available" && <Text style={[styles.usernameHint, styles.usernameAvailable]}>Username bo'sh</Text>}
      {usernameCooldownRemainingDays > 0 && (
        <Text style={styles.usernameCooldownHint}>
          Username {USERNAME_CHANGE_COOLDOWN_DAYS} kunda bir marta o'zgartiriladi. Yana {usernameCooldownRemainingDays} kundan
          keyin o'zgartirishingiz mumkin
        </Text>
      )}

      <Text style={styles.label}>Ism</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} maxLength={64} />

      <Text style={styles.label}>Holat</Text>
      <TextInput
        style={styles.input}
        value={customStatus}
        onChangeText={setCustomStatus}
        placeholder="Masalan: 📚 Mashg'ulotda"
        maxLength={70}
      />
      <Text style={styles.charCounter}>{customStatus.length}/70</Text>
      <TouchableOpacity style={styles.statusDurationRow} onPress={onPickCustomStatusDuration}>
        <Text style={styles.statusDurationLabel}>Avtomatik tozalash</Text>
        <Text style={styles.statusDurationValue}>{formatCustomStatusDuration(customStatusClearAfterSeconds)} ›</Text>
      </TouchableOpacity>
      {!!user?.customStatus && user?.customStatusExpiresAt && formatCustomStatusExpiry(user.customStatusExpiresAt) && (
        <Text style={styles.charCounter}>{formatCustomStatusExpiry(user.customStatusExpiresAt)}</Text>
      )}

      <Text style={styles.label}>Bio</Text>
      <TextInput style={[styles.input, styles.bioInput]} value={bio} onChangeText={setBio} multiline maxLength={256} />
      <Text style={styles.charCounter}>{bio.length}/256</Text>

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

      <TouchableOpacity style={styles.menuRow} onPress={onOpenBirthdayPicker}>
        <Text style={styles.menuRowText}>🎂 Tug'ilgan kun</Text>
        <View style={styles.menuRowRight}>
          <Text style={styles.menuRowValue}>{formatBirthday(user.birthdayDay, user.birthdayMonth) ?? "Belgilanmagan"}</Text>
          <Text style={styles.menuRowArrow}>›</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={onOpenUsernameHistory}>
        <Text style={styles.menuRowText}>🕓 Oldingi usernamelar</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={onShare}>
        <Text style={styles.menuRowText}>📤 Profilni ulashish</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("StarredMessages")}>
        <Text style={styles.menuRowText}>⭐ Saqlangan xabarlar</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("MyActivity")}>
        <Text style={styles.menuRowText}>📊 Mening faolligim</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("Mentions")}>
        <Text style={styles.menuRowText}>@ Eslatishlar</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("Reminders")}>
        <Text style={styles.menuRowText}>⏰ Yodga solinganlar</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("BlockedUsers")}>
        <Text style={styles.menuRowText}>🚫 Bloklangan foydalanuvchilar</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("ChangePassword")}>
        <Text style={styles.menuRowText}>🔑 Parolni o'zgartirish</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("ChangePhone")}>
        <Text style={styles.menuRowText}>📱 Telefon raqamni o'zgartirish</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("PrivacySettings")}>
        <Text style={styles.menuRowText}>🕒 Oxirgi marta onlayn</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("NotificationSettings")}>
        <Text style={styles.menuRowText}>🔔 Bildirishnomalar</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("AppLockSettings")}>
        <Text style={styles.menuRowText}>🔐 Ilovani qulflash</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("ThemeSettings")}>
        <Text style={styles.menuRowText}>🎨 Mavzu</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("QRCode")}>
        <Text style={styles.menuRowText}>📱 QR kod</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("DeviceKeys")}>
        <Text style={styles.menuRowText}>🔑 Qurilma kalitlari</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("Wallet")}>
        <Text style={styles.menuRowText}>💰 Hamyon</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("MiniApps")}>
        <Text style={styles.menuRowText}>🧩 Mini-dasturlar</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("Feed")}>
        <Text style={styles.menuRowText}>📰 Yangiliklar</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("Marketplace")}>
        <Text style={styles.menuRowText}>🛒 Bozor</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("SendRedPacket")}>
        <Text style={styles.menuRowText}>🧧 Qizil konvert</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("CallHistory")}>
        <Text style={styles.menuRowText}>📞 Qo'ng'iroqlar tarixi</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("ChatTextSize")}>
        <Text style={styles.menuRowText}>🔤 Matn hajmi</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("QuickReplies")}>
        <Text style={styles.menuRowText}>💬 Tezkor javoblar</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("StorageUsage")}>
        <Text style={styles.menuRowText}>📦 Xotira va kesh</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("FileSecurity")}>
        <Text style={styles.menuRowText}>🛡️ Fayl xavfsizligi</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("AccountDataExport")}>
        <Text style={styles.menuRowText}>📥 Mening ma'lumotlarim</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("TwoFactorSettings")}>
        <Text style={styles.menuRowText}>🛡️ Ikki bosqichli tekshiruv</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("ActiveSessions")}>
        <Text style={styles.menuRowText}>💻 Faol seanslar</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      {user?.isAdmin && (
        <TouchableOpacity style={[styles.menuRow, { borderLeftWidth: 3, borderLeftColor: "#FF3B30" }]} onPress={() => navigation.navigate("AdminDashboard")}>
          <Text style={styles.menuRowText}>🛡️ Admin panel</Text>
          <Text style={styles.menuRowArrow}>›</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("About")}>
        <Text style={styles.menuRowText}>ℹ️ UzChat haqida</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Chiqish</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteAccountButton} onPress={onDeleteAccount}>
        <Text style={styles.deleteAccountText}>Hisobni o'chirish</Text>
      </TouchableOpacity>

      <Modal visible={birthdayModalVisible} transparent animationType="fade" onRequestClose={() => setBirthdayModalVisible(false)}>
        <Pressable style={styles.birthdayBackdrop} onPress={() => setBirthdayModalVisible(false)}>
          <Pressable style={styles.birthdaySheet}>
            <Text style={styles.birthdayTitle}>Tug'ilgan kun</Text>
            <View style={styles.birthdayPickerRow}>
              <FlatList
                data={DAYS.slice(0, MAX_DAYS_IN_MONTH[pickedMonth - 1])}
                keyExtractor={(d) => String(d)}
                style={styles.birthdayPickerColumn}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.birthdayPickerItem, pickedDay === item && styles.birthdayPickerItemSelected]}
                    onPress={() => setPickedDay(item)}
                  >
                    <Text style={[styles.birthdayPickerItemText, pickedDay === item && styles.birthdayPickerItemTextSelected]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
              <FlatList
                data={UZ_MONTHS}
                keyExtractor={(_, i) => String(i)}
                style={styles.birthdayPickerColumn}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => {
                  const month = index + 1;
                  const selected = pickedMonth === month;
                  return (
                    <TouchableOpacity
                      style={[styles.birthdayPickerItem, selected && styles.birthdayPickerItemSelected]}
                      onPress={() => {
                        setPickedMonth(month);
                        const max = MAX_DAYS_IN_MONTH[month - 1];
                        if (pickedDay > max) setPickedDay(max);
                      }}
                    >
                      <Text style={[styles.birthdayPickerItemText, selected && styles.birthdayPickerItemTextSelected]}>{item}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
            <View style={styles.birthdayButtonRow}>
              {(user.birthdayDay != null || user.birthdayMonth != null) && (
                <TouchableOpacity style={styles.birthdayButton} onPress={onClearBirthday} disabled={savingBirthday}>
                  <Text style={styles.birthdayButtonDanger}>O'chirish</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.birthdayButton} onPress={() => setBirthdayModalVisible(false)} disabled={savingBirthday}>
                <Text style={styles.birthdayButtonText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.birthdayButton} onPress={onSaveBirthday} disabled={savingBirthday}>
                {savingBirthday ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={[styles.birthdayButtonText, styles.birthdayButtonPrimary]}>Saqlash</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={usernameHistoryVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUsernameHistoryVisible(false)}
      >
        <Pressable style={styles.birthdayBackdrop} onPress={() => setUsernameHistoryVisible(false)}>
          <Pressable style={styles.birthdaySheet}>
            <Text style={styles.birthdayTitle}>Oldingi usernamelar</Text>
            {loadingUsernameHistory ? (
              <ActivityIndicator color={colors.primary} style={styles.usernameHistoryLoading} />
            ) : usernameHistory.length === 0 ? (
              <Text style={styles.usernameHistoryEmpty}>Username hali o'zgartirilmagan</Text>
            ) : (
              <FlatList
                data={usernameHistory}
                keyExtractor={(item, index) => `${item.oldUsername}-${index}`}
                style={styles.usernameHistoryList}
                renderItem={({ item }) => (
                  <View style={styles.usernameHistoryRow}>
                    <Text style={styles.usernameHistoryName}>@{item.oldUsername}</Text>
                    <Text style={styles.usernameHistoryDate}>
                      {new Date(item.changedAt).toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </Text>
                  </View>
                )}
              />
            )}
            <TouchableOpacity style={styles.birthdayButton} onPress={() => setUsernameHistoryVisible(false)}>
              <Text style={[styles.birthdayButtonText, styles.birthdayButtonPrimary]}>Yopish</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  charCounter: { fontSize: 12, color: colors.textSecondary, textAlign: "right", marginTop: 4 },
  statusDurationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  statusDurationLabel: { fontSize: 14, color: colors.text },
  statusDurationValue: { fontSize: 14, color: colors.textSecondary },
  usernameInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  usernamePrefix: { fontSize: 16, color: colors.textSecondary },
  usernameInput: { flex: 1, fontSize: 16, paddingVertical: 12, color: colors.text },
  usernameStatusIcon: { fontSize: 18, fontWeight: "700" },
  usernameAvailable: { color: colors.online },
  usernameTaken: { color: colors.danger },
  usernameHint: { fontSize: 12, color: colors.danger, marginTop: 4, marginLeft: 4 },
  usernameCooldownHint: { fontSize: 12, color: colors.textSecondary, marginTop: 4, marginLeft: 4 },
  usernameHistoryLoading: { marginVertical: 20 },
  usernameHistoryEmpty: { fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingVertical: 20 },
  usernameHistoryList: { maxHeight: 280 },
  usernameHistoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  usernameHistoryName: { fontSize: 15, color: colors.text, fontWeight: "600" },
  usernameHistoryDate: { fontSize: 13, color: colors.textSecondary },
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
  menuRowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  menuRowValue: { fontSize: 14, color: colors.textSecondary },
  logoutButton: { marginTop: 32, alignItems: "center", paddingVertical: 14 },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: "600" },
  deleteAccountButton: { alignItems: "center", paddingVertical: 14, marginBottom: 16 },
  deleteAccountText: { color: colors.textSecondary, fontSize: 13 },
  birthdayBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  birthdaySheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    width: "80%",
    maxWidth: 320,
  },
  birthdayTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12, textAlign: "center" },
  birthdayPickerRow: { flexDirection: "row", height: 220, gap: 8 },
  birthdayPickerColumn: { flex: 1 },
  birthdayPickerItem: { paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  birthdayPickerItemSelected: { backgroundColor: colors.primary },
  birthdayPickerItemText: { fontSize: 15, color: colors.text },
  birthdayPickerItemTextSelected: { color: "#fff", fontWeight: "700" },
  birthdayButtonRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 16 },
  birthdayButton: { paddingVertical: 10, paddingHorizontal: 8, minWidth: 60, alignItems: "center" },
  birthdayButtonText: { fontSize: 15, color: colors.text },
  birthdayButtonPrimary: { color: colors.primary, fontWeight: "700" },
  birthdayButtonDanger: { fontSize: 15, color: colors.danger },
});
