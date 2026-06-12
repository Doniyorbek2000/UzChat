import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, FlatList } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { contactsApi } from "../../api/contacts";
import { usersApi } from "../../api/users";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { User } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "AddContact">;

export function AddContactScreen(_props: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const trimmed = query.trim().replace(/^@/, "");
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      usersApi
        .search(trimmed)
        .then((users) => {
          if (!cancelled) setResults(users);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const onSendRequest = async (target: User) => {
    setSendingId(target.id);
    try {
      await contactsApi.sendRequest(target.username);
      setSentIds((prev) => new Set(prev).add(target.id));
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "So'rov yuborib bo'lmadi");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Username yoki telefon raqami bo'yicha qidirish</Text>
      <TextInput
        style={styles.input}
        placeholder="username yoki +998901234567"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
      />
      {searching && <ActivityIndicator style={styles.spinner} />}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const sent = sentIds.has(item.id);
          return (
            <View style={styles.resultRow}>
              <Avatar uri={item.avatarUrl} name={item.displayName} size={44} />
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.displayName}</Text>
                <Text style={styles.resultUsername}>@{item.username}</Text>
              </View>
              <TouchableOpacity
                style={[styles.sendButton, sent && styles.sendButtonDone]}
                onPress={() => onSendRequest(item)}
                disabled={sent || sendingId === item.id}
              >
                {sendingId === item.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.sendButtonText, sent && styles.sendButtonTextDone]}>
                    {sent ? "Yuborildi" : "Qo'shish"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          !searching && query.trim().length >= 2 ? <Text style={styles.emptyText}>Hech narsa topilmadi</Text> : null
        }
      />
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
    marginBottom: 12,
  },
  spinner: { marginBottom: 12 },
  resultRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: "600", color: colors.text },
  resultUsername: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 96,
    alignItems: "center",
  },
  sendButtonDone: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  sendButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  sendButtonTextDone: { color: colors.textSecondary },
  emptyText: { textAlign: "center", color: colors.textSecondary, marginTop: 24, fontSize: 14 },
});
