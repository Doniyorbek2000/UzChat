import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert , KeyboardAvoidingView, Platform} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { businessApi, BusinessProfileData } from "../../api/business";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "BusinessProfile">;

const CATEGORIES = [
  "Restoran", "Do'kon", "Xizmatlar", "Ta'lim", "Salomatlik",
  "Transport", "IT", "Moliya", "Ko'ngilochar", "Boshqa",
];

export function BusinessProfileScreen(_props: Props) {
  const [profile, setProfile] = useState<BusinessProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("Boshqa");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [greetingMsg, setGreetingMsg] = useState("");
  const [autoReplyMsg, setAutoReplyMsg] = useState("");

  useEffect(() => {
    businessApi.getMyProfile().then((p) => {
      if (p) {
        setProfile(p);
        setBusinessName(p.businessName);
        setCategory(p.category);
        setDescription(p.description ?? "");
        setAddress(p.address ?? "");
        setPhone(p.phone ?? "");
        setEmail(p.email ?? "");
        setWebsite(p.website ?? "");
        setWorkingHours(p.workingHours ?? "");
        setGreetingMsg(p.greetingMsg ?? "");
        setAutoReplyMsg(p.autoReplyMsg ?? "");
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!businessName.trim()) {
      Alert.alert("Xatolik", "Biznes nomi kiritilishi shart");
      return;
    }
    setSaving(true);
    try {
      const updated = await businessApi.updateProfile({
        businessName: businessName.trim(),
        category,
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        workingHours: workingHours.trim() || undefined,
        greetingMsg: greetingMsg.trim() || undefined,
        autoReplyMsg: autoReplyMsg.trim() || undefined,
      });
      setProfile(updated);
      Alert.alert("Saqlandi", "Biznes profil yangilandi");
    } catch {}
    setSaving(false);
  };

  const handleDelete = () => {
    Alert.alert("O'chirish", "Biznes profilni o'chirmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "O'chirish", style: "destructive", onPress: async () => {
        await businessApi.deleteProfile().catch(() => {});
        setProfile(null);
        setBusinessName("");
        setCategory("Boshqa");
        setDescription("");
        setAddress("");
        setPhone("");
        setEmail("");
        setWebsite("");
        setWorkingHours("");
        setGreetingMsg("");
        setAutoReplyMsg("");
      }},
    ]);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>

    <ScrollView keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={styles.content}>
      {profile?.isVerified && (
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedText}>✓ Tasdiqlangan biznes</Text>
        </View>
      )}

      <Text style={styles.label}>Biznes nomi *</Text>
      <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} placeholder="Biznes nomi..." placeholderTextColor={colors.textSecondary} maxLength={100} />

      <Text style={styles.label}>Kategoriya</Text>
      <View style={styles.categories}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c} style={[styles.catBtn, category === c && styles.catBtnActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Tavsif</Text>
      <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Biznes haqida..." placeholderTextColor={colors.textSecondary} multiline maxLength={500} />

      <Text style={styles.label}>Manzil</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Manzil..." placeholderTextColor={colors.textSecondary} />

      <Text style={styles.label}>Telefon</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+998 ..." placeholderTextColor={colors.textSecondary} keyboardType="phone-pad" />

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@example.com" placeholderTextColor={colors.textSecondary} keyboardType="email-address" autoCapitalize="none" />

      <Text style={styles.label}>Veb-sayt</Text>
      <TextInput style={styles.input} value={website} onChangeText={setWebsite} placeholder="https://..." placeholderTextColor={colors.textSecondary} autoCapitalize="none" />

      <Text style={styles.label}>Ish vaqti</Text>
      <TextInput style={styles.input} value={workingHours} onChangeText={setWorkingHours} placeholder="09:00 - 18:00" placeholderTextColor={colors.textSecondary} />

      <Text style={styles.label}>Salomlash xabari</Text>
      <TextInput style={[styles.input, styles.multiline]} value={greetingMsg} onChangeText={setGreetingMsg} placeholder="Xarid uchun rahmat!..." placeholderTextColor={colors.textSecondary} multiline maxLength={300} />

      <Text style={styles.label}>Avtomatik javob</Text>
      <TextInput style={[styles.input, styles.multiline]} value={autoReplyMsg} onChangeText={setAutoReplyMsg} placeholder="Hozirda band..." placeholderTextColor={colors.textSecondary} multiline maxLength={300} />

      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Saqlash</Text>}
      </TouchableOpacity>

      {profile && (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Biznes profilni o'chirish</Text>
        </TouchableOpacity>
      )}
    </ScrollView>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 40 },
  verifiedBadge: { backgroundColor: "#E8F5E9", borderRadius: 10, padding: 10, alignItems: "center", marginBottom: 12 },
  verifiedText: { fontSize: 13, fontWeight: "600", color: "#2E7D32" },
  label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.background },
  catBtnActive: { backgroundColor: colors.primary },
  catText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  catTextActive: { color: "#fff" },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  deleteBtn: { alignItems: "center", marginTop: 16 },
  deleteBtnText: { color: colors.danger, fontSize: 14, fontWeight: "600" },
});
