import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { faqApi, FaqArticleData } from "../../api/faq";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Faq">;

export function FaqScreen(_props: Props) {
  const [articles, setArticles] = useState<FaqArticleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const load = search.trim() ? faqApi.search(search.trim()) : faqApi.list();
    setLoading(true);
    load.then(setArticles).catch(() => {}).finally(() => setLoading(false));
  }, [search]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Savol qidirish..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
      />

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.faqCard} onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              <View style={styles.faqHeader}>
                <Text style={styles.faqCategory}>{item.category}</Text>
                <Text style={styles.faqArrow}>{expandedId === item.id ? "▼" : "▶"}</Text>
              </View>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              {expandedId === item.id && (
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              )}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>❓</Text>
              <Text style={styles.emptyText}>{search.trim() ? "Natija topilmadi" : "Savollar yo'q"}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  searchInput: { margin: 12, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: "#333" },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  faqCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 6 },
  faqHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  faqCategory: { fontSize: 11, fontWeight: "600", color: colors.primary, backgroundColor: `${colors.primary}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  faqArrow: { fontSize: 10, color: "#888" },
  faqQuestion: { fontSize: 15, fontWeight: "600", color: "#333" },
  faqAnswer: { fontSize: 14, color: "#666", lineHeight: 22, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F0F0F0" },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#333", marginTop: 12 },
});
