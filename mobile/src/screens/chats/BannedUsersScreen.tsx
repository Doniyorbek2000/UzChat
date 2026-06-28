import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { chatsApi } from "../../api/chats";
import { usersApi } from "../../api/users";
import { Avatar } from "../../components/Avatar";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { BannedGroupMember, User } from "../../types";
import { formatJoinDate } from "../../utils/conversation";

type Props = NativeStackScreenProps<RootStackParamList, "BannedUsers">;

export function BannedUsersScreen({ route }: Props) {
  const { conversationId } = route.params;
  const [bans, setBans] = useState<BannedGroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [banningId, setBanningId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(false);
    chatsApi
      .listBannedUsers(conversationId)
      .then(setBans)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [conversationId]);

  useFocusEffect(load);

  useEffect(() => {
    const trimmed = query.trim().replace(/^@/, "");
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      usersApi
        .search(trimmed)
        .then((users) => {
          if (!cancelled) setResults(users);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const onUnban = async (userId: string) => {
    setBans((prev) => prev.filter((b) => b.user.id !== userId));
    try {
      await chatsApi.unbanUser(conversationId, userId);
    } catch {
      Alert.alert("Xatolik", "Blokdan chiqarib bo'lmadi");
      load();
    }
  };

  const onBan = async (target: User) => {
    if (bans.some((b) => b.user.id === target.id)) {
      Alert.alert("Xatolik", "Foydalanuvchi allaqachon bloklangan");
      return;
    }
    setBanningId(target.id);
    try {
      const ban = await chatsApi.banUserById(conversationId, target.id);
      setBans((prev) => [ban, ...prev]);
      setQuery("");
      setResults([]);
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Bloklab bo'lmadi");
    } finally {
      setBanningId(null);
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
    return <ErrorView message="Bloklangan foydalanuvchilarni yuklab bo'lmadi" onRetry={() => { setLoading(true); load(); }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Bloklangan foydalanuvchilar guruhga taklif havolasi orqali qayta qo'shila olmaydi va admin tomonidan qayta
        qo'shilmaydi.
      </Text>
      <View style={styles.searchSection}>
        <Text style={styles.searchLabel}>Foydalanuvchini bloklash</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Username bo'yicha qidirish"
          returnKeyType="search"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator style={styles.searchSpinner} color={colors.primary} />}
        {results.map((item) => (
          <View key={item.id} style={styles.resultRow}>
            <Avatar uri={item.avatarUrl} name={item.displayName} size={36} />
            <View style={styles.resultInfo}>
              <Text style={styles.resultName}>{item.displayName}</Text>
              <Text style={styles.resultUsername}>@{item.username}</Text>
            </View>
            <TouchableOpacity style={styles.banButton} onPress={() => onBan(item)} disabled={banningId === item.id}>
              {banningId === item.id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.banButtonText}>Bloklash</Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <Text style={styles.searchEmptyText}>Hech narsa topilmadi</Text>
        )}
      </View>
      <FlatList
          keyboardShouldPersistTaps="handled"
        data={bans}
        keyExtractor={(item) => item.user.id}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={item.user.avatarUrl} name={item.user.displayName} />
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{item.user.displayName}</Text>
              <Text style={styles.date}>Bloklangan: {formatJoinDate(item.createdAt)}</Text>
            </View>
            <TouchableOpacity style={styles.unbanButton} onPress={() => onUnban(item.user.id)}>
              <Text style={styles.unbanText}>Blokdan chiqarish</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Bloklangan foydalanuvchilar yo'q</Text>
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
  nameContainer: { flex: 1 },
  name: { fontSize: 16, color: colors.text },
  date: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  unbanButton: { borderColor: colors.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  unbanText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  searchSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  searchLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchSpinner: { marginTop: 12 },
  resultRow: { flexDirection: "row", alignItems: "center", paddingTop: 12, gap: 12 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: "600", color: colors.text },
  resultUsername: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  banButton: {
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 88,
    alignItems: "center",
  },
  banButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  searchEmptyText: { textAlign: "center", color: colors.textSecondary, marginTop: 12, fontSize: 13 },
});
