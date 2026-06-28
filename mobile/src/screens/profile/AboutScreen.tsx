import { Image, Linking, ScrollView, Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { API_URL } from "../../config/env";
import { colors } from "../../theme/colors";
import appJson from "../../../app.json";

const APP_VERSION = appJson.expo.version;

const FEATURES = [
  { icon: "🔒", text: "End-to-end shifrlash", color: "#34C759" },
  { icon: "👥", text: "Shaxsiy va guruh suhbatlari", color: "#5856D6" },
  { icon: "📞", text: "Audio va video qo'ng'iroqlar", color: "#007AFF" },
  { icon: "💰", text: "Hamyon va to'lovlar", color: "#FF9500" },
  { icon: "🧩", text: "Mini-dasturlar platformasi", color: "#AF52DE" },
  { icon: "📰", text: "Yangiliklar va postlar", color: "#32ADE6" },
  { icon: "🛒", text: "Bozor va do'konlar", color: "#34C759" },
  { icon: "🎙️", text: "Ovozli xonalar va efirlar", color: "#FF2D55" },
  { icon: "🎮", text: "O'yinlar markazi", color: "#AF52DE" },
  { icon: "🎵", text: "Musiqa pleyer", color: "#FF9500" },
  { icon: "📷", text: "Hikoyalar va reelslar", color: "#FF3B30" },
  { icon: "🧧", text: "Qizil konvertlar", color: "#FF3B30" },
  { icon: "🛡️", text: "Ikki bosqichli tekshiruv", color: "#007AFF" },
  { icon: "📍", text: "Joylashuv ulashish", color: "#00C7BE" },
  { icon: "✅", text: "Tasdiqlangan hisoblar", color: "#34C759" },
];

export function AboutScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroSection}>
        <Image source={require("../../../assets/icon.png")} style={styles.icon} />
        <Text style={styles.name}>UzChat</Text>
        <Text style={styles.version}>Versiya {APP_VERSION}</Text>
        <Text style={styles.tagline}>O'zbekiston uchun super-ilova</Text>
      </View>

      <View style={styles.descCard}>
        <Text style={styles.descText}>
          UzChat — end-to-end shifrlangan xabar almashish, to'lov tizimlari, mini-dasturlar va ijtimoiy tarmoq imkoniyatlarini birlashtirgan O'zbekiston uchun yaratilgan super-ilova. Xabarlaringiz qurilmangizda shifrlanadi va faqat suhbatdoshingiz ochishi mumkin.
        </Text>
      </View>

      <View style={styles.featuresCard}>
        <Text style={styles.featuresTitle}>Imkoniyatlar</Text>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={[styles.featureIconBg, { backgroundColor: f.color + "18" }]}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
            </View>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.linksCard}>
        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(`${API_URL}/privacy-policy`).catch(() => {})} activeOpacity={0.6}>
          <View style={[styles.featureIconBg, { backgroundColor: "#007AFF18" }]}>
            <Text style={styles.featureIcon}>📋</Text>
          </View>
          <Text style={styles.linkText}>Maxfiylik siyosati</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(`${API_URL}/terms`).catch(() => {})} activeOpacity={0.6}>
          <View style={[styles.featureIconBg, { backgroundColor: "#007AFF18" }]}>
            <Text style={styles.featureIcon}>📄</Text>
          </View>
          <Text style={styles.linkText}>Foydalanish shartlari</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>© {new Date().getFullYear()} UzChat. Barcha huquqlar himoyalangan.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  heroSection: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  icon: { width: 88, height: 88, borderRadius: 22, marginBottom: 14 },
  name: { fontSize: 26, fontWeight: "800", color: colors.text },
  version: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  tagline: { fontSize: 14, color: colors.primary, fontWeight: "600", marginTop: 6 },
  descCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  descText: { fontSize: 14, color: colors.text, lineHeight: 22, textAlign: "center" },
  featuresCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  featuresTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 14 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  featureIconBg: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  featureIcon: { fontSize: 17 },
  featureText: { fontSize: 14, color: colors.text, flex: 1 },
  linksCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  linkText: { fontSize: 15, color: colors.primary, flex: 1, fontWeight: "500" },
  linkArrow: { fontSize: 18, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 60 },
  footer: { fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 16 },
});
