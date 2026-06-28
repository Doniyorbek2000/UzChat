import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { themesApi, SharedTheme } from "../../api/themes";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "ThemeStore">;

export function ThemeStoreScreen({ navigation }: Props) {
  const [tab, setTab] = useState<"popular" | "mine">("popular");
  const [themes, setThemes] = useState<SharedTheme[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      if (search.trim()) {
        setThemes(await themesApi.search(search.trim()));
      } else if (tab === "mine") {
        setThemes(await themesApi.listMine());
      } else {
        setThemes(await themesApi.listPopular());
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);

  const handleInstall = async (themeId: string) => {
    try {
      await themesApi.install(themeId);
      Alert.alert("Muvaffaqiyat", "Mavzu o'rnatildi!");
    } catch {
      Alert.alert("Xatolik", "Mavzuni o'rnatib bo'lmadi");
    }
  };

  const renderTheme = ({ item }: { item: SharedTheme }) => (
    <TouchableOpacity style={styles.themeCard} onPress={() => handleInstall(item.id)}>
      <View style={styles.preview}>
        <View style={[styles.previewBg, { backgroundColor: item.backgroundColor }]}>
          <View style={[styles.previewHeader, { backgroundColor: item.surfaceColor }]}>
            <View style={[styles.previewDot, { backgroundColor: item.primaryColor }]} />
            <View style={[styles.previewBar, { backgroundColor: item.textColor, opacity: 0.3 }]} />
          </View>
          <View style={styles.previewBody}>
            <View style={[styles.msgBubble, { backgroundColor: item.primaryColor }]} />
            <View style={[styles.msgBubbleRight, { backgroundColor: item.surfaceColor }]} />
          </View>
        </View>
      </View>
      <View style={styles.themeInfo}>
        <Text style={styles.themeName}>{item.name}</Text>
        {item.description && <Text style={styles.themeDesc} numberOfLines={1}>{item.description}</Text>}
        <View style={styles.themeMeta}>
          <Text style={styles.themeMetaText}>{item.isDark ? "🌙 Qorong'u" : "☀️ Yorug'"}</Text>
          <Text style={styles.themeMetaText}>📥 {item.installCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Mavzularni qidirish..."
        returnKeyType="search"
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.tabs}>
        {(["popular", "mine"] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => { setTab(t); setSearch(""); }}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "popular" ? "Mashhur" : "Mening"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "mine" && (
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate("CreateTheme")}>
          <Text style={styles.createBtnText}>+ Yangi mavzu yaratish</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : error ? (
        <ErrorView message="Mavzularni yuklab bo'lmadi" onRetry={load} />
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={themes}
          keyExtractor={(item) => item.id}
          renderItem={renderTheme}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Mavzu topilmadi</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  searchInput: { margin: 12, backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border },
  tabs: { flexDirection: "row", paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.background, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  createBtn: { marginHorizontal: 12, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: "center", marginBottom: 8 },
  createBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 8, paddingBottom: 20 },
  row: { justifyContent: "space-between", paddingHorizontal: 4 },
  themeCard: { width: "48%", backgroundColor: colors.surface, borderRadius: 12, marginBottom: 10, overflow: "hidden" },
  preview: { height: 120 },
  previewBg: { flex: 1, padding: 6 },
  previewHeader: { height: 24, borderRadius: 4, flexDirection: "row", alignItems: "center", paddingHorizontal: 6, gap: 4, marginBottom: 6 },
  previewDot: { width: 10, height: 10, borderRadius: 5 },
  previewBar: { flex: 1, height: 4, borderRadius: 2 },
  previewBody: { flex: 1, gap: 4, justifyContent: "center" },
  msgBubble: { width: "60%", height: 14, borderRadius: 7, opacity: 0.8 },
  msgBubbleRight: { width: "50%", height: 14, borderRadius: 7, alignSelf: "flex-end", opacity: 0.5 },
  themeInfo: { padding: 10 },
  themeName: { fontSize: 14, fontWeight: "600", color: colors.text },
  themeDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  themeMeta: { flexDirection: "row", gap: 8, marginTop: 6 },
  themeMetaText: { fontSize: 10, color: colors.textSecondary },
  emptyText: { textAlign: "center", color: colors.textSecondary, fontSize: 15, padding: 40 },
});
