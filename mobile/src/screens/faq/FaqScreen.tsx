import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { faqApi, FaqArticleData } from "../../api/faq";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "Faq">;

export function FaqScreen(_props: Props) {
  const [articles, setArticles] = useState<FaqArticleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [error, setError] = useState(false);

  const loadData = useCallback(() => {
    const load = search.trim() ? faqApi.search(search.trim()) : faqApi.list();
    setLoading(true);
    setError(false);
    load.then(setArticles).catch(() => setError(true)).finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Savol qidirish..."
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
      />

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : error ? (
        <ErrorView message="Savollarni yuklab bo'lmadi" onRetry={loadData} />
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
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
  searchInput: { margin: 12, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: colors.text },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  faqCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 6 },
  faqHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  faqCategory: { fontSize: 11, fontWeight: "600", color: colors.primary, backgroundColor: `${colors.primary}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  faqArrow: { fontSize: 10, color: colors.textSecondary },
  faqQuestion: { fontSize: 15, fontWeight: "600", color: colors.text },
  faqAnswer: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
});
