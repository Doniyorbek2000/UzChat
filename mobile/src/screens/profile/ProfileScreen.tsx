import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Share, Modal, FlatList, Pressable, ScrollView } from "react-native";
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
const USERNAME_CHANGE_COOLDOWN_DAYS = 7;

type Props = MainTabScreenProps<"Profile">;

type MenuItem = {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  badge?: string;
  value?: string;
};

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

  const renderMenuIcon = (icon: string, bgColor: string) => (
    <View style={[styles.menuIconBg, { backgroundColor: bgColor + "18" }]}>
      <Text style={styles.menuIconEmoji}>{icon}</Text>
    </View>
  );

  const renderMenuRow = (item: MenuItem) => (
    <TouchableOpacity key={item.label} style={styles.menuRow} onPress={item.onPress} activeOpacity={0.6}>
      {renderMenuIcon(item.icon, item.color)}
      <Text style={styles.menuRowText}>{item.label}</Text>
      {item.badge && <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{item.badge}</Text></View>}
      {item.value && <Text style={styles.menuRowValue}>{item.value}</Text>}
      <Text style={styles.menuRowArrow}>›</Text>
    </TouchableOpacity>
  );

  const renderMenuGroup = (title: string, items: MenuItem[]) => (
    <View style={styles.menuGroup}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.menuCard}>
        {items.map((item, i) => (
          <View key={item.label}>
            {renderMenuRow(item)}
            {i < items.length - 1 && <View style={styles.menuDivider} />}
          </View>
        ))}
      </View>
    </View>
  );

  const personalItems: MenuItem[] = [
    { icon: "🎂", label: "Tug'ilgan kun", color: "#FF9500", onPress: onOpenBirthdayPicker, value: formatBirthday(user.birthdayDay, user.birthdayMonth) ?? "Belgilanmagan" },
    { icon: "🕓", label: "Oldingi usernamelar", color: "#8E8E93", onPress: onOpenUsernameHistory },
    { icon: "📤", label: "Profilni ulashish", color: "#007AFF", onPress: onShare },
    { icon: "⭐", label: "Saqlangan xabarlar", color: "#FF9500", onPress: () => navigation.navigate("StarredMessages") },
    { icon: "📊", label: "Mening faolligim", color: "#5856D6", onPress: () => navigation.navigate("MyActivity") },
    { icon: "@", label: "Eslatishlar", color: "#007AFF", onPress: () => navigation.navigate("Mentions") },
    { icon: "⏰", label: "Yodga solinganlar", color: "#FF3B30", onPress: () => navigation.navigate("Reminders") },
    { icon: "🚫", label: "Bloklangan foydalanuvchilar", color: "#FF3B30", onPress: () => navigation.navigate("BlockedUsers") },
  ];

  const securityItems: MenuItem[] = [
    { icon: "🔑", label: "Parolni o'zgartirish", color: "#FF9500", onPress: () => navigation.navigate("ChangePassword") },
    { icon: "📱", label: "Telefon raqamni o'zgartirish", color: "#34C759", onPress: () => navigation.navigate("ChangePhone") },
    { icon: "🕒", label: "Oxirgi marta onlayn", color: "#5856D6", onPress: () => navigation.navigate("PrivacySettings") },
    { icon: "🛡️", label: "Ikki bosqichli tekshiruv", color: "#007AFF", onPress: () => navigation.navigate("TwoFactorSettings") },
    { icon: "💻", label: "Faol seanslar", color: "#32ADE6", onPress: () => navigation.navigate("ActiveSessions") },
  ];

  const settingsItems: MenuItem[] = [
    { icon: "🔔", label: "Bildirishnomalar", color: "#FF3B30", onPress: () => navigation.navigate("NotificationSettings") },
    { icon: "🔐", label: "Ilovani qulflash", color: "#FF9500", onPress: () => navigation.navigate("AppLockSettings") },
    { icon: "🎨", label: "Mavzu", color: "#AF52DE", onPress: () => navigation.navigate("ThemeSettings") },
    { icon: "📱", label: "QR kod", color: "#007AFF", onPress: () => navigation.navigate("QRCode") },
    { icon: "🔑", label: "Qurilma kalitlari", color: "#8E8E93", onPress: () => navigation.navigate("DeviceKeys") },
    { icon: "🔤", label: "Matn hajmi", color: "#34C759", onPress: () => navigation.navigate("ChatTextSize") },
  ];

  const servicesItems: MenuItem[] = [
    { icon: "💰", label: "Hamyon", color: "#007AFF", onPress: () => navigation.navigate("Wallet") },
    { icon: "🧩", label: "Mini-dasturlar", color: "#5856D6", onPress: () => navigation.navigate("MiniApps") },
    { icon: "📰", label: "Yangiliklar", color: "#32ADE6", onPress: () => navigation.navigate("Feed") },
    { icon: "🛒", label: "Bozor", color: "#34C759", onPress: () => navigation.navigate("Marketplace") },
    { icon: "🧧", label: "Qizil konvert", color: "#FF3B30", onPress: () => navigation.navigate("SendRedPacket") },
    { icon: "📞", label: "Qo'ng'iroqlar tarixi", color: "#32ADE6", onPress: () => navigation.navigate("CallHistory") },
    { icon: "💬", label: "Tezkor javoblar", color: "#007AFF", onPress: () => navigation.navigate("QuickReplies") },
    { icon: "📦", label: "Xotira va kesh", color: "#FF9500", onPress: () => navigation.navigate("StorageUsage") },
    { icon: "🛡️", label: "Fayl xavfsizligi", color: "#FF3B30", onPress: () => navigation.navigate("FileSecurity") },
    { icon: "📥", label: "Mening ma'lumotlarim", color: "#5856D6", onPress: () => navigation.navigate("AccountDataExport") },
  ];

  const extraItems: MenuItem[] = [
    { icon: "💬", label: "Avtomatik javob", color: "#007AFF", onPress: () => navigation.navigate("AutoReplySettings") },
    { icon: "💼", label: "Biznes profil", color: "#34C759", onPress: () => navigation.navigate("BusinessProfile") },
    { icon: "☁️", label: "Bulut xotira", color: "#32ADE6", onPress: () => navigation.navigate("CloudStorage") },
    { icon: "🎁", label: "Taklifnoma", color: "#FF9500", onPress: () => navigation.navigate("Referrals") },
    { icon: "🏅", label: "Belgilar", color: "#FF9500", onPress: () => navigation.navigate("Badges") },
    { icon: "🎀", label: "Sovg'alar", color: "#FF2D55", onPress: () => navigation.navigate("Gifts") },
    { icon: "💎", label: "Sodiqlik ballari", color: "#AF52DE", onPress: () => navigation.navigate("Loyalty") },
    { icon: "🔔", label: "Bildirishnomalar tarixi", color: "#FF3B30", onPress: () => navigation.navigate("NotificationLog") },
    { icon: "❓", label: "Yordam markazi", color: "#8E8E93", onPress: () => navigation.navigate("Faq") },
    { icon: "ℹ️", label: "UzChat haqida", color: "#007AFF", onPress: () => navigation.navigate("About") },
  ];

  return (
    <ScrollView keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.profileCard}>
        <TouchableOpacity onPress={onChangeAvatar} disabled={uploadingAvatar} style={styles.avatarContainer}>
          <Avatar uri={user.avatarUrl} name={user.displayName} size={80} />
          {uploadingAvatar ? (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditIcon}>📷</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.profileName}>{user.displayName}</Text>
        <Text style={styles.profileUsername}>@{user.username}</Text>
        {user.customStatus ? <Text style={styles.profileStatus}>{user.customStatus}</Text> : null}
        <Text style={styles.profilePhone}>{user.phone}</Text>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate("Stories")}>
          <View style={[styles.quickActionIconBg, { backgroundColor: "#FF9500" + "18" }]}>
            <Text style={styles.quickActionIcon}>📷</Text>
          </View>
          <Text style={styles.quickActionLabel}>Hikoyalar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate("Contacts")}>
          <View style={[styles.quickActionIconBg, { backgroundColor: "#5856D6" + "18" }]}>
            <Text style={styles.quickActionIcon}>👥</Text>
          </View>
          <Text style={styles.quickActionLabel}>Kontaktlar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate("Wallet")}>
          <View style={[styles.quickActionIconBg, { backgroundColor: "#007AFF" + "18" }]}>
            <Text style={styles.quickActionIcon}>💰</Text>
          </View>
          <Text style={styles.quickActionLabel}>Hamyon</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={onShare}>
          <View style={[styles.quickActionIconBg, { backgroundColor: "#34C759" + "18" }]}>
            <Text style={styles.quickActionIcon}>📤</Text>
          </View>
          <Text style={styles.quickActionLabel}>Ulashish</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.editCard}>
        <Text style={styles.editCardTitle}>Profilni tahrirlash</Text>

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
            Username {USERNAME_CHANGE_COOLDOWN_DAYS} kunda bir marta o'zgartiriladi. Yana {usernameCooldownRemainingDays} kundan keyin o'zgartirishingiz mumkin
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
          placeholderTextColor={colors.textSecondary}
          maxLength={70}
        />
        <View style={styles.statusRow}>
          <Text style={styles.charCounter}>{customStatus.length}/70</Text>
          <TouchableOpacity onPress={onPickCustomStatusDuration}>
            <Text style={styles.statusDurationValue}>{formatCustomStatusDuration(customStatusClearAfterSeconds)} ›</Text>
          </TouchableOpacity>
        </View>
        {!!user?.customStatus && user?.customStatusExpiresAt && formatCustomStatusExpiry(user.customStatusExpiresAt) && (
          <Text style={styles.statusExpiryText}>{formatCustomStatusExpiry(user.customStatusExpiresAt)}</Text>
        )}

        <Text style={styles.label}>Bio</Text>
        <TextInput style={[styles.input, styles.bioInput]} value={bio} onChangeText={setBio} multiline maxLength={256} />
        <Text style={styles.charCounter}>{bio.length}/256</Text>

        <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={saving} activeOpacity={0.7}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Saqlash</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.securityBanner}>
        <View style={[styles.menuIconBg, { backgroundColor: "#34C759" + "18" }]}>
          <Text style={styles.menuIconEmoji}>🔒</Text>
        </View>
        <View style={styles.securityBannerText}>
          <Text style={styles.securityTitle}>End-to-End shifrlash</Text>
          <Text style={styles.securityDesc}>Xabarlaringiz qurilmangizda shifrlanadi va faqat suhbatdoshingiz ochishi mumkin</Text>
        </View>
      </View>

      {renderMenuGroup("Shaxsiy", personalItems)}
      {renderMenuGroup("Xavfsizlik", securityItems)}
      {renderMenuGroup("Sozlamalar", settingsItems)}
      {renderMenuGroup("Xizmatlar", servicesItems)}
      {renderMenuGroup("Qo'shimcha", extraItems)}

      {user?.isAdmin && (
        <View style={styles.menuGroup}>
          <Text style={styles.sectionTitle}>Boshqaruv</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("AdminDashboard")} activeOpacity={0.6}>
              <View style={[styles.menuIconBg, { backgroundColor: "#FF3B30" + "18" }]}>
                <Text style={styles.menuIconEmoji}>🛡️</Text>
              </View>
              <Text style={styles.menuRowText}>Admin panel</Text>
              <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>ADMIN</Text></View>
              <Text style={styles.menuRowArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.6}>
        <Text style={styles.logoutText}>Chiqish</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteAccountButton} onPress={onDeleteAccount} activeOpacity={0.6}>
        <Text style={styles.deleteAccountText}>Hisobni o'chirish</Text>
      </TouchableOpacity>

      <Modal visible={birthdayModalVisible} transparent animationType="fade" onRequestClose={() => setBirthdayModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setBirthdayModalVisible(false)}>
          <Pressable style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Tug'ilgan kun</Text>
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
            <View style={styles.modalButtonRow}>
              {(user.birthdayDay != null || user.birthdayMonth != null) && (
                <TouchableOpacity style={styles.modalBtn} onPress={onClearBirthday} disabled={savingBirthday}>
                  <Text style={styles.modalBtnDanger}>O'chirish</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.modalBtn} onPress={() => setBirthdayModalVisible(false)} disabled={savingBirthday}>
                <Text style={styles.modalBtnText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={onSaveBirthday} disabled={savingBirthday}>
                {savingBirthday ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={[styles.modalBtnText, styles.modalBtnPrimary]}>Saqlash</Text>
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
        <Pressable style={styles.modalBackdrop} onPress={() => setUsernameHistoryVisible(false)}>
          <Pressable style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Oldingi usernamelar</Text>
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
            <TouchableOpacity style={styles.modalBtn} onPress={() => setUsernameHistoryVisible(false)}>
              <Text style={[styles.modalBtnText, styles.modalBtnPrimary]}>Yopish</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { paddingBottom: 40 },
  profileCard: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  avatarContainer: { position: "relative", marginBottom: 12 },
  avatarOverlay: {
    ...(StyleSheet.absoluteFill as object),
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarEditIcon: { fontSize: 13 },
  profileName: { fontSize: 22, fontWeight: "700", color: colors.text },
  profileUsername: { fontSize: 15, color: colors.textSecondary, marginTop: 2 },
  profileStatus: { fontSize: 14, color: colors.primary, marginTop: 6 },
  profilePhone: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  quickAction: { alignItems: "center", gap: 6 },
  quickActionIconBg: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  quickActionIcon: { fontSize: 20 },
  quickActionLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "500" },
  editCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  editCardTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 16 },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, marginTop: 12, fontWeight: "500" },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bioInput: { minHeight: 80, textAlignVertical: "top" },
  charCounter: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  statusDurationValue: { fontSize: 13, color: colors.primary, fontWeight: "500" },
  statusExpiryText: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  usernameInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  usernamePrefix: { fontSize: 16, color: colors.textSecondary },
  usernameInput: { flex: 1, fontSize: 15, paddingVertical: 12, color: colors.text },
  usernameStatusIcon: { fontSize: 18, fontWeight: "700" },
  usernameAvailable: { color: colors.online },
  usernameTaken: { color: colors.danger },
  usernameHint: { fontSize: 12, color: colors.danger, marginTop: 4, marginLeft: 4 },
  usernameCooldownHint: { fontSize: 12, color: colors.textSecondary, marginTop: 4, marginLeft: 4 },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  securityBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  securityBannerText: { flex: 1 },
  securityTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  securityDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 3, lineHeight: 17 },
  menuGroup: { marginTop: 8, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  menuIconBg: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconEmoji: { fontSize: 17 },
  menuRowText: { flex: 1, fontSize: 15, color: colors.text },
  menuRowArrow: { fontSize: 18, color: colors.textSecondary },
  menuRowValue: { fontSize: 14, color: colors.textSecondary, marginRight: 4 },
  menuBadge: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  menuBadgeText: { fontSize: 11, fontWeight: "600", color: "#fff" },
  menuDivider: { height: 1, backgroundColor: colors.border, marginLeft: 60 },
  adminBadge: { backgroundColor: colors.danger, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  adminBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  logoutButton: {
    marginTop: 24,
    marginHorizontal: 16,
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: "600" },
  deleteAccountButton: { alignItems: "center", paddingVertical: 14, marginBottom: 16 },
  deleteAccountText: { color: colors.textSecondary, fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    width: "85%",
    maxWidth: 340,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 16, textAlign: "center" },
  birthdayPickerRow: { flexDirection: "row", height: 220, gap: 8 },
  birthdayPickerColumn: { flex: 1 },
  birthdayPickerItem: { paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  birthdayPickerItemSelected: { backgroundColor: colors.primary },
  birthdayPickerItemText: { fontSize: 15, color: colors.text },
  birthdayPickerItemTextSelected: { color: "#fff", fontWeight: "700" },
  modalButtonRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 16 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 12, minWidth: 70, alignItems: "center" },
  modalBtnText: { fontSize: 15, color: colors.text },
  modalBtnPrimary: { color: colors.primary, fontWeight: "700" },
  modalBtnDanger: { fontSize: 15, color: colors.danger },
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
});
