import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MainTabScreenProps } from "../../navigation/types";
import { contactsApi } from "../../api/contacts";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { Contact, ContactRequest } from "../../types";

type Props = MainTabScreenProps<"Contacts">;

export function ContactsScreen({ navigation }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [aliasContact, setAliasContact] = useState<Contact | null>(null);
  const [aliasInput, setAliasInput] = useState("");
  const [savingAlias, setSavingAlias] = useState(false);
  const [search, setSearch] = useState("");

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

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([contactsApi.list(), contactsApi.listIncomingRequests()])
      .then(([c, r]) => {
        setContacts(c);
        setRequests(r);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  const onAccept = async (id: string) => {
    await contactsApi.accept(id).catch(() => {});
    load();
  };

  const onDecline = async (id: string) => {
    await contactsApi.decline(id).catch(() => {});
    load();
  };

  const onLongPressContact = (item: Contact) => {
    Alert.alert(item.alias ?? item.user.displayName, undefined, [
      {
        text: "✏️ Taxallus qo'yish",
        onPress: () => {
          setAliasInput(item.alias ?? "");
          setAliasContact(item);
        },
      },
      {
        text: "🚫 Bloklash",
        style: "destructive",
        onPress: () => {
          contactsApi
            .block(item.user.id)
            .then(load)
            .catch(() => {});
        },
      },
      {
        text: "Kontaktni o'chirish",
        style: "destructive",
        onPress: () => {
          contactsApi
            .remove(item.id)
            .then(load)
            .catch(() => {});
        },
      },
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const onSaveAlias = async () => {
    if (!aliasContact) return;
    setSavingAlias(true);
    try {
      const trimmed = aliasInput.trim();
      const updated = await contactsApi.updateAlias(aliasContact.id, trimmed.length > 0 ? trimmed : null);
      setContacts((prev) => prev.map((c) => (c.id === updated.id ? { ...c, alias: updated.alias } : c)));
      setAliasContact(null);
    } catch {
      Alert.alert("Xatolik", "Taxallusni saqlab bo'lmadi");
    } finally {
      setSavingAlias(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addRow} onPress={() => navigation.navigate("AddContact")}>
        <View style={styles.addIcon}>
          <Text style={styles.addIconText}>➕</Text>
        </View>
        <Text style={styles.addText}>Kontakt qo'shish</Text>
      </TouchableOpacity>

      {requests.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>So'rovlar</Text>
          {requests.map((req) => (
            <View key={req.id} style={styles.row}>
              <Avatar uri={req.owner.avatarUrl} name={req.owner.displayName} />
              <Text style={styles.name}>{req.owner.displayName}</Text>
              <TouchableOpacity style={styles.acceptButton} onPress={() => onAccept(req.id)}>
                <Text style={styles.acceptText}>Qabul qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineButton} onPress={() => onDecline(req.id)}>
                <Text style={styles.declineText}>Rad etish</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Kontaktlar</Text>
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
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onLongPress={() => onLongPressContact(item)}>
            <Avatar uri={item.user.avatarUrl} name={item.user.displayName} />
            <Text style={styles.name}>{item.alias ?? item.user.displayName}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {contacts.length === 0 ? "Hali kontaktlar yo'q" : "Hech narsa topilmadi"}
            </Text>
          </View>
        }
      />

      <Modal visible={!!aliasContact} transparent animationType="fade" onRequestClose={() => setAliasContact(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAliasContact(null)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>Taxallus qo'yish</Text>
            <Text style={styles.modalSubtitle}>{aliasContact?.user.displayName}</Text>
            <TextInput
              style={styles.modalInput}
              value={aliasInput}
              onChangeText={setAliasInput}
              placeholder={aliasContact?.user.displayName}
              placeholderTextColor={colors.textSecondary}
              autoFocus
              maxLength={64}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setAliasContact(null)}>
                <Text style={styles.modalCancelText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={onSaveAlias} disabled={savingAlias}>
                {savingAlias ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>Saqlash</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  sectionTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 4,
  },
  addRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addIconText: { fontSize: 18 },
  addText: { fontSize: 16, fontWeight: "500", color: colors.text },
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
  acceptButton: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  acceptText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  declineButton: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  declineText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, width: "100%" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2, marginBottom: 12 },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16 },
  modalCancelButton: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: colors.textSecondary, fontSize: 15, fontWeight: "600" },
  modalSaveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minWidth: 88,
    alignItems: "center",
  },
  modalSaveText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
