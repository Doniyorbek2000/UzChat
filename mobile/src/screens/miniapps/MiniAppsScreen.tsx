import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Image } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/types";
import { miniAppsApi, MiniApp } from "../../api/miniapps";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "MiniApps">;

const CATEGORIES = [
  { key: "all", label: "Barchasi" },
  { key: "mine", label: "Mening" },
  { key: "transport", label: "Transport" },
  { key: "food", label: "Ovqat" },
  { key: "health", label: "Sog'liq" },
  { key: "shopping", label: "Xaridlar" },
  { key: "finance", label: "Moliya" },
  { key: "games", label: "O'yinlar" },
  { key: "news", label: "Yangiliklar" },
  { key: "entertainment", label: "Ko'ngilochar" },
  { key: "travel", label: "Sayohat" },
  { key: "other", label: "Boshqa" },
];

export function MiniAppsScreen({ navigation }: Props) {
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate("CreateMiniApp")} style={{ marginRight: 8 }}>
          <Text style={{ color: colors.primary, fontSize: 28, fontWeight: "300" }}>+</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const [apps, setApps] = useState<MiniApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const list = category === "mine"
        ? await miniAppsApi.listMine()
        : await miniAppsApi.list(category === "all" ? undefined : category);
      setApps(list);
    } catch {}
    setLoading(false);
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      loadApps();
    }, [loadApps])
  );

  const filtered = apps.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Mini-dastur qidirish..."
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        contentContainerStyle={styles.categoryContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryChip, category === item.key && styles.categoryChipActive]}
            onPress={() => setCategory(item.key)}
          >
            <Text style={[styles.categoryText, category === item.key && styles.categoryTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.appCard}
              onPress={() => navigation.navigate("MiniAppView", { id: item.id, name: item.name, url: item.url })}
            >
              {item.iconUrl ? (
                <Image source={{ uri: item.iconUrl }} style={styles.appIcon} />
              ) : (
                <View style={[styles.appIcon, styles.appIconPlaceholder]}>
                  <Text style={styles.appIconText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.appName} numberOfLines={1}>{item.name}</Text>
              {item.description && (
                <Text style={styles.appDesc} numberOfLines={2}>{item.description}</Text>
              )}
              <Text style={styles.appCreator}>@{item.creator.username}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {category === "mine" ? "Siz hali mini-dastur yaratmagansiz" : "Mini-dasturlar topilmadi"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    margin: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryList: { flexGrow: 0, marginTop: 12 },
  categoryContent: { paddingHorizontal: 16, gap: 8 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { fontSize: 13, color: colors.textSecondary },
  categoryTextActive: { color: "#fff", fontWeight: "600" },
  grid: { padding: 12 },
  gridRow: { gap: 12 },
  appCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  appIcon: { width: 56, height: 56, borderRadius: 14, marginBottom: 10 },
  appIconPlaceholder: { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  appIconText: { color: "#fff", fontSize: 24, fontWeight: "700" },
  appName: { fontSize: 14, fontWeight: "600", color: colors.text, textAlign: "center" },
  appDesc: { fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 4 },
  appCreator: { fontSize: 11, color: colors.textSecondary, marginTop: 6 },
});
