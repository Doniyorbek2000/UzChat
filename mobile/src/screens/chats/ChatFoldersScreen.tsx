import { useCallback, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore } from "../../store/chatStore";
import { colors } from "../../theme/colors";
import { ChatFolder } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "ChatFolders">;

const MAX_FOLDERS = 10;

export function ChatFoldersScreen({ navigation }: Props) {
  const folders = useChatStore((s) => s.folders);
  const loadFolders = useChatStore((s) => s.loadFolders);
  const createFolder = useChatStore((s) => s.createFolder);
  const renameFolder = useChatStore((s) => s.renameFolder);
  const reorderFolders = useChatStore((s) => s.reorderFolders);
  const deleteFolder = useChatStore((s) => s.deleteFolder);
  const [newName, setNewName] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      loadFolders().catch(() => {});
    }, [loadFolders])
  );

  const onCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    if (folders.length >= MAX_FOLDERS) {
      Alert.alert("Xatolik", `Ko'pi bilan ${MAX_FOLDERS} ta papka yaratish mumkin`);
      return;
    }
    try {
      await createFolder(name);
      setNewName("");
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Papka yaratib bo'lmadi");
    }
  };

  const onRename = (folder: ChatFolder, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === folder.name) return;
    renameFolder(folder.id, trimmed).catch(() => {});
  };

  const onDelete = (folder: ChatFolder) => {
    Alert.alert("Papkani o'chirish", `"${folder.name}" papkasini o'chirmoqchimisiz?`, [
      { text: "Bekor qilish", style: "cancel" },
      { text: "O'chirish", style: "destructive", onPress: () => deleteFolder(folder.id).catch(() => {}) },
    ]);
  };

  const onMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= folders.length) return;
    const reordered = [...folders];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    reorderFolders(reordered.map((f) => f.id)).catch(() => {});
  };

  const renderItem = ({ item, index }: { item: ChatFolder; index: number }) => (
    <View style={styles.row}>
      <View style={styles.reorderColumn}>
        <TouchableOpacity disabled={index === 0} onPress={() => onMove(index, -1)} hitSlop={6}>
          <Text style={[styles.arrow, index === 0 && styles.arrowDisabled]}>▲</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={index === folders.length - 1} onPress={() => onMove(index, 1)} hitSlop={6}>
          <Text style={[styles.arrow, index === folders.length - 1 && styles.arrowDisabled]}>▼</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.nameInput}
        value={names[item.id] ?? item.name}
        onChangeText={(text) => setNames((prev) => ({ ...prev, [item.id]: text }))}
        onBlur={() => onRename(item, names[item.id] ?? item.name)}
      />
      <TouchableOpacity
        style={styles.chatsButton}
        onPress={() => navigation.navigate("EditChatFolder", { folderId: item.id })}
      >
        <Text style={styles.chatsButtonText}>Suhbatlar ({item.conversationIds.length})</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onDelete(item)} hitSlop={8}>
        <Text style={styles.deleteIcon}>🗑</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={folders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Hali papkalar yo'q</Text>
          </View>
        }
        ListFooterComponent={
          folders.length < MAX_FOLDERS ? (
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Yangi papka nomi"
                placeholderTextColor={colors.textSecondary}
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={onCreate}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addButton} onPress={onCreate}>
                <Text style={styles.addButtonText}>Qo'shish</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  reorderColumn: { gap: 2 },
  arrow: { fontSize: 12, color: colors.text, padding: 2 },
  arrowDisabled: { color: colors.border },
  nameInput: { flex: 1, fontSize: 16, color: colors.text, padding: 0 },
  chatsButton: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chatsButtonText: { fontSize: 13, color: colors.primaryDark, fontWeight: "500" },
  deleteIcon: { fontSize: 18 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 12 },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
  addRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  addInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButton: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  addButtonText: { color: "#fff", fontWeight: "600" },
});
