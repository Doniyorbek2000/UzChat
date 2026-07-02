import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { faqApi, FaqArticleData } from "../../api/faq";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";
import { tr } from "../../i18n";

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
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={tr("Savol qidirish...")}
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <ErrorView message={tr("Savollarni yuklab bo'lmadi")} onRetry={loadData} />
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isExpanded = expandedId === item.id;
            return (
              <TouchableOpacity
                style={styles.faqCard}
                activeOpacity={0.7}
                onPress={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <View style={styles.faqHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{item.category}</Text>
                  </View>
                  <Text style={styles.faqArrow}>{isExpanded ? "▼" : "▶"}</Text>
                </View>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                {isExpanded && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>❓</Text>
              <Text style={styles.emptyTitle}>{search.trim() ? "Natija topilmadi" : "Savollar yo'q"}</Text>
              <Text style={styles.emptyHint}>{search.trim() ? "Boshqa kalit so'z bilan qidiring" : "Tez orada savollar qo'shiladi"}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, height: "100%", padding: 0 },
  searchClear: { fontSize: 16, color: colors.textSecondary, paddingHorizontal: 4 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  faqCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  faqHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  categoryBadge: { backgroundColor: colors.primary + "15", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  categoryText: { fontSize: 11, fontWeight: "600", color: colors.primary },
  faqArrow: { fontSize: 10, color: colors.textSecondary },
  faqQuestion: { fontSize: 15, fontWeight: "600", color: colors.text, lineHeight: 21 },
  faqAnswer: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
