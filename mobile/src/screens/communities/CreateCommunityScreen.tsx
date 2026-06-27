import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { communitiesApi } from "../../api/communities";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "CreateCommunity">;

export function CreateCommunityScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Xatolik", "Jamiyat nomini kiriting");
      return;
    }
    setSaving(true);
    try {
      const community = await communitiesApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      Alert.alert("Muvaffaqiyat", "Jamiyat yaratildi!", [
        { text: "OK", onPress: () => navigation.replace("CommunityView", { communityId: community.id }) },
      ]);
    } catch {
      Alert.alert("Xatolik", "Jamiyatni yaratib bo'lmadi");
    }
    setSaving(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.previewAvatar}>
        <Text style={styles.previewAvatarText}>{name.trim() ? name.charAt(0).toUpperCase() : "?"}</Text>
      </View>

      <Text style={styles.label}>Jamiyat nomi</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Masalan: O'zbek dasturchilar"
        placeholderTextColor="#999"
        maxLength={100}
      />

      <Text style={styles.label}>Tavsif (ixtiyoriy)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Jamiyat haqida qisqacha..."
        placeholderTextColor="#999"
        multiline
        maxLength={500}
      />

      <View style={styles.hint}>
        <Text style={styles.hintIcon}>💡</Text>
        <Text style={styles.hintText}>Jamiyat yaratgandan so'ng, unga guruhlar va kanallar qo'shishingiz mumkin</Text>
      </View>

      <TouchableOpacity
        style={[styles.createBtn, (!name.trim() || saving) && styles.createBtnDisabled]}
        onPress={handleCreate}
        disabled={!name.trim() || saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Jamiyat yaratish</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  previewAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#4CAF50", alignSelf: "center", alignItems: "center", justifyContent: "center", marginVertical: 20 },
  previewAvatarText: { fontSize: 34, fontWeight: "700", color: "#fff" },
  label: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  hint: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FFF9E6", padding: 12, borderRadius: 10, marginTop: 20 },
  hintIcon: { fontSize: 16 },
  hintText: { flex: 1, fontSize: 13, color: colors.textSecondary },
  createBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
