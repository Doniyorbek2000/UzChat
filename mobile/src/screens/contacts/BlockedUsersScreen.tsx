import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { contactsApi } from "../../api/contacts";
import { usersApi } from "../../api/users";
import { Avatar } from "../../components/Avatar";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { BlockedUser, User } from "../../types";

export function BlockedUsersScreen() {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [blockingId, setBlockingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(false);
    contactsApi
      .listBlocked()
      .then(setBlocked)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    contactsApi.listBlocked().then(setBlocked).catch(() => {}).finally(() => setRefreshing(false));
  }, []);

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

  const onUnblock = (item: BlockedUser) => {
    setBlocked((prev) => prev.filter((b) => b.id !== item.id));
    contactsApi.unblock(item.user.id).catch(() => {
      load();
    });
  };

  const onBlock = async (target: User) => {
    if (blocked.some((b) => b.user.id === target.id)) {
      Alert.alert("Xatolik", "Foydalanuvchi allaqachon bloklangan");
      return;
    }
    setBlockingId(target.id);
    try {
      await contactsApi.block(target.id);
      setQuery("");
      setResults([]);
      load();
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Bloklab bo'lmadi");
    } finally {
      setBlockingId(null);
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
            <TouchableOpacity style={styles.blockButton} onPress={() => onBlock(item)} disabled={blockingId === item.id}>
              {blockingId === item.id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.blockButtonText}>Bloklash</Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <Text style={styles.searchEmptyText}>Hech narsa topilmadi</Text>
        )}
      </View>
      <FlatList
        data={blocked}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={item.user.avatarUrl} name={item.user.displayName} />
            <Text style={styles.name}>{item.user.displayName}</Text>
            <TouchableOpacity style={styles.unblockButton} onPress={() => onUnblock(item)}>
              <Text style={styles.unblockText}>Blokdan chiqarish</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  name: { fontSize: 16, color: colors.text, flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  unblockButton: { borderColor: colors.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  unblockText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchSpinner: { marginTop: 12 },
  resultRow: { flexDirection: "row", alignItems: "center", paddingTop: 12, gap: 12 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: "600", color: colors.text },
  resultUsername: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  blockButton: {
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 88,
    alignItems: "center",
  },
  blockButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  searchEmptyText: { textAlign: "center", color: colors.textSecondary, marginTop: 12, fontSize: 13 },
});
