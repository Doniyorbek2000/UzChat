import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
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
  const createDirectConversation = useChatStore((s) => s.createDirectConversation);

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

      <FlatList
        data={contacts}
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
});
