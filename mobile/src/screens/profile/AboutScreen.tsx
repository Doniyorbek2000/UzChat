import { Image, Linking, Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { API_URL } from "../../config/env";
import { colors } from "../../theme/colors";
import appJson from "../../../app.json";

const APP_VERSION = appJson.expo.version;

const FEATURES = [
  "🔒 End-to-end shifrlash",
  "👥 Shaxsiy va guruh suhbatlari",
  "🎤 Ovozli xabarlar",
  "📊 So'rovnomalar",
  "⏳ G'oyib bo'ladigan xabarlar",
  "🛡️ Ikki bosqichli tekshiruv va ilova qulfi",
  "📰 Yangiliklar va postlar",
  "🛒 Bozor va do'konlar",
  "💰 Hamyon va to'lovlar",
  "📱 Mini-dasturlar",
  "📷 Hikoyalar",
  "📞 Audio va video qo'ng'iroqlar",
  "🧧 Qizil konvertlar",
  "📍 Joylashuv ulashish",
  "✅ Tasdiqlangan hisoblar",
];

export function AboutScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={require("../../../assets/icon.png")} style={styles.icon} />
      <Text style={styles.name}>UzChat</Text>
      <Text style={styles.version}>Versiya {APP_VERSION}</Text>

      <Text style={styles.description}>
        UzChat — end-to-end shifrlangan xabar almashish ilovasi. Xabarlar, ovozli xabarlar va fayllar faqat
        qurilmangizda shifrlanadi va ochiladi - server ularning mazmunini hech qachon ko'rmaydi.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Imkoniyatlar</Text>
        {FEATURES.map((feature) => (
          <Text key={feature} style={styles.feature}>
            {feature}
          </Text>
        ))}
      </View>

      <View style={styles.links}>
        <Pressable onPress={() => Linking.openURL(`${API_URL}/privacy-policy`)}>
          <Text style={styles.link}>Maxfiylik siyosati</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(`${API_URL}/terms`)}>
          <Text style={styles.link}>Foydalanish shartlari</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>© {new Date().getFullYear()} UzChat</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 24, alignItems: "center" },
  icon: { width: 88, height: 88, borderRadius: 20, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: "700", color: colors.text },
  version: { fontSize: 13, color: colors.textSecondary, marginTop: 2, marginBottom: 16 },
  description: { fontSize: 14, color: colors.text, lineHeight: 20, textAlign: "center" },
  section: { alignSelf: "stretch", backgroundColor: colors.background, borderRadius: 8, padding: 16, marginTop: 24 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 10 },
  feature: { fontSize: 14, color: colors.text, lineHeight: 24 },
  links: { marginTop: 24, gap: 12, alignItems: "center" },
  link: { fontSize: 14, color: colors.primary },
  footer: { fontSize: 12, color: colors.textSecondary, marginTop: 32 },
});
