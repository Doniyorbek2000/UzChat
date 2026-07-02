import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, RefreshControl } from "react-native";
import { MainTabScreenProps } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

type Props = MainTabScreenProps<"Discover">;

const ESSENTIAL_SERVICES = [
  { key: "wallet", icon: "💰", label: tr("Hamyon"), screen: "Wallet" as const, color: "#007AFF" },
  { key: "marketplace", icon: "🛒", label: tr("Bozor"), screen: "Marketplace" as const, color: "#34C759" },
  { key: "contacts", icon: "👥", label: tr("Kontaktlar"), screen: "Contacts" as const, color: "#5856D6" },
  { key: "calls", icon: "📞", label: tr("Qo'ng'iroqlar"), screen: "CallHistory" as const, color: "#32ADE6" },
];

const SOCIAL = [
  { key: "feed", icon: "📰", label: tr("Yangiliklar"), screen: "Feed" as const },
  { key: "stories", icon: "📷", label: tr("Hikoyalar"), screen: "Stories" as const },
  { key: "voicerooms", icon: "🎙️", label: tr("Ovozli xonalar"), screen: "VoiceRooms" as const },
  { key: "livestreams", icon: "📡", label: tr("Jonli efirlar"), screen: "LiveStreams" as const },
  { key: "communities", icon: "🏘️", label: tr("Jamiyatlar"), screen: "Communities" as const },
  { key: "events", icon: "📅", label: tr("Tadbirlar"), screen: "Events" as const },
  { key: "nearby", icon: "📍", label: tr("Yaqin odamlar"), screen: "NearbyPeople" as const },
  { key: "subscriptions", icon: "📢", label: tr("Obunalar"), screen: "MySubscriptions" as const },
];

const ENTERTAINMENT = [
  { key: "music", icon: "🎵", label: tr("Musiqa"), screen: "MusicPlayer" as const },
  { key: "games", icon: "🎮", label: tr("O'yinlar"), screen: "GameCenter" as const },
  { key: "stickers", icon: "🎨", label: tr("Stikerlar"), screen: "StickerStore" as const },
  { key: "themes", icon: "🎨", label: tr("Mavzular"), screen: "ThemeStore" as const },
  { key: "greetings", icon: "💌", label: tr("Tabriklar"), screen: "GreetingCards" as const },
  { key: "gifts", icon: "🎁", label: tr("Sovg'alar"), screen: "Gifts" as const },
];

const TOOLS = [
  { key: "miniapps", icon: "📱", label: tr("Mini-dasturlar"), screen: "MiniApps" as const },
  { key: "bots", icon: "🤖", label: tr("Botlar"), screen: "BotStore" as const },
  { key: "cloud", icon: "☁️", label: tr("Bulut xotira"), screen: "CloudStorage" as const },
  { key: "search", icon: "🔍", label: tr("Qidiruv"), screen: "GlobalSearch" as const },
  { key: "redpacket", icon: "🧧", label: tr("Qizil konvert"), screen: "SendRedPacket" as const },
  { key: "business", icon: "💼", label: tr("Biznes profil"), screen: "BusinessProfile" as const },
  { key: "referrals", icon: "🎁", label: tr("Taklifnoma"), screen: "Referrals" as const },
  { key: "badges", icon: "🏅", label: tr("Belgilar"), screen: "Badges" as const },
  { key: "loyalty", icon: "💎", label: tr("Sodiqlik"), screen: "Loyalty" as const },
  { key: "wishlist", icon: "❤️", label: tr("Istaklar"), screen: "Wishlist" as const },
  { key: "faq", icon: "❓", label: tr("Yordam"), screen: "Faq" as const },
];

const PLATFORM_SERVICES = [
  { key: "taxi", icon: "🚕", label: tr("Taksi"), category: "transport" },
  { key: "hotels", icon: "🏨", label: tr("Mehmonxonalar"), category: "travel" },
  { key: "food", icon: "🍽️", label: tr("Ovqatlanish"), category: "food" },
  { key: "doctors", icon: "👨‍⚕️", label: tr("Shifokor"), category: "health" },
  { key: "pharmacy", icon: "💊", label: tr("Dorixona"), category: "health" },
  { key: "shopping", icon: "🛍️", label: tr("Xaridlar"), category: "shopping" },
  { key: "news", icon: "📡", label: tr("Yangiliklar"), category: "news" },
];

const QUICK_ACTIONS = [
  { key: "qr", icon: "📱", label: tr("QR kod skaneri"), screen: "QRCode" as const },
  { key: "qrpay", icon: "💳", label: tr("QR to'lov"), screen: "QRPayment" as const },
  { key: "broadcast", icon: "📢", label: tr("Tarqatish ro'yxatlari"), screen: "BroadcastLists" as const },
  { key: "starred", icon: "⭐", label: tr("Saqlangan xabarlar"), screen: "StarredMessages" as const },
  { key: "mentions", icon: "📌", label: tr("Eslatishlar"), screen: "Mentions" as const },
  { key: "redpacket", icon: "🧧", label: tr("Konvert ochish"), screen: "ClaimRedPacket" as const },
  { key: "reminders", icon: "⏰", label: tr("Yodga solinganlar"), screen: "Reminders" as const },
  { key: "bookmarks", icon: "🔖", label: tr("Xatcho'plar"), screen: "Bookmarks" as const },
  { key: "notes", icon: "📝", label: tr("Eslatmalar"), screen: "Notes" as const },
  { key: "notiflog", icon: "🔔", label: tr("Bildirishnomalar tarixi"), screen: "NotificationLog" as const },
];

const FEATURED = [
  { key: "wallet", icon: "💰", title: tr("UzChat Hamyon"), desc: tr("Pul yuborish va qabul qilish"), color: "#007AFF", screen: "Wallet" as const },
  { key: "marketplace", icon: "🛒", title: tr("Bozor"), desc: tr("Mahsulotlarni sotib oling"), color: "#34C759", screen: "Marketplace" as const },
  { key: "games", icon: "🎮", title: tr("O'yinlar"), desc: tr("Do'stlar bilan o'ynang"), color: colors.warning, screen: "GameCenter" as const },
  { key: "music", icon: "🎵", title: tr("Musiqa"), desc: tr("Sevimli qo'shiqlarni tinglang"), color: "#AF52DE", screen: "MusicPlayer" as const },
];

export function DiscoverScreen({ navigation }: Props) {
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setSearch("");
    setTimeout(() => setRefreshing(false), 300);
  };

  const allItems = [
    ...ESSENTIAL_SERVICES, ...SOCIAL, ...ENTERTAINMENT, ...TOOLS,
    ...PLATFORM_SERVICES.map((p) => ({ ...p, screen: undefined })),
    ...QUICK_ACTIONS,
  ];
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
    <ScrollView keyboardDismissMode="on-drag" style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={tr("Xizmat yoki dastur qidirish...")}
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {filtered ? (
        <View style={styles.searchResults}>
          <Text style={styles.searchResultCount}>{filtered.length} ta natija</Text>
          <View style={styles.grid}>
            {filtered.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={styles.serviceCard}
                onPress={() => handlePress(s)}
              >
                <View style={styles.serviceIconBg}>
                  <Text style={styles.serviceIcon}>{s.icon}</Text>
                </View>
                <Text style={styles.serviceLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {filtered.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>{tr("Natija topilmadi")}</Text>
              <Text style={styles.emptyHint}>{tr("Boshqa kalit so'z bilan qidiring")}</Text>
            </View>
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

          <View style={styles.essentialRow}>
            {ESSENTIAL_SERVICES.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={styles.essentialCard}
                onPress={() => navigation.navigate(s.screen as any)}
              >
                <View style={[styles.essentialIconBg, { backgroundColor: s.color + "18" }]}>
                  <Text style={styles.essentialIcon}>{s.icon}</Text>
                </View>
                <Text style={styles.essentialLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{tr("Ijtimoiy")}</Text>
          <View style={styles.grid}>
            {SOCIAL.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={styles.serviceCard}
                onPress={() => navigation.navigate(s.screen as any)}
              >
                <View style={styles.serviceIconBg}>
                  <Text style={styles.serviceIcon}>{s.icon}</Text>
                </View>
                <Text style={styles.serviceLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{tr("Ko'ngilochar")}</Text>
          <View style={styles.grid}>
            {ENTERTAINMENT.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={styles.serviceCard}
                onPress={() => navigation.navigate(s.screen as any)}
              >
                <View style={styles.serviceIconBg}>
                  <Text style={styles.serviceIcon}>{s.icon}</Text>
                </View>
                <Text style={styles.serviceLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{tr("Asboblar va xizmatlar")}</Text>
          <View style={styles.grid}>
            {TOOLS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={styles.serviceCard}
                onPress={() => navigation.navigate(s.screen as any)}
              >
                <View style={styles.serviceIconBg}>
                  <Text style={styles.serviceIcon}>{s.icon}</Text>
                </View>
                <Text style={styles.serviceLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{tr("Platform xizmatlari")}</Text>
          <Text style={styles.sectionSubtitle}>{tr("Mini-dasturlar orqali ishlaydi")}</Text>
          <View style={styles.grid}>
            {PLATFORM_SERVICES.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={styles.serviceCard}
                onPress={() => navigation.navigate("MiniApps")}
              >
                <View style={styles.serviceIconBg}>
                  <Text style={styles.serviceIcon}>{s.icon}</Text>
                </View>
                <Text style={styles.serviceLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{tr("Tezkor harakatlar")}</Text>
          <View style={styles.menuList}>
            {QUICK_ACTIONS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={styles.menuItem}
                onPress={() => handlePress(s)}
              >
                <View style={styles.menuIconBg}>
                  <Text style={styles.menuIcon}>{s.icon}</Text>
                </View>
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
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 24 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, height: "100%", padding: 0 },
  searchClear: { fontSize: 16, color: colors.textSecondary, paddingHorizontal: 4 },
  searchResults: { paddingHorizontal: 16 },
  searchResultCount: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  featuredScroll: { marginBottom: 16 },
  featuredContainer: { gap: 12, paddingHorizontal: 16 },
  featuredCard: { width: 160, borderRadius: 16, padding: 16, justifyContent: "flex-end", height: 130 },
  featuredIcon: { fontSize: 32, marginBottom: 8 },
  featuredTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  featuredDesc: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 3 },
  essentialRow: { flexDirection: "row", marginHorizontal: 16, gap: 10, marginBottom: 20 },
  essentialCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 14, alignItems: "center", gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  essentialIconBg: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  essentialIcon: { fontSize: 22 },
  essentialLabel: { fontSize: 12, fontWeight: "600", color: colors.text, textAlign: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 8, marginBottom: 4, paddingHorizontal: 16 },
  sectionSubtitle: { fontSize: 12, color: colors.textSecondary, paddingHorizontal: 16, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8, paddingHorizontal: 16, marginTop: 8 },
  serviceCard: {
    width: "22%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  serviceIconBg: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  serviceIcon: { fontSize: 24 },
  serviceLabel: { fontSize: 11, fontWeight: "600", color: colors.text, textAlign: "center" },
  menuList: { marginTop: 4, paddingHorizontal: 16 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  menuIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  menuIcon: { fontSize: 18 },
  menuLabel: { flex: 1, fontSize: 15, color: colors.text, fontWeight: "500" },
  menuArrow: { fontSize: 18, color: colors.textSecondary },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
  emptyHint: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
});
