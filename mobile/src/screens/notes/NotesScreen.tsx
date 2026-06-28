import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { notesApi, Note } from "../../api/notes";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

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

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    notesApi.list().then(setNotes).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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
      Alert.alert("Xatolik", "Eslatma yaratib bo'lmadi");
    }
    setSaving(false);
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const updated = await notesApi.update(note.id, { isPinned: !note.isPinned });
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    } catch {}
  };

  const handleDelete = (note: Note) => {
    Alert.alert("O'chirish", `"${note.title}" eslatmasini o'chirmoqchimisiz?`, [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            await notesApi.delete(note.id);
            setNotes((prev) => prev.filter((n) => n.id !== note.id));
          } catch {}
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  if (error) {
    return <ErrorView message="Eslatmalarni yuklab bo'lmadi" onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(!showCreate)}>
        <Text style={styles.createBtnText}>{showCreate ? "Bekor qilish" : "+ Yangi eslatma"}</Text>
      </TouchableOpacity>

      {showCreate && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Sarlavha..." placeholderTextColor="#999" value={title} onChangeText={setTitle} maxLength={200} />
          <TextInput style={[styles.input, styles.multiline]} placeholder="Matn..." placeholderTextColor="#999" value={content} onChangeText={setContent} multiline maxLength={10000} />
          <View style={styles.colorRow}>
            {NOTE_COLORS.map((c) => (
              <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotActive]} onPress={() => setSelectedColor(c)} />
            ))}
          </View>
          <TouchableOpacity style={[styles.submitBtn, (!title.trim() || !content.trim() || saving) && { opacity: 0.5 }]} onPress={handleCreate} disabled={!title.trim() || !content.trim() || saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Saqlash</Text>}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.noteCard, { backgroundColor: item.color }]}
            onLongPress={() => {
              Alert.alert(item.title, undefined, [
                { text: item.isPinned ? "Olib tashlash" : "Qadash", onPress: () => handleTogglePin(item) },
                { text: "O'chirish", style: "destructive", onPress: () => handleDelete(item) },
                { text: "Bekor qilish", style: "cancel" },
              ]);
            }}
          >
            {item.isPinned && <Text style={styles.pinIcon}>📌</Text>}
            <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.noteContent} numberOfLines={4}>{item.content}</Text>
            <Text style={styles.noteDate}>{new Date(item.updatedAt).toLocaleDateString("uz-UZ")}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>Eslatmalar yo'q</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  createBtn: { margin: 12, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  createBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  form: { marginHorizontal: 12, marginBottom: 8, gap: 8 },
  input: { backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  colorRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: colors.primary },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  submitBtnText: { color: "#fff", fontWeight: "600" },
  list: { paddingHorizontal: 8, paddingBottom: 20 },
  row: { justifyContent: "space-between", paddingHorizontal: 4 },
  noteCard: { width: "48%", borderRadius: 12, padding: 12, marginBottom: 8, minHeight: 120 },
  pinIcon: { fontSize: 12, position: "absolute", top: 8, right: 8 },
  noteTitle: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 6 },
  noteContent: { fontSize: 12, color: "#555", flex: 1 },
  noteDate: { fontSize: 10, color: colors.textSecondary, marginTop: 8 },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
});
