import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { cloudApi, CloudFileData, CloudFolderData, CloudUsage } from "../../api/cloud";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "CloudStorage">;

export function CloudStorageScreen(_props: Props) {
  const [files, setFiles] = useState<CloudFileData[]>([]);
  const [folders, setFolders] = useState<CloudFolderData[]>([]);
  const [usage, setUsage] = useState<CloudUsage | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | undefined>(undefined);
  const [folderStack, setFolderStack] = useState<{ id: string | undefined; name: string }[]>([{ id: undefined, name: "Bulut" }]);
  const [loading, setLoading] = useState(true);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      cloudApi.listFiles(currentFolder),
      cloudApi.listFolders(currentFolder),
      cloudApi.getUsage(),
    ]).then(([f, d, u]) => { setFiles(f); setFolders(d); setUsage(u); }).catch(() => {}).finally(() => setLoading(false));
  }, [currentFolder]);

  const navigateToFolder = (folder: CloudFolderData) => {
    setFolderStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolder(folder.id);
  };

  const goBack = () => {
    if (folderStack.length <= 1) return;
    const newStack = folderStack.slice(0, -1);
    setFolderStack(newStack);
    setCurrentFolder(newStack[newStack.length - 1].id);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const folder = await cloudApi.createFolder(newFolderName.trim(), currentFolder);
      setFolders((prev) => [...prev, folder]);
      setNewFolderName("");
      setShowCreateFolder(false);
    } catch {}
  };

  const deleteFile = (file: CloudFileData) => {
    Alert.alert("O'chirish", `"${file.name}" faylini o'chirmoqchimisiz?`, [
      { text: "Bekor qilish", style: "cancel" },
      { text: "O'chirish", style: "destructive", onPress: async () => {
        await cloudApi.deleteFile(file.id).catch(() => {});
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
      }},
    ]);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  return (
    <View style={styles.container}>
      {usage && (
        <View style={styles.usageBar}>
          <Text style={styles.usageText}>{formatSize(usage.totalSize)} ishlatilgan · {usage.fileCount} fayl</Text>
        </View>
      )}

      {folderStack.length > 1 && (
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>← {folderStack[folderStack.length - 2].name}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateFolder(!showCreateFolder)}>
        <Text style={styles.createBtnText}>+ Yangi papka</Text>
      </TouchableOpacity>

      {showCreateFolder && (
        <View style={styles.createForm}>
          <TextInput style={styles.input} placeholder="Papka nomi..." placeholderTextColor="#999" value={newFolderName} onChangeText={setNewFolderName} />
          <TouchableOpacity style={styles.submitBtn} onPress={createFolder}><Text style={styles.submitBtnText}>Yaratish</Text></TouchableOpacity>
        </View>
      )}

      <FlatList
        data={[...folders.map((f) => ({ ...f, isFolder: true as const })), ...files.map((f) => ({ ...f, isFolder: false as const }))]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.isFolder) {
            const folder = item as CloudFolderData & { isFolder: true };
            return (
              <TouchableOpacity style={styles.itemCard} onPress={() => navigateToFolder(folder)}>
                <Text style={styles.itemIcon}>📁</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{folder.name}</Text>
                  <Text style={styles.itemMeta}>{folder._count?.files ?? 0} fayl · {folder._count?.children ?? 0} papka</Text>
                </View>
              </TouchableOpacity>
            );
          }
          const file = item as CloudFileData & { isFolder: false };
          return (
            <TouchableOpacity style={styles.itemCard} onLongPress={() => deleteFile(file)}>
              <Text style={styles.itemIcon}>📄</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{file.name}</Text>
                <Text style={styles.itemMeta}>{formatSize(file.size)} · {new Date(file.createdAt).toLocaleDateString("uz-UZ")}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>☁️</Text>
            <Text style={styles.emptyText}>Bu papka bo'sh</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  usageBar: { backgroundColor: "#fff", padding: 12, alignItems: "center" },
  usageText: { fontSize: 12, color: "#888" },
  backBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  backBtnText: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  createBtn: { margin: 12, marginBottom: 4, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  createBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  createForm: { flexDirection: "row", marginHorizontal: 12, marginBottom: 8, gap: 8 },
  input: { flex: 1, backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: "#333" },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" },
  submitBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  itemCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 4, gap: 12 },
  itemIcon: { fontSize: 24 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "600", color: "#333" },
  itemMeta: { fontSize: 11, color: "#888", marginTop: 2 },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, fontWeight: "600", color: "#333", marginTop: 12 },
});
