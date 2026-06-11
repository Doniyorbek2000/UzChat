import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { contactsApi } from "../../api/contacts";
import { useChatStore } from "../../store/chatStore";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { Contact } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "ShareContact">;

export function ShareContactScreen({ route, navigation }: Props) {
  const { conversationId } = route.params;
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const sendContactMessage = useChatStore((s) => s.sendContactMessage);

  useEffect(() => {
    contactsApi
      .list()
      .then(setContacts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const onSelect = async (contact: Contact) => {
    if (sendingId) return;
    setSendingId(contact.id);
    try {
      await sendContactMessage(conversationId, contact.user);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Kontaktni yuborib bo'lmadi");
    } finally {
      setSendingId(null);
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
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => onSelect(item)} disabled={!!sendingId}>
            <Avatar uri={item.user.avatarUrl} name={item.user.displayName} />
            <Text style={styles.name}>{item.alias ?? item.user.displayName}</Text>
            {sendingId === item.id && <ActivityIndicator color={colors.primary} />}
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
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  name: { fontSize: 16, color: colors.text, flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
});
