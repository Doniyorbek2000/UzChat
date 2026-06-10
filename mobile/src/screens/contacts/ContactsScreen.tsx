import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
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
      <FlatList
        data={contacts}
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
            <Text style={styles.emptyText}>Hali kontaktlar yo'q</Text>
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
});
