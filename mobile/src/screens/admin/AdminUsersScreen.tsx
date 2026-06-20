import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { adminApi, AdminUser } from "../../api/admin";

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p = 1, q = "") => {
    setLoading(true);
    try {
      const res = await adminApi.listUsers(p, q || undefined);
      setUsers(res.users);
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSearch = () => load(1, search);

  const toggleAdmin = async (user: AdminUser) => {
    Alert.alert(
      user.isAdmin ? "Admin huquqini olib tashlash" : "Admin qilish",
      `${user.displayName} ni ${user.isAdmin ? "oddiy foydalanuvchi" : "admin"} qilmoqchimisiz?`,
      [
        { text: "Bekor", style: "cancel" },
        {
          text: "Ha",
          style: "destructive",
          onPress: async () => {
            await adminApi.setUserAdmin(user.id, !user.isAdmin);
            load(page, search);
          },
        },
      ]
    );
  };

  const toggleVerified = async (user: AdminUser) => {
    if (user.isVerified) {
      await adminApi.setUserVerified(user.id, false);
      load(page, search);
    } else {
      Alert.alert("Tasdiqlash turi", "Qaysi turdagi tasdiq?", [
        { text: "Rasmiy", onPress: async () => { await adminApi.setUserVerified(user.id, true, "official"); load(page, search); } },
        { text: "Biznes", onPress: async () => { await adminApi.setUserVerified(user.id, true, "business"); load(page, search); } },
        { text: "Ijodkor", onPress: async () => { await adminApi.setUserVerified(user.id, true, "creator"); load(page, search); } },
        { text: "Bekor", style: "cancel" },
      ]);
    }
  };

  const deleteUser = (user: AdminUser) => {
    Alert.alert(
      "Foydalanuvchini o'chirish",
      `${user.displayName} (@${user.username}) ni o'chirmoqchimisiz? Bu qaytarib bo'lmaydi!`,
      [
        { text: "Bekor", style: "cancel" },
        {
          text: "O'chirish",
          style: "destructive",
          onPress: async () => {
            try {
              await adminApi.deleteUser(user.id);
              load(page, search);
            } catch {
              Alert.alert("Xatolik", "Foydalanuvchini o'chirishda xatolik yuz berdi");
            }
          },
        },
      ]
    );
  };

  const renderUser = ({ item }: { item: AdminUser }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.userName}>{item.displayName}</Text>
            {item.isVerified && <Text style={styles.badge}> ✅</Text>}
            {item.isAdmin && <Text style={styles.adminBadge}> ADMIN</Text>}
          </View>
          <Text style={styles.userSub}>@{item.username} • {item.phone}</Text>
          <Text style={styles.userDate}>
            Qo'shilgan: {new Date(item.createdAt).toLocaleDateString("uz")}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: item.isAdmin ? "#FF3B30" : "#007AFF" }]} onPress={() => toggleAdmin(item)}>
          <Text style={styles.actionText}>{item.isAdmin ? "Admin o'chirish" : "Admin qilish"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: item.isVerified ? "#FF9500" : "#34C759" }]} onPress={() => toggleVerified(item)}>
          <Text style={styles.actionText}>{item.isVerified ? "Tasdiq olish" : "Tasdiqlash"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#FF3B30" }]} onPress={() => deleteUser(item)}>
          <Text style={styles.actionText}>O'chirish</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Qidirish (ism, username, telefon)..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Qidirish</Text>
        </TouchableOpacity>
      </View>

      {loading && users.length === 0 ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#007AFF" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(i) => i.id}
          renderItem={renderUser}
          contentContainerStyle={{ padding: 16 }}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity disabled={page <= 1} onPress={() => load(page - 1, search)}>
                  <Text style={[styles.pageBtn, page <= 1 && { opacity: 0.3 }]}>‹ Oldingi</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
                <TouchableOpacity disabled={page >= totalPages} onPress={() => load(page + 1, search)}>
                  <Text style={[styles.pageBtn, page >= totalPages && { opacity: 0.3 }]}>Keyingi ›</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  searchRow: { flexDirection: "row", padding: 12, gap: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
    fontSize: 15,
  },
  searchBtn: { backgroundColor: "#007AFF", borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" },
  searchBtnText: { color: "#fff", fontWeight: "600" },
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userHeader: { flexDirection: "row", alignItems: "flex-start" },
  userName: { fontSize: 16, fontWeight: "700", color: "#000" },
  badge: { fontSize: 14 },
  adminBadge: { fontSize: 11, color: "#FF3B30", fontWeight: "800", marginLeft: 6 },
  userSub: { fontSize: 13, color: "#666", marginTop: 2 },
  userDate: { fontSize: 12, color: "#999", marginTop: 2 },
  actions: { flexDirection: "row", gap: 6, marginTop: 10 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", padding: 16, gap: 20 },
  pageBtn: { color: "#007AFF", fontSize: 15, fontWeight: "600" },
  pageInfo: { fontSize: 14, color: "#666" },
});
