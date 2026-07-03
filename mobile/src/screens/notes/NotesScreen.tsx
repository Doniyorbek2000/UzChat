import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { notesApi, Note } from "../../api/notes";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Notes">;

const NOTE_COLORS = ["#FFF9C4", "#C8E6C9", "#BBDEFB", "#F8BBD0", "#E1BEE7", "#FFE0B2"];

export function NotesScreen(_props: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    notesApi.list().then(setNotes).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    notesApi.list().then(setNotes).catch(() => {}).finally(() => setRefreshing(false));
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const note = await notesApi.create({ title: title.trim(), content: content.trim(), color: selectedColor });
      setNotes((prev) => [note, ...prev]);
      setTitle("");
      setContent("");
      setShowCreate(false);
    } catch {
      Alert.alert(tr("Xatolik"), tr("Eslatma yaratib bo'lmadi"));
    }
    setSaving(false);
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const updated = await notesApi.update(note.id, { isPinned: !note.isPinned });
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    } catch {
      Alert.alert(tr("Xatolik"), tr("Eslatmani o'zgartirib bo'lmadi"));
    }
  };

  const handleDelete = (note: Note) => {
    Alert.alert(tr("O'chirish"), `"${note.title}" eslatmasini o'chirmoqchimisiz?`, [
      { text: tr("Bekor qilish"), style: "cancel" },
      {
        text: tr("O'chirish"),
        style: "destructive",
        onPress: async () => {
          try {
            await notesApi.delete(note.id);
            setNotes((prev) => prev.filter((n) => n.id !== note.id));
          } catch {
            Alert.alert(tr("Xatolik"), tr("Eslatmani o'chirib bo'lmadi"));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message={tr("Eslatmalarni yuklab bo'lmadi")} onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(!showCreate)} activeOpacity={0.7}>
        <Text style={styles.createBtnText}>{showCreate ? "✕ Bekor qilish" : "+ Yangi eslatma"}</Text>
      </TouchableOpacity>

      {showCreate && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={tr("Sarlavha...")}
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder={tr("Matn...")}
            placeholderTextColor={colors.textSecondary}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={10000}
          />
          <View style={styles.colorRow}>
            {NOTE_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotActive]}
                onPress={() => setSelectedColor(c)}
              />
            ))}
          </View>
          <TouchableOpacity
            style={[styles.submitBtn, (!title.trim() || !content.trim() || saving) && { opacity: 0.5 }]}
            onPress={handleCreate}
            disabled={!title.trim() || !content.trim() || saving}
            activeOpacity={0.7}
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>{tr("Saqlash")}</Text>}
          </TouchableOpacity>
        </View>
      )}

      {!showCreate && notes.length > 0 && (
        <Text style={styles.noteCount}>{notes.length} ta eslatma</Text>
      )}

      <FlatList
        keyboardShouldPersistTaps="handled"
        data={notes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.noteCard, { backgroundColor: item.color }]}
            activeOpacity={0.7}
            onLongPress={() => {
              Alert.alert(item.title, undefined, [
                { text: item.isPinned ? "📌 Olib tashlash" : "📌 Qadash", onPress: () => handleTogglePin(item) },
                { text: tr("🗑 O'chirish"), style: "destructive", onPress: () => handleDelete(item) },
                { text: tr("Bekor qilish"), style: "cancel" },
              ]);
            }}
          >
            {item.isPinned && <Text style={styles.pinIcon}>📌</Text>}
            <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.noteContent} numberOfLines={5}>{item.content}</Text>
            <Text style={styles.noteDate}>{new Date(item.updatedAt).toLocaleDateString("uz-UZ")}</Text>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>{tr("Eslatmalar yo'q")}</Text>
            <Text style={styles.emptyHint}>{tr("Fikrlaringizni yozib boring")}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  createBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  createBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  noteCount: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: 16, marginTop: 8, marginBottom: 4 },
  form: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  colorRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: colors.primary },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  submitBtnText: { color: "#fff", fontWeight: "600" },
  list: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 20 },
  row: { justifyContent: "space-between", paddingHorizontal: 4 },
  noteCard: {
    width: "48%",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    minHeight: 130,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  pinIcon: { fontSize: 12, position: "absolute", top: 10, right: 10 },
  noteTitle: { fontSize: 15, fontWeight: "700", color: "#333", marginBottom: 6 },
  noteContent: { fontSize: 12, color: "#555", flex: 1, lineHeight: 17 },
  noteDate: { fontSize: 10, color: "#888", marginTop: 8 },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
