import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { communitiesApi } from "../../api/communities";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "CreateCommunity">;

export function CreateCommunityScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert(tr("Xatolik"), tr("Jamiyat nomini kiriting"));
      return;
    }
    setSaving(true);
    try {
      const community = await communitiesApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      Alert.alert(tr("Muvaffaqiyat"), tr("Jamiyat yaratildi!"), [
        { text: tr("OK"), onPress: () => navigation.replace("CommunityView", { communityId: community.id }) },
      ]);
    } catch {
      Alert.alert(tr("Xatolik"), tr("Jamiyatni yaratib bo'lmadi"));
    }
    setSaving(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.avatarContainer}>
        <Avatar name={name.trim() || "?"} size={80} />
      </View>

      <Text style={styles.label}>{tr("Jamiyat nomi")}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={tr("Masalan: O'zbek dasturchilar")}
        placeholderTextColor={colors.textSecondary}
        maxLength={100}
      />

      <Text style={styles.label}>{tr("Tavsif (ixtiyoriy)")}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder={tr("Jamiyat haqida qisqacha...")}
        placeholderTextColor={colors.textSecondary}
        multiline
        maxLength={500}
      />

      <View style={styles.hint}>
        <Text style={styles.hintIcon}>💡</Text>
        <Text style={styles.hintText}>{tr("Jamiyat yaratgandan so'ng, unga guruhlar va kanallar qo'shishingiz mumkin")}</Text>
      </View>

      <TouchableOpacity
        style={[styles.createBtn, (!name.trim() || saving) && styles.createBtnDisabled]}
        onPress={handleCreate}
        disabled={!name.trim() || saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>{tr("Jamiyat yaratish")}</Text>}
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16 },
  avatarContainer: { alignSelf: "center", marginVertical: 20 },
  label: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  hint: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FFF9E6", padding: 12, borderRadius: 10, marginTop: 20 },
  hintIcon: { fontSize: 16 },
  hintText: { flex: 1, fontSize: 13, color: colors.textSecondary },
  createBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
