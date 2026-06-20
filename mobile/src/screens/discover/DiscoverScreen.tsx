import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from "react-native";
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
];

const PLATFORM_SERVICES = [
  { key: "taxi", icon: "🚕", label: "Taksi" },
  { key: "hotels", icon: "🏨", label: "Mehmonxonalar" },
  { key: "food", icon: "🍽️", label: "Ovqatlanish" },
  { key: "doctors", icon: "👨‍⚕️", label: "Shifokor" },
  { key: "pharmacy", icon: "💊", label: "Dorixona" },
  { key: "shopping", icon: "🛍️", label: "Xaridlar" },
  { key: "games", icon: "🎮", label: "O'yinlar" },
  { key: "news", icon: "📡", label: "Yangiliklar" },
];

const QUICK_ACTIONS = [
  { key: "qr", icon: "📱", label: "QR kod skaneri", screen: "QRCode" as const },
  { key: "broadcast", icon: "📢", label: "Tarqatish ro'yxatlari", screen: "BroadcastLists" as const },
  { key: "starred", icon: "⭐", label: "Saqlangan xabarlar", screen: "StarredMessages" as const },
  { key: "mentions", icon: "📌", label: "Eslatishlar", screen: "Mentions" as const },
  { key: "redpacket", icon: "🧧", label: "Konvert ochish", screen: "ClaimRedPacket" as const },
  { key: "reminders", icon: "⏰", label: "Yodga solinganlar", screen: "Reminders" as const },
];

export function DiscoverScreen({ navigation }: Props) {
  const [search, setSearch] = useState("");

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  content: { padding: 16 },
  searchContainer: { marginBottom: 12 },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#333", marginTop: 12, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  serviceCard: {
    width: "30%",
    backgroundColor: "#fff",
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
  serviceLabel: { fontSize: 12, fontWeight: "600", color: "#333", textAlign: "center" },
  menuList: { marginTop: 4 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  menuIcon: { fontSize: 20 },
  menuLabel: { flex: 1, fontSize: 15, color: "#333", fontWeight: "500" },
  menuArrow: { fontSize: 18, color: "#C7C7CC" },
  emptyText: { textAlign: "center", color: "#999", fontSize: 15, padding: 20 },
});
