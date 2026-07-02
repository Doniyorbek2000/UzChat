import { View, Text, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { SUPPORTED_LOCALES, useI18nStore, useT } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "LanguageSettings">;

export function LanguageSettingsScreen(_props: Props) {
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  const t = useT();

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>{t("languageDesc")}</Text>
      <FlatList
        data={SUPPORTED_LOCALES}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const selected = item.code === locale;
          return (
            <TouchableOpacity
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => setLocale(item.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.flag}>{item.flag}</Text>
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.nativeName}</Text>
                <Text style={styles.code}>{item.code}</Text>
              </View>
              {selected && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hint: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    gap: 12,
  },
  rowSelected: { borderWidth: 1.5, borderColor: colors.primary },
  flag: { fontSize: 22 },
  rowText: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  code: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  check: { fontSize: 18, color: colors.primary, fontWeight: "700" },
});
