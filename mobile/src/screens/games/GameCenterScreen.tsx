import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { gamesApi, GameData } from "../../api/games";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "GameCenter">;

const CATEGORIES = [
  { key: "all", label: "Barchasi", icon: "🌐" },
  { key: "casual", label: "Oddiy", icon: "🎯" },
  { key: "puzzle", label: "Boshqotirma", icon: "🧩" },
  { key: "action", label: "Harakat", icon: "⚡" },
  { key: "multiplayer", label: "Ko'p o'yinchi", icon: "👥" },
];

export function GameCenterScreen({ navigation }: Props) {
  const [games, setGames] = useState<GameData[]>([]);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    const load = category === "all" ? gamesApi.getPopular() : gamesApi.getByCategory(category);
    load.then(setGames).catch(() => setError(true)).finally(() => setLoading(false));
  }, [category]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const load = category === "all" ? gamesApi.getPopular() : gamesApi.getByCategory(category);
    load.then(setGames).catch(() => {}).finally(() => setRefreshing(false));
  }, [category]);

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContent}
        renderItem={({ item }) => {
          const active = category === item.key;
          return (
            <TouchableOpacity
              style={[styles.catChip, active && styles.catChipActive]}
              onPress={() => setCategory(item.key)}
            >
              <Text style={styles.catIcon}>{item.icon}</Text>
              <Text style={[styles.catText, active && styles.catTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <>
          {renderHeader()}
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Yuklanmoqda...</Text>
          </View>
        </>
      ) : error ? (
        <>
          {renderHeader()}
          <ErrorView message="O'yinlarni yuklab bo'lmadi" onRetry={loadData} />
        </>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gameCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("GameView", { gameId: item.id, url: item.url, title: item.title })}
            >
              <View style={styles.gameIconContainer}>
                <Text style={styles.gameIconText}>{item.iconUrl ? "🎮" : "🕹️"}</Text>
              </View>
              <Text style={styles.gameTitle} numberOfLines={1}>{item.title}</Text>
              <View style={styles.gameMeta}>
                <Text style={styles.gameMetaText}>{item.playCount.toLocaleString()} o'yin</Text>
                {item.rating > 0 && <Text style={styles.gameRating}>⭐ {item.rating.toFixed(1)}</Text>}
              </View>
              <View style={styles.playBtn}>
                <Text style={styles.playBtnText}>O'ynash</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎮</Text>
              <Text style={styles.emptyTitle}>O'yinlar yo'q</Text>
              <Text style={styles.emptyHint}>Bu kategoriyada hali o'yinlar mavjud emas</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, color: colors.textSecondary },
  headerSection: { paddingVertical: 12 },
  categoryContent: { paddingHorizontal: 16, gap: 8 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catIcon: { fontSize: 14 },
  catText: { fontSize: 13, fontWeight: "500", color: colors.text },
  catTextActive: { color: "#fff", fontWeight: "600" },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { gap: 10, paddingHorizontal: 4 },
  gameCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  gameIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  gameIconText: { fontSize: 30 },
  gameTitle: { fontSize: 14, fontWeight: "600", color: colors.text, textAlign: "center", marginBottom: 6 },
  gameMeta: { alignItems: "center", gap: 2, marginBottom: 10 },
  gameMetaText: { fontSize: 11, color: colors.textSecondary },
  gameRating: { fontSize: 11, color: colors.warning, fontWeight: "500" },
  playBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  playBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
