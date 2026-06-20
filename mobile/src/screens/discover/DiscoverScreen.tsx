import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Discover">;

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
];

export function DiscoverScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
            onPress={() => {
              navigation.navigate("MiniApps");
            }}
          >
            <Text style={styles.serviceIcon}>{s.icon}</Text>
            <Text style={styles.serviceLabel}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Qo'shimcha</Text>
      <View style={styles.menuList}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("QRCode")}>
          <Text style={styles.menuIcon}>📱</Text>
          <Text style={styles.menuLabel}>QR kod skaneri</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("BroadcastLists")}>
          <Text style={styles.menuIcon}>📢</Text>
          <Text style={styles.menuLabel}>Tarqatish ro'yxatlari</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("StarredMessages")}>
          <Text style={styles.menuIcon}>⭐</Text>
          <Text style={styles.menuLabel}>Saqlangan xabarlar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("ClaimRedPacket", {})}>
          <Text style={styles.menuIcon}>🧧</Text>
          <Text style={styles.menuLabel}>Konvert ochish</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 12, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 },
  serviceCard: {
    width: "30%",
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceIcon: { fontSize: 28, marginBottom: 6 },
  serviceLabel: { fontSize: 12, fontWeight: "600", color: colors.text, textAlign: "center" },
  menuList: { marginTop: 4 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIcon: { fontSize: 20 },
  menuLabel: { fontSize: 15, color: colors.text },
});
