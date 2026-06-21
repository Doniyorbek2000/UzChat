import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { greetingsApi, SentCardData } from "../../api/greetings";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "GreetingCards">;

export function GreetingCardsScreen(_props: Props) {
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [items, setItems] = useState<SentCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const load = tab === "received" ? greetingsApi.getReceived() : greetingsApi.getSent();
    load.then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, [tab]);

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === "received" && styles.tabActive]} onPress={() => setTab("received")}>
          <Text style={[styles.tabText, tab === "received" && styles.tabTextActive]}>Kelgan kartochkalar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === "sent" && styles.tabActive]} onPress={() => setTab("sent")}>
          <Text style={[styles.tabText, tab === "sent" && styles.tabTextActive]}>Yuborilgan</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => {
            const person = tab === "received" ? item.sender : item.receiver;
            return (
              <View style={styles.cardItem}>
                <View style={styles.cardPreview}>
                  <Text style={styles.cardEmoji}>💌</Text>
                </View>
                <Text style={styles.cardTemplate}>{item.card.templateName}</Text>
                <Text style={styles.cardPerson}>{person?.displayName ?? ""}</Text>
                {item.message && <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>}
              </View>
            );
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💌</Text>
              <Text style={styles.emptyText}>{tab === "received" ? "Kartochkalar yo'q" : "Hali yuborilmagan"}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  tabs: { flexDirection: "row", padding: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: "#E5E5EA", alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: "600", color: "#666" },
  tabTextActive: { color: "#fff" },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 8, paddingBottom: 20 },
  row: { justifyContent: "space-between", paddingHorizontal: 4 },
  cardItem: { width: "48%", backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 8, alignItems: "center" },
  cardPreview: { width: 80, height: 60, borderRadius: 10, backgroundColor: "#FFF0F5", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  cardEmoji: { fontSize: 28 },
  cardTemplate: { fontSize: 13, fontWeight: "600", color: "#333", textAlign: "center" },
  cardPerson: { fontSize: 11, color: "#888", marginTop: 2 },
  cardMessage: { fontSize: 11, color: "#666", marginTop: 4, textAlign: "center", fontStyle: "italic" },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#333", marginTop: 12 },
});
