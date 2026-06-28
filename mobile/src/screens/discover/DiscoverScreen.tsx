import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, RefreshControl } from "react-native";
import { MainTabScreenProps } from "../../navigation/types";
import { colors } from "../../theme/colors";

type Props = MainTabScreenProps<"Discover">;

const SERVICES = [
  { key: "feed", icon: "📰", label: "Yangiliklar", screen: "Feed" as const },
  { key: "marketplace", icon: "🛒", label: "Bozor", screen: "Marketplace" as const },
  { key: "wallet", icon: "💰", label: "Hamyon", screen: "Wallet" as const },
  { key: "miniapps", icon: "📱", label: "Mini-dasturlar", screen: "MiniApps" as const },
  { key: "stories", icon: "📷", label: "Hikoyalar", screen: "Stories" as const },
  { key: "calls", icon: "📞", label: "Qo'ng'iroqlar", screen: "CallHistory" as const },
  { key: "redpacket", icon: "🧧", label: "Qizil konvert", screen: "SendRedPacket" as const },
  { key: "stickers", icon: "🎨", label: "Stikerlar", screen: "StickerStore" as const },
  { key: "nearby", icon: "📍", label: "Yaqin odamlar", screen: "NearbyPeople" as const },
  { key: "bots", icon: "🤖", label: "Botlar", screen: "BotStore" as const },
  { key: "contacts", icon: "👥", label: "Kontaktlar", screen: "Contacts" as const },
  { key: "voicerooms", icon: "🎙️", label: "Ovozli xonalar", screen: "VoiceRooms" as const },
  { key: "livestreams", icon: "📡", label: "Jonli efirlar", screen: "LiveStreams" as const },
  { key: "themes", icon: "🎨", label: "Mavzular", screen: "ThemeStore" as const },
  { key: "communities", icon: "🏘️", label: "Jamiyatlar", screen: "Communities" as const },
  { key: "events", icon: "📅", label: "Tadbirlar", screen: "Events" as const },
  { key: "search", icon: "🔍", label: "Qidiruv", screen: "GlobalSearch" as const },
  { key: "subscriptions", icon: "📢", label: "Obunalar", screen: "MySubscriptions" as const },
  { key: "music", icon: "🎵", label: "Musiqa", screen: "MusicPlayer" as const },
  { key: "games", icon: "🎮", label: "O'yinlar", screen: "GameCenter" as const },
  { key: "cloud", icon: "☁️", label: "Bulut xotira", screen: "CloudStorage" as const },
  { key: "referrals", icon: "🎁", label: "Taklifnoma", screen: "Referrals" as const },
  { key: "business", icon: "💼", label: "Biznes profil", screen: "BusinessProfile" as const },
  { key: "gifts", icon: "🎁", label: "Sovg'alar", screen: "Gifts" as const },
  { key: "greetings", icon: "💌", label: "Tabrik kartochkalari", screen: "GreetingCards" as const },
  { key: "badges", icon: "🏅", label: "Belgilar", screen: "Badges" as const },
  { key: "loyalty", icon: "💎", label: "Sodiqlik ballari", screen: "Loyalty" as const },
  { key: "faq", icon: "❓", label: "Yordam", screen: "Faq" as const },
  { key: "wishlist", icon: "❤️", label: "Istaklar", screen: "Wishlist" as const },
];

const PLATFORM_SERVICES = [
  { key: "taxi", icon: "🚕", label: "Taksi" },
  { key: "hotels", icon: "🏨", label: "Mehmonxonalar" },
  { key: "food", icon: "🍽️", label: "Ovqatlanish" },
  { key: "doctors", icon: "👨‍⚕️", label: "Shifokor" },
  { key: "pharmacy", icon: "💊", label: "Dorixona" },
  { key: "shopping", icon: "🛍️", label: "Xaridlar" },
  { key: "news", icon: "📡", label: "Yangiliklar" },
];

const QUICK_ACTIONS = [
  { key: "qr", icon: "📱", label: "QR kod skaneri", screen: "QRCode" as const },
  { key: "qrpay", icon: "💳", label: "QR to'lov", screen: "QRPayment" as const },
  { key: "broadcast", icon: "📢", label: "Tarqatish ro'yxatlari", screen: "BroadcastLists" as const },
  { key: "starred", icon: "⭐", label: "Saqlangan xabarlar", screen: "StarredMessages" as const },
  { key: "mentions", icon: "📌", label: "Eslatishlar", screen: "Mentions" as const },
  { key: "redpacket", icon: "🧧", label: "Konvert ochish", screen: "ClaimRedPacket" as const },
  { key: "reminders", icon: "⏰", label: "Yodga solinganlar", screen: "Reminders" as const },
  { key: "bookmarks", icon: "🔖", label: "Xatcho'plar", screen: "Bookmarks" as const },
  { key: "notes", icon: "📝", label: "Eslatmalar", screen: "Notes" as const },
  { key: "exports", icon: "📤", label: "Eksportlar", screen: "ChatExports" as const },
  { key: "notiflog", icon: "🔔", label: "Bildirishnomalar tarixi", screen: "NotificationLog" as const },
];

const FEATURED = [
  { key: "wallet", icon: "💰", title: "UzChat Hamyon", desc: "Pul yuborish va qabul qilish", color: "#007AFF", screen: "Wallet" as const },
  { key: "marketplace", icon: "🛒", title: "Bozor", desc: "Mahsulotlarni sotib oling", color: "#34C759", screen: "Marketplace" as const },
  { key: "games", icon: "🎮", title: "O'yinlar", desc: "Do'stlar bilan o'ynang", color: colors.warning, screen: "GameCenter" as const },
];

export function DiscoverScreen({ navigation }: Props) {
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const allItems = [...SERVICES, ...PLATFORM_SERVICES, ...QUICK_ACTIONS];
  const filtered = search.trim()
    ? allItems.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
    : null;

  const handlePress = (item: { screen?: string; key: string }) => {
    if (item.screen) {
      if (item.screen === "ClaimRedPacket") {
        navigation.navigate("ClaimRedPacket", {});
      } else {
        navigation.navigate(item.screen as any);
      }
    } else {
      navigation.navigate("MiniApps");
    }
  };

  return (
    <ScrollView keyboardDismissMode="on-drag"       style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Qidirish..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {filtered ? (
        <View style={styles.grid}>
          {filtered.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={styles.serviceCard}
              onPress={() => handlePress(s)}
            >
              <Text style={styles.serviceIcon}>{s.icon}</Text>
              <Text style={styles.serviceLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && (
            <Text style={styles.emptyText}>Natija topilmadi</Text>
          )}
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredScroll} contentContainerStyle={styles.featuredContainer}>
            {FEATURED.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.featuredCard, { backgroundColor: f.color }]}
                onPress={() => navigation.navigate(f.screen as any)}
              >
                <Text style={styles.featuredIcon}>{f.icon}</Text>
                <Text style={styles.featuredTitle}>{f.title}</Text>
                <Text style={styles.featuredDesc}>{f.desc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Xizmatlar</Text>
          <View style={styles.grid}>
            {SERVICES.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={styles.serviceCard}
                onPress={() => navigation.navigate(s.screen as any)}
              >
                <Text style={styles.serviceIcon}>{s.icon}</Text>
                <Text style={styles.serviceLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Platform xizmatlari</Text>
          <View style={styles.grid}>
            {PLATFORM_SERVICES.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={styles.serviceCard}
                onPress={() => navigation.navigate("MiniApps")}
              >
                <Text style={styles.serviceIcon}>{s.icon}</Text>
                <Text style={styles.serviceLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Tezkor harakatlar</Text>
          <View style={styles.menuList}>
            {QUICK_ACTIONS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={styles.menuItem}
                onPress={() => handlePress(s)}
              >
                <Text style={styles.menuIcon}>{s.icon}</Text>
                <Text style={styles.menuLabel}>{s.label}</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16 },
  searchContainer: { marginBottom: 12 },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuredScroll: { marginBottom: 8 },
  featuredContainer: { gap: 10, paddingRight: 4 },
  featuredCard: { width: 160, borderRadius: 16, padding: 16, justifyContent: "flex-end", height: 120 },
  featuredIcon: { fontSize: 28, marginBottom: 8 },
  featuredTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  featuredDesc: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 12, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  serviceCard: {
    width: "30%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceIcon: { fontSize: 28, marginBottom: 6 },
  serviceLabel: { fontSize: 12, fontWeight: "600", color: colors.text, textAlign: "center" },
  menuList: { marginTop: 4 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  menuIcon: { fontSize: 20 },
  menuLabel: { flex: 1, fontSize: 15, color: colors.text, fontWeight: "500" },
  menuArrow: { fontSize: 18, color: colors.textSecondary },
  emptyText: { textAlign: "center", color: colors.textSecondary, fontSize: 15, padding: 20 },
});
