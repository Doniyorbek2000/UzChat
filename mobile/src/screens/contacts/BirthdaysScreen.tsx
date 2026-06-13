import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { contactsApi } from "../../api/contacts";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { UpcomingBirthday } from "../../types";
import { formatBirthday } from "../../utils/birthday";

type Props = NativeStackScreenProps<RootStackParamList, "Birthdays">;

function daysUntilLabel(daysUntil: number): string {
  if (daysUntil === 0) return "Bugun";
  if (daysUntil === 1) return "Ertaga";
  return `${daysUntil} kundan keyin`;
}

export function BirthdaysScreen({ navigation }: Props) {
  const [birthdays, setBirthdays] = useState<UpcomingBirthday[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    contactsApi
      .listUpcomingBirthdays()
      .then(setBirthdays)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
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
            <Text style={[styles.daysLabel, item.daysUntil === 0 && styles.daysLabelToday]}>{daysUntilLabel(item.daysUntil)}</Text>
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
  daysLabelToday: { color: colors.primary, fontWeight: "700" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
});
