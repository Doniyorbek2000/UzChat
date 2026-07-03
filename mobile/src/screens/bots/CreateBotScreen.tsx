import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { botsApi } from "../../api/bots";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "CreateBot">;

export function CreateBotScreen({ navigation }: Props) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!username.trim() || !displayName.trim()) {
      Alert.alert(tr("Xatolik"), tr("Username va nom to'ldirilishi shart"));
      return;
    }
    if (!username.trim().toLowerCase().endsWith("bot")) {
      Alert.alert(tr("Xatolik"), tr("Bot username 'bot' bilan tugashi kerak (masalan: mybot)"));
      return;
    }
    setCreating(true);
    try {
      const bot = await botsApi.create({
        username: username.trim(),
        displayName: displayName.trim(),
        description: description.trim() || undefined,
      });
      Alert.alert(tr("Bot yaratildi!"), `Token: ${bot.token}\n\nBu tokenni saqlang — boshqa ko'rsatilmaydi.`, [
        { text: tr("OK"), onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert(tr("Xatolik"), err?.response?.data?.error?.message || "Bot yaratib bo'lmadi");
    }
    setCreating(false);
  };

  const canCreate = username.trim().length > 0 && displayName.trim().length > 0 && !creating;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>{tr("Username")}</Text>
      <TextInput
        style={styles.input}
        placeholder={tr("myassistantbot")}
        placeholderTextColor={colors.textSecondary}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <Text style={styles.hint}>{tr("Username \"bot\" bilan tugashi kerak")}</Text>

      <Text style={styles.label}>{tr("Ko'rsatiladigan nom")}</Text>
      <TextInput
        style={styles.input}
        placeholder={tr("Bot nomi")}
        placeholderTextColor={colors.textSecondary}
        value={displayName}
        onChangeText={setDisplayName}
      />

      <Text style={styles.label}>{tr("Tavsif (ixtiyoriy)")}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder={tr("Bot nima qiladi...")}
        placeholderTextColor={colors.textSecondary}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity style={[styles.createBtn, !canCreate && styles.createBtnDisabled]} onPress={handleCreate} disabled={!canCreate}>
        {creating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.createBtnText}>{tr("Bot yaratish")}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
