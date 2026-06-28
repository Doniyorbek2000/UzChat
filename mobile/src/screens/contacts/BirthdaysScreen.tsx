import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { contactsApi } from "../../api/contacts";
import { usersApi } from "../../api/users";
import { useChatStore } from "../../store/chatStore";
import { Avatar } from "../../components/Avatar";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { UpcomingBirthday } from "../../types";
import { formatBirthday, getBirthdayWishText } from "../../utils/birthday";

type Props = NativeStackScreenProps<RootStackParamList, "Birthdays">;

function daysUntilLabel(daysUntil: number): string {
  if (daysUntil === 0) return "Bugun";
  if (daysUntil === 1) return "Ertaga";
  return `${daysUntil} kundan keyin`;
}

export function BirthdaysScreen({ navigation }: Props) {
  const [birthdays, setBirthdays] = useState<UpcomingBirthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [congratulatingId, setCongratulatingId] = useState<string | null>(null);
  const createDirectConversation = useChatStore((s) => s.createDirectConversation);
  const setDraft = useChatStore((s) => s.setDraft);
  const contactAliases = useChatStore((s) => s.contactAliases);

  const load = useCallback(() => {
    contactsApi
      .listUpcomingBirthdays()
      .then((b) => { setBirthdays(b); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  const onCongratulate = async (item: UpcomingBirthday) => {
    if (congratulatingId) return;
    setCongratulatingId(item.user.id);
    try {
      const profile = await usersApi.getById(item.user.id);
      const conversation = await createDirectConversation(profile);
      await setDraft(conversation.id, getBirthdayWishText(item.user.displayName));
      navigation.navigate("ChatRoom", {
        conversationId: conversation.id,
        title: contactAliases[item.user.id] ?? item.user.displayName,
      });
    } catch {
      Alert.alert("Xatolik", "Suhbat ochib bo'lmadi");
    } finally {
      setCongratulatingId(null);
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
    return <ErrorView message="Tug'ilgan kunlarni yuklab bo'lmadi" onRetry={load} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={birthdays}
        keyExtractor={(item) => item.user.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("UserProfile", { userId: item.user.id })}>
            <Avatar uri={item.user.avatarUrl} name={item.user.displayName} />
            <View style={styles.info}>
              <Text style={styles.name}>{item.user.displayName}</Text>
              <Text style={styles.date}>🎂 {formatBirthday(item.user.birthdayDay, item.user.birthdayMonth)}</Text>
            </View>
            {item.daysUntil === 0 ? (
              <TouchableOpacity
                style={styles.congratsButton}
                disabled={congratulatingId === item.user.id}
                onPress={(e) => {
                  e.stopPropagation();
                  onCongratulate(item);
                }}
              >
                {congratulatingId === item.user.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.congratsButtonText}>🎉 Tabriklash</Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.daysLabel}>{daysUntilLabel(item.daysUntil)}</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Keyingi 30 kun ichida tug'ilgan kun yo'q</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, color: colors.text },
  date: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  daysLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  congratsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.primary + "20",
    minWidth: 96,
    alignItems: "center",
  },
  congratsButtonText: { fontSize: 12, color: colors.primary, fontWeight: "700" },
});
