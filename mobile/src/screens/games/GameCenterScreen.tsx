import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { gamesApi, GameData } from "../../api/games";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "GameCenter">;

const CATEGORIES = [
  { key: "all", label: "Barchasi" },
  { key: "casual", label: "Oddiy" },
  { key: "puzzle", label: "Boshqotirma" },
  { key: "action", label: "Harakat" },
  { key: "multiplayer", label: "Ko'p o'yinchi" },
];

export function GameCenterScreen({ navigation }: Props) {
  const [games, setGames] = useState<GameData[]>([]);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    const load = category === "all" ? gamesApi.getPopular() : gamesApi.getByCategory(category);
    load.then(setGames).catch(() => setError(true)).finally(() => setLoading(false));
  }, [category]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <View style={styles.container}>
      <View style={styles.categories}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c.key} style={[styles.catBtn, category === c.key && styles.catBtnActive]} onPress={() => setCategory(c.key)}>
            <Text style={[styles.catText, category === c.key && styles.catTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : error ? (
        <ErrorView message="O'yinlarni yuklab bo'lmadi" onRetry={loadData} />
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.gameCard} onPress={() => navigation.navigate("GameView", { gameId: item.id, url: item.url, title: item.title })}>
              <View style={styles.gameIcon}>
                <Text style={styles.gameIconText}>{item.iconUrl ? "🎮" : "🕹️"}</Text>
              </View>
              <Text style={styles.gameTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.gameMeta}>{item.playCount.toLocaleString()} o'yin</Text>
              {item.rating > 0 && <Text style={styles.gameRating}>⭐ {item.rating.toFixed(1)}</Text>}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎮</Text>
              <Text style={styles.emptyText}>O'yinlar yo'q</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  categories: { flexDirection: "row", padding: 12, gap: 6, flexWrap: "wrap" },
  catBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.background },
  catBtnActive: { backgroundColor: colors.primary },
  catText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  catTextActive: { color: "#fff" },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 8, paddingBottom: 20 },
  row: { justifyContent: "space-between", paddingHorizontal: 4 },
  gameCard: { width: "48%", backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, alignItems: "center" },
  gameIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  gameIconText: { fontSize: 28 },
  gameTitle: { fontSize: 14, fontWeight: "600", color: colors.text, textAlign: "center" },
  gameMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  gameRating: { fontSize: 11, color: "#FF9500", marginTop: 2 },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
});
