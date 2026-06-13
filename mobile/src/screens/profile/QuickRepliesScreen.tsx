import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { QuickReply, useQuickRepliesStore } from "../../store/quickRepliesStore";
import { colors } from "../../theme/colors";

export function QuickRepliesScreen() {
  const quickReplies = useQuickRepliesStore((s) => s.quickReplies);
  const addQuickReply = useQuickRepliesStore((s) => s.addQuickReply);
  const updateQuickReply = useQuickRepliesStore((s) => s.updateQuickReply);
  const removeQuickReply = useQuickRepliesStore((s) => s.removeQuickReply);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const onAdd = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    addQuickReply(trimmed).catch(() => {});
    setNewText("");
  };

  const onStartEdit = (item: QuickReply) => {
    setEditingId(item.id);
    setEditingText(item.text);
  };

  const onSaveEdit = () => {
    const trimmed = editingText.trim();
    if (editingId && trimmed) {
      updateQuickReply(editingId, trimmed).catch(() => {});
    }
    setEditingId(null);
    setEditingText("");
  };

  const onRemove = (item: QuickReply) => {
    Alert.alert("O'chirish", "Bu tezkor javobni o'chirmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "O'chirish", style: "destructive", onPress: () => removeQuickReply(item.id).catch(() => {}) },
    ]);
  };

  const renderItem = ({ item }: { item: QuickReply }) => {
    if (editingId === item.id) {
      return (
        <View style={styles.row}>
          <TextInput
            style={styles.editInput}
            value={editingText}
            onChangeText={setEditingText}
            multiline
            autoFocus
          />
          <TouchableOpacity style={styles.iconButton} onPress={onSaveEdit} hitSlop={8}>
            <Text style={styles.iconText}>✓</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.row}>
        <Text style={styles.rowText} numberOfLines={4}>
          {item.text}
        </Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => onStartEdit(item)} hitSlop={8}>
          <Text style={styles.iconText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => onRemove(item)} hitSlop={8}>
          <Text style={styles.iconText}>🗑</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Text style={styles.hint}>
        Tez-tez yuboradigan matnlaringizni saqlang. Suhbatda "+" tugmasi orqali ularni bir bosishda yozish maydoniga
        qo'shishingiz mumkin.
      </Text>
      <FlatList
        data={quickReplies}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Hali tezkor javoblar yo'q</Text>
          </View>
        }
        style={styles.list}
      />
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          value={newText}
          onChangeText={setNewText}
          placeholder="Yangi tezkor javob matni"
          placeholderTextColor={colors.textSecondary}
          multiline
        />
        <TouchableOpacity style={styles.addButton} onPress={onAdd} disabled={!newText.trim()}>
          <Text style={styles.addButtonText}>Qo'shish</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  hint: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, padding: 16, paddingBottom: 8 },
  list: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  rowText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 20 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 16 },
  iconButton: { padding: 4 },
  iconText: { fontSize: 18 },
  editInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
  },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
  addRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  addInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
