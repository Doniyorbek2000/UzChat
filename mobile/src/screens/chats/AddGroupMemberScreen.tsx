import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { contactsApi } from "../../api/contacts";
import { useChatStore } from "../../store/chatStore";
import { Avatar } from "../../components/Avatar";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { Contact } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "AddGroupMember">;

export function AddGroupMemberScreen({ route, navigation }: Props) {
  const { conversationId } = route.params;
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === conversationId));
  const addParticipant = useChatStore((s) => s.addParticipant);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

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

  const existingIds = new Set(conversation?.participants.map((p) => p.userId) ?? []);
  const candidates = contacts.filter((c) => !existingIds.has(c.user.id));
  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return candidates;
    return candidates.filter((item) => {
      const alias = item.alias?.toLowerCase() ?? "";
      const displayName = item.user.displayName.toLowerCase();
      const username = item.user.username.toLowerCase();
      return alias.includes(query) || displayName.includes(query) || username.includes(query);
    });
  }, [candidates, search]);

  const toggle = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const onAdd = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const targets = candidates.filter((c) => selected.has(c.user.id)).map((c) => c.user);
      let added = 0;
      let failed = 0;
      let lastErrorMessage: string | undefined;
      for (const target of targets) {
        try {
          await addParticipant(conversationId, target);
          added++;
        } catch (err: any) {
          failed++;
          lastErrorMessage = err?.response?.data?.error?.message;
        }
      }
      if (added === 0) {
        Alert.alert("Xatolik", lastErrorMessage ?? "A'zo qo'shib bo'lmadi");
        return;
      }
      if (failed > 0) {
        Alert.alert("Qo'shildi", `${added} kishi qo'shildi, ${failed} kishini qo'shib bo'lmadi`);
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return <ErrorView message="Kontaktlarni yuklab bo'lmadi" onRetry={() => { setLoading(true); loadContacts(); }} />;
  }

  return (
    <View style={styles.container}>
      {candidates.length > 0 && (
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
        data={filteredCandidates}
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
              {candidates.length === 0 ? "Qo'shish uchun kontakt yo'q" : "Hech narsa topilmadi"}
            </Text>
          </View>
        }
      />
      <TouchableOpacity style={[styles.button, (saving || selected.size === 0) && styles.buttonDisabled]} onPress={onAdd} disabled={saving || selected.size === 0}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Qo'shish ({selected.size})</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
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
