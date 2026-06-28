import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  SectionList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { contactsApi } from "../../api/contacts";
import { Avatar } from "../../components/Avatar";
import { EmptyState } from "../../components/EmptyState";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { Contact, ContactRequest, ContactSuggestion, OutgoingContactRequest } from "../../types";
import { useContactsStore } from "../../store/contactsStore";
import { useChatStore } from "../../store/chatStore";
import { formatTime } from "../../utils/conversation";

type Props = NativeStackScreenProps<RootStackParamList, "Contacts">;

export function ContactsScreen({ navigation }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingContactRequest[]>([]);
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([]);
  const [addingSuggestionId, setAddingSuggestionId] = useState<string | null>(null);
  const [sentSuggestionIds, setSentSuggestionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [aliasContact, setAliasContact] = useState<Contact | null>(null);
  const [aliasInput, setAliasInput] = useState("");
  const [savingAlias, setSavingAlias] = useState(false);
  const [noteContact, setNoteContact] = useState<Contact | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [search, setSearch] = useState("");
  const [sortOnlineFirst, setSortOnlineFirst] = useState(false);
  const onlineUsers = useChatStore((s) => s.onlineUsers);

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

  const sortedContacts = useMemo(() => {
    if (!sortOnlineFirst) return filteredContacts;
    return [...filteredContacts].sort((a, b) => {
      const aOnline = onlineUsers.has(a.user.id);
      const bOnline = onlineUsers.has(b.user.id);
      if (aOnline !== bOnline) return aOnline ? -1 : 1;
      const aTime = a.user.lastSeenAt ? new Date(a.user.lastSeenAt).getTime() : 0;
      const bTime = b.user.lastSeenAt ? new Date(b.user.lastSeenAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [filteredContacts, onlineUsers, sortOnlineFirst]);

  const sectionListRef = useRef<SectionList<Contact>>(null);

  const sections = useMemo(() => {
    if (sortOnlineFirst) return [{ title: "", data: sortedContacts }];
    const groups = new Map<string, Contact[]>();
    for (const item of sortedContacts) {
      const name = (item.alias ?? item.user.displayName).trim();
      const first = name.charAt(0).toUpperCase();
      const letter = /^\p{L}/u.test(first) ? first : "#";
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter)!.push(item);
    }
    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [sortedContacts, sortOnlineFirst]);

  const createDirectConversation = useChatStore((s) => s.createDirectConversation);

  const onOpenChat = async (item: Contact) => {
    try {
      const conversation = await createDirectConversation(item.user);
      navigation.navigate("ChatRoom", { conversationId: conversation.id, title: item.alias ?? item.user.displayName });
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Suhbat ochib bo'lmadi");
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      contactsApi.list(),
      contactsApi.listIncomingRequests(),
      contactsApi.listSuggestions(),
      contactsApi.listOutgoingRequests(),
    ])
      .then(([c, r, s, o]) => {
        setContacts(c);
        setRequests(r);
        setSuggestions(s);
        setOutgoingRequests(o);
        useContactsStore.getState().setPendingRequestCount(r.length);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      contactsApi.list(),
      contactsApi.listIncomingRequests(),
      contactsApi.listSuggestions(),
      contactsApi.listOutgoingRequests(),
    ])
      .then(([c, r, s, o]) => {
        setContacts(c);
        setRequests(r);
        setSuggestions(s);
        setOutgoingRequests(o);
        useContactsStore.getState().setPendingRequestCount(r.length);
      })
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    useContactsStore.getState().setupSocketListeners();
  }, []);

  const lastRequestReceivedAt = useContactsStore((s) => s.lastRequestReceivedAt);
  useEffect(() => {
    if (lastRequestReceivedAt !== null) load();
  }, [lastRequestReceivedAt, load]);

  const onAccept = async (id: string) => {
    await contactsApi.accept(id).catch(() => {});
    load();
  };

  const onDecline = async (id: string) => {
    await contactsApi.decline(id).catch(() => {});
    load();
  };

  const onCancelOutgoing = async (id: string) => {
    setOutgoingRequests((prev) => prev.filter((r) => r.id !== id));
    await contactsApi.remove(id).catch(() => {});
  };

  const onToggleFavorite = async (item: Contact) => {
    try {
      await contactsApi.setFavorite(item.id, !item.isFavorite);
      load();
    } catch {
      Alert.alert("Xatolik", "O'zgartirib bo'lmadi");
    }
  };

  const onAddSuggestion = async (suggestion: ContactSuggestion) => {
    setAddingSuggestionId(suggestion.user.id);
    try {
      await contactsApi.sendRequest(suggestion.user.username);
      setSentSuggestionIds((prev) => new Set(prev).add(suggestion.user.id));
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "So'rov yuborib bo'lmadi");
    } finally {
      setAddingSuggestionId(null);
    }
  };

  const onDismissSuggestion = (userId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.user.id !== userId));
    contactsApi.dismissSuggestion(userId).catch(() => {});
  };

  const onLongPressContact = (item: Contact) => {
    Alert.alert(item.alias ?? item.user.displayName, undefined, [
      {
        text: "👤 Profilni ko'rish",
        onPress: () => navigation.navigate("UserProfile", { userId: item.user.id }),
      },
      {
        text: item.isFavorite ? "⭐ Sevimlilardan olib tashlash" : "⭐ Sevimlilarga qo'shish",
        onPress: () => onToggleFavorite(item),
      },
      {
        text: "✏️ Taxallus qo'yish",
        onPress: () => {
          setAliasInput(item.alias ?? "");
          setAliasContact(item);
        },
      },
      {
        text: item.note ? "📝 Eslatmani tahrirlash" : "📝 Eslatma qo'shish",
        onPress: () => {
          setNoteInput(item.note ?? "");
          setNoteContact(item);
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

  const onSaveNote = async () => {
    if (!noteContact) return;
    setSavingNote(true);
    try {
      const trimmed = noteInput.trim();
      const updated = await contactsApi.updateNote(noteContact.id, trimmed.length > 0 ? trimmed : null);
      setContacts((prev) => prev.map((c) => (c.id === updated.id ? { ...c, note: updated.note } : c)));
      setNoteContact(null);
    } catch {
      Alert.alert("Xatolik", "Eslatmani saqlab bo'lmadi");
    } finally {
      setSavingNote(false);
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
    return <ErrorView message="Kontaktlarni yuklab bo'lmadi" onRetry={load} />;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addRow} onPress={() => navigation.navigate("AddContact")}>
        <View style={styles.addIcon}>
          <Text style={styles.addIconText}>➕</Text>
        </View>
        <Text style={styles.addText}>Kontakt qo'shish</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.addRow} onPress={() => navigation.navigate("Birthdays")}>
        <View style={[styles.addIcon, styles.birthdayIcon]}>
          <Text style={styles.addIconText}>🎂</Text>
        </View>
        <Text style={styles.addText}>Tug'ilgan kunlar</Text>
      </TouchableOpacity>

      {requests.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>So'rovlar</Text>
          {requests.map((req) => (
            <View key={req.id} style={styles.row}>
              <Avatar uri={req.owner.avatarUrl} name={req.owner.displayName} />
              <View style={styles.requestInfo}>
                <Text style={styles.name}>{req.owner.displayName}</Text>
                {req.mutualCount > 0 && (
                  <TouchableOpacity onPress={() => navigation.navigate("MutualContacts", { userId: req.owner.id })}>
                    <Text style={styles.requestMutual}>{req.mutualCount} umumiy kontakt</Text>
                  </TouchableOpacity>
                )}
              </View>
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

      {outgoingRequests.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Yuborilgan so'rovlar</Text>
          {outgoingRequests.map((req) => (
            <View key={req.id} style={styles.row}>
              <Avatar uri={req.target.avatarUrl} name={req.target.displayName} />
              <View style={styles.requestInfo}>
                <Text style={styles.name}>{req.target.displayName}</Text>
                <Text style={styles.requestMutual}>Javob kutilmoqda</Text>
              </View>
              <TouchableOpacity style={styles.declineButton} onPress={() => onCancelOutgoing(req.id)}>
                <Text style={styles.declineText}>Bekor qilish</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {suggestions.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Sizga tanish bo'lishi mumkin</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsRow}>
            {suggestions.map((s) => (
              <View key={s.user.id} style={styles.suggestionCard}>
                <TouchableOpacity style={styles.suggestionDismiss} onPress={() => onDismissSuggestion(s.user.id)} hitSlop={8}>
                  <Text style={styles.suggestionDismissText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate("UserProfile", { userId: s.user.id })}>
                  <Avatar uri={s.user.avatarUrl} name={s.user.displayName} size={56} />
                </TouchableOpacity>
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {s.user.displayName}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate("MutualContacts", { userId: s.user.id })}>
                  <Text style={styles.suggestionMutual} numberOfLines={1}>
                    {s.mutualCount} umumiy kontakt
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.suggestionAddButton}
                  onPress={() => onAddSuggestion(s)}
                  disabled={addingSuggestionId === s.user.id || sentSuggestionIds.has(s.user.id)}
                >
                  {addingSuggestionId === s.user.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.suggestionAddText}>{sentSuggestionIds.has(s.user.id) ? "Yuborildi" : "Qo'shish"}</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
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
      {contacts.length > 0 && (
        <TouchableOpacity style={styles.sortToggleRow} onPress={() => setSortOnlineFirst((v) => !v)}>
          <View style={[styles.sortToggleCheckbox, sortOnlineFirst && styles.sortToggleCheckboxActive]}>
            {sortOnlineFirst && <Text style={styles.sortToggleCheckmark}>✓</Text>}
          </View>
          <Text style={styles.sortToggleText}>Onlaynlarni birinchi ko'rsatish</Text>
        </TouchableOpacity>
      )}
      <View style={styles.listContainer}>
        <SectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={Separator}
          stickySectionHeadersEnabled
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderSectionHeader={({ section }) =>
            section.title ? <Text style={styles.sectionHeader}>{section.title}</Text> : null
          }
          renderItem={({ item }) => {
            const isOnline = onlineUsers.has(item.user.id);
            return (
              <TouchableOpacity style={styles.row} onPress={() => onOpenChat(item)} onLongPress={() => onLongPressContact(item)}>
                <Avatar uri={item.user.avatarUrl} name={item.user.displayName} online={isOnline} />
                <View style={styles.nameColumn}>
                  <Text style={styles.name}>{item.alias ?? item.user.displayName}</Text>
                  {(isOnline || item.user.lastSeenAt) && (
                    <Text style={styles.presenceLabel}>
                      {isOnline ? "Onlayn" : `Oxirgi marta: ${formatTime(item.user.lastSeenAt!)}`}
                    </Text>
                  )}
                </View>
                {item.note && <Text style={styles.noteIcon}>📝</Text>}
                {item.isFavorite && <Text style={styles.favoriteStar}>⭐</Text>}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={contacts.length === 0 ? "👥" : "🔍"}
              title={contacts.length === 0 ? "Hali kontaktlar yo'q" : "Hech narsa topilmadi"}
              subtitle={contacts.length === 0 ? "Kontakt qo'shish uchun yuqoridagi + tugmani bosing" : undefined}
            />
          }
        />
        {!sortOnlineFirst && !search.trim() && sections.length > 1 && (
          <View style={styles.alphabetRail}>
            {sections.map((section, index) => (
              <TouchableOpacity
                key={section.title}
                style={styles.alphabetRailItem}
                onPress={() =>
                  sectionListRef.current?.scrollToLocation({ sectionIndex: index, itemIndex: 0, viewOffset: 0, animated: false })
                }
              >
                <Text style={styles.alphabetRailText}>{section.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

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

      <Modal visible={!!noteContact} transparent animationType="fade" onRequestClose={() => setNoteContact(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setNoteContact(null)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>Shaxsiy eslatma</Text>
            <Text style={styles.modalSubtitle}>{noteContact?.alias ?? noteContact?.user.displayName}</Text>
            <TextInput
              style={[styles.modalInput, styles.modalNoteInput]}
              value={noteInput}
              onChangeText={setNoteInput}
              placeholder="Faqat sizga ko'rinadigan eslatma..."
              placeholderTextColor={colors.textSecondary}
              autoFocus
              multiline
              maxLength={500}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setNoteContact(null)}>
                <Text style={styles.modalCancelText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={onSaveNote} disabled={savingNote}>
                {savingNote ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>Saqlash</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

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
  birthdayIcon: { backgroundColor: colors.border },
  addIconText: { fontSize: 18 },
  addText: { fontSize: 16, fontWeight: "500", color: colors.text },
  listContainer: { flex: 1 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  alphabetRail: {
    position: "absolute",
    right: 2,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  alphabetRailItem: { paddingVertical: 1, paddingHorizontal: 4 },
  alphabetRailText: { fontSize: 11, fontWeight: "600", color: colors.primary },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  name: { fontSize: 16, color: colors.text, flex: 1 },
  nameColumn: { flex: 1 },
  presenceLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  sortToggleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  sortToggleCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sortToggleCheckboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortToggleCheckmark: { color: "#fff", fontSize: 12, fontWeight: "700" },
  sortToggleText: { fontSize: 13, color: colors.textSecondary },
  requestInfo: { flex: 1 },
  requestMutual: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  favoriteStar: { fontSize: 14 },
  noteIcon: { fontSize: 14, marginRight: 4 },
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
  suggestionsRow: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  suggestionCard: {
    width: 112,
    alignItems: "center",
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  suggestionDismiss: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.border,
    zIndex: 1,
  },
  suggestionDismissText: { fontSize: 11, color: colors.textSecondary },
  suggestionName: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 6, maxWidth: "100%" },
  suggestionMutual: { fontSize: 11, color: colors.textSecondary, marginTop: 2, maxWidth: "100%" },
  suggestionAddButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 76,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionAddText: { color: "#fff", fontSize: 12, fontWeight: "600" },
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
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalNoteInput: { minHeight: 96, textAlignVertical: "top" },
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
