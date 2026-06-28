import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { contactsApi } from "../../api/contacts";
import { useChatStore } from "../../store/chatStore";
import { Avatar } from "../../components/Avatar";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { Contact } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "NewGroup">;

export function NewGroupScreen({ navigation }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const createGroupConversation = useChatStore((s) => s.createGroupConversation);

  const loadContacts = useCallback(() => {
    setError(false);
    contactsApi
      .list()
      .then(setContacts)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((item) => {
      const alias = item.alias?.toLowerCase() ?? "";
      const displayName = item.user.displayName.toLowerCase();
      const username = item.user.username.toLowerCase();
      return alias.includes(query) || displayName.includes(query) || username.includes(query);
    });
  }, [contacts, search]);

  const toggle = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const onCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Xatolik", "Guruh nomini kiriting");
      return;
    }
    if (selected.size < 1) {
      Alert.alert("Xatolik", "Kamida 1 ta a'zo tanlang");
      return;
    }
    setCreating(true);
    try {
      const members = contacts.filter((c) => selected.has(c.user.id)).map((c) => c.user);
      const conversation = await createGroupConversation(title.trim(), members);
      navigation.replace("ChatRoom", { conversationId: conversation.id, title: conversation.title ?? title });
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Guruh yaratib bo'lmadi");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message="Kontaktlarni yuklab bo'lmadi" onRetry={() => { setLoading(true); loadContacts(); }} />;
  }

  const canCreate = title.trim().length > 0 && selected.size >= 1 && !creating;

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} placeholder="Guruh nomi" placeholderTextColor={colors.textSecondary} value={title} onChangeText={setTitle} />
      {contacts.length > 0 && (
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Qidirish"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const isSelected = selected.has(item.user.id);
          return (
            <TouchableOpacity style={styles.row} onPress={() => toggle(item.user.id)}>
              <Avatar uri={item.user.avatarUrl} name={item.user.displayName} />
              <Text style={styles.name}>{item.alias ?? item.user.displayName}</Text>
              <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                {isSelected && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {contacts.length === 0 ? "Hali kontaktlar yo'q" : "Hech narsa topilmadi"}
            </Text>
          </View>
        }
      />
      <TouchableOpacity style={[styles.button, !canCreate && styles.buttonDisabled]} onPress={onCreate} disabled={!canCreate}>
        {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guruh yaratish ({selected.size})</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  input: {
    margin: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  name: { fontSize: 16, color: colors.text, flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 10,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, height: "100%", padding: 0 },
  searchClear: { fontSize: 14, color: colors.textSecondary, paddingHorizontal: 4 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxMark: { color: "#fff", fontWeight: "700" },
  button: {
    backgroundColor: colors.primary,
    margin: 12,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
