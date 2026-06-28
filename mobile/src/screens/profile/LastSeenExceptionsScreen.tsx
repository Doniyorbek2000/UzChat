import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { contactsApi } from "../../api/contacts";
import { usersApi } from "../../api/users";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { Contact, LastSeenException } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "LastSeenExceptions">;

export function LastSeenExceptionsScreen({}: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [exceptions, setExceptions] = useState<LastSeenException[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    Promise.all([contactsApi.list(), usersApi.listLastSeenExceptions()])
      .then(([c, e]) => {
        setContacts(c);
        setExceptions(e);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  const exceptionByUserId = useMemo(() => {
    const map = new Map<string, "ALLOW" | "DENY">();
    for (const e of exceptions) map.set(e.user.id, e.mode);
    return map;
  }, [exceptions]);

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

  const onSetMode = async (userId: string, mode: "ALLOW" | "DENY" | null) => {
    try {
      if (mode === null) await usersApi.removeLastSeenException(userId);
      else await usersApi.setLastSeenException(userId, mode);
      load();
    } catch {
      Alert.alert("Xatolik", "O'zgartirib bo'lmadi");
    }
  };

  const onContactPress = (contact: Contact) => {
    const current = exceptionByUserId.get(contact.user.id);
    const name = contact.alias ?? contact.user.displayName;
    const options: { text: string; style?: "default" | "destructive" | "cancel"; onPress?: () => void }[] = [
      { text: "Har doim ko'rsatish", onPress: () => onSetMode(contact.user.id, "ALLOW") },
      { text: "Har doim yashirish", onPress: () => onSetMode(contact.user.id, "DENY") },
    ];
    if (current) {
      options.push({ text: "Standart sozlamaga qaytarish", onPress: () => onSetMode(contact.user.id, null) });
    }
    options.push({ text: "Bekor qilish", style: "cancel" });
    Alert.alert(name, undefined, options);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Tanlangan kontaktlar uchun "Oxirgi marta onlayn" sozlamasiga istisno belgilang - ular uchun umumiy
        sozlamadan qat'i nazar, har doim ko'rsatish yoki har doim yashirishni tanlang.
      </Text>
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
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => {
          const mode = exceptionByUserId.get(item.user.id);
          return (
            <TouchableOpacity style={styles.row} onPress={() => onContactPress(item)}>
              <Avatar uri={item.user.avatarUrl} name={item.user.displayName} />
              <Text style={styles.name}>{item.alias ?? item.user.displayName}</Text>
              {mode === "ALLOW" && <Text style={styles.badgeAllow}>Har doim ko'rsatish</Text>}
              {mode === "DENY" && <Text style={styles.badgeDeny}>Har doim yashirish</Text>}
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
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  hint: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, padding: 16, paddingBottom: 8 },
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
  badgeAllow: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  badgeDeny: { fontSize: 12, color: colors.danger, fontWeight: "600" },
});
