import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { contactsApi } from "../../api/contacts";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "AddContact">;

export function AddContactScreen({ navigation }: Props) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const trimmed = username.trim().replace(/^@/, "");
    if (!trimmed) return;
    setLoading(true);
    try {
      await contactsApi.sendRequest(trimmed);
      Alert.alert("Yuborildi", "Kontakt so'rovi yuborildi", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "So'rov yuborib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Username bo'yicha qidirish</Text>
      <TextInput
        style={styles.input}
        placeholder="username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoFocus
      />
      <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>So'rov yuborish</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.surface },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  button: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
