import { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, FlatList } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { paymentsApi } from "../../api/payments";
import { contactsApi } from "../../api/contacts";
import { Contact } from "../../types";
import { Avatar } from "../../components/Avatar";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "SendPayment">;

export function SendPaymentScreen({ navigation }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const list = await contactsApi.list();
      setContacts(list);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const filteredContacts = contacts.filter(
    (c) =>
      c.user.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.user.username.toLowerCase().includes(search.toLowerCase())
  );

  const onSend = async () => {
    if (!selectedContact) {
      Alert.alert("Xatolik", "Qabul qiluvchini tanlang");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert("Xatolik", "To'g'ri miqdor kiriting");
      return;
    }
    setSending(true);
    try {
      await paymentsApi.send(selectedContact.user.id, parsedAmount, note.trim() || undefined);
      Alert.alert("Muvaffaqiyat", `${parsedAmount.toLocaleString()} UZS yuborildi`);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Pul yuborib bo'lmadi");
    } finally {
      setSending(false);
    }
  };

  if (selectedContact) {
    return (
      <View style={styles.container}>
        <View style={styles.recipientCard}>
          <Avatar uri={selectedContact.user.avatarUrl} name={selectedContact.user.displayName} size={48} />
          <View style={styles.recipientInfo}>
            <Text style={styles.recipientName}>{selectedContact.user.displayName}</Text>
            <Text style={styles.recipientUsername}>@{selectedContact.user.username}</Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedContact(null)}>
            <Text style={styles.changeBtn}>O'zgartirish</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Miqdor (UZS)</Text>
        <TextInput
          style={styles.input}
          placeholder="Masalan: 50000"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        <Text style={styles.label}>Izoh (ixtiyoriy)</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          placeholder="Nima uchun?"
          placeholderTextColor={colors.textSecondary}
          value={note}
          onChangeText={setNote}
          maxLength={200}
          multiline
        />

        <TouchableOpacity style={styles.sendBtn} onPress={onSend} disabled={sending}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendBtnText}>Yuborish</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Qabul qiluvchini tanlang</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Kontakt qidirish..."
        returnKeyType="search"
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <ErrorView message="Kontaktlarni yuklab bo'lmadi" onRetry={loadContacts} />
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={filteredContacts}
          keyExtractor={(item) => item.user.id}
          ItemSeparatorComponent={Separator}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.contactRow} onPress={() => setSelectedContact(item)}>
              <Avatar uri={item.user.avatarUrl} name={item.user.displayName} size={40} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.user.displayName}</Text>
                <Text style={styles.contactUsername}>@{item.user.username}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Kontaktlar topilmadi</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: colors.text, padding: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: "500", color: colors.text },
  contactUsername: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 68 },
  recipientCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    backgroundColor: colors.background,
    margin: 16,
    borderRadius: 12,
  },
  recipientInfo: { flex: 1 },
  recipientName: { fontSize: 16, fontWeight: "600", color: colors.text },
  recipientUsername: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  changeBtn: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  label: { fontSize: 13, color: colors.textSecondary, marginHorizontal: 16, marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteInput: { minHeight: 60, textAlignVertical: "top" },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 24,
    alignItems: "center",
  },
  sendBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
