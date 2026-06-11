import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { contactsApi } from "../../api/contacts";
import { useChatStore } from "../../store/chatStore";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { Contact } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "NewChat">;

export function NewChatScreen({ navigation }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const createDirectConversation = useChatStore((s) => s.createDirectConversation);
  const getOrCreateSavedMessages = useChatStore((s) => s.getOrCreateSavedMessages);

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

  useEffect(() => {
    contactsApi
      .list()
      .then(setContacts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const onSelect = async (contact: Contact) => {
    try {
      const conversation = await createDirectConversation(contact.user);
      navigation.replace("ChatRoom", { conversationId: conversation.id, title: contact.user.displayName });
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Suhbat yaratib bo'lmadi");
    }
  };

  const onSavedMessages = async () => {
    try {
      const conversation = await getOrCreateSavedMessages();
      navigation.replace("ChatRoom", { conversationId: conversation.id, title: "Shaxsiy yozuvlar" });
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Ochib bo'lmadi");
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
      <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate("NewGroup")}>
        <View style={styles.groupIcon}>
          <Text style={styles.groupIconText}>👥</Text>
        </View>
        <Text style={styles.actionText}>Yangi guruh</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate("AddContact")}>
        <View style={styles.groupIcon}>
          <Text style={styles.groupIconText}>➕</Text>
        </View>
        <Text style={styles.actionText}>Kontakt qo'shish</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate("JoinGroup")}>
        <View style={styles.groupIcon}>
          <Text style={styles.groupIconText}>🔗</Text>
        </View>
        <Text style={styles.actionText}>Havola orqali qo'shilish</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionRow} onPress={onSavedMessages}>
        <View style={styles.groupIcon}>
          <Text style={styles.groupIconText}>📝</Text>
        </View>
        <Text style={styles.actionText}>Shaxsiy yozuvlar</Text>
      </TouchableOpacity>

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
          <TouchableOpacity style={styles.row} onPress={() => onSelect(item)}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  actionRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  groupIconText: { fontSize: 18 },
  actionText: { fontSize: 16, fontWeight: "500", color: colors.text },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  name: { fontSize: 16, color: colors.text },
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
});
