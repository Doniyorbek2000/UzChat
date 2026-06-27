import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { stickersApi, StickerPack, Sticker } from "../../api/stickers";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "StickerPackView">;

export function StickerPackViewScreen({ route }: Props) {
  const { packId } = route.params;
  const [pack, setPack] = useState<StickerPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    stickersApi.getPack(packId).then(setPack).catch(() => {}).finally(() => setLoading(false));
  }, [packId]);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await stickersApi.install(packId);
      Alert.alert("Muvaffaqiyat", "Stiker to'plami o'rnatildi");
    } catch {
      Alert.alert("Xatolik", "O'rnatib bo'lmadi");
    }
    setInstalling(false);
  };

  const handleUninstall = async () => {
    setInstalling(true);
    try {
      await stickersApi.uninstall(packId);
      Alert.alert("Muvaffaqiyat", "Stiker to'plami olib tashlandi");
    } catch {
      Alert.alert("Xatolik", "Olib tashlab bo'lmadi");
    }
    setInstalling(false);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }
  if (!pack) {
    return <Text style={styles.emptyText}>To'plam topilmadi</Text>;
  }

  const renderSticker = ({ item }: { item: Sticker }) => (
    <View style={styles.stickerCell}>
      <Image source={{ uri: item.imageUrl }} style={styles.stickerImage} resizeMode="contain" />
      {item.emoji && <Text style={styles.stickerEmoji}>{item.emoji}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {pack.coverUrl && <Image source={{ uri: pack.coverUrl }} style={styles.cover} />}
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{pack.name}</Text>
          {pack.description && <Text style={styles.description}>{pack.description}</Text>}
          <Text style={styles.meta}>
            {pack.creator.displayName} · {pack.stickers.length} stiker · {pack.installCount} o'rnatish
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.installBtn} onPress={handleInstall} disabled={installing}>
          <Text style={styles.installBtnText}>{installing ? "..." : "O'rnatish"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.removeBtn} onPress={handleUninstall} disabled={installing}>
          <Text style={styles.removeBtnText}>Olib tashlash</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={pack.stickers}
        keyExtractor={(item) => item.id}
        renderItem={renderSticker}
        numColumns={4}
        contentContainerStyle={styles.grid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", padding: 16, backgroundColor: "#fff", gap: 12, alignItems: "center" },
  cover: { width: 80, height: 80, borderRadius: 16 },
  headerInfo: { flex: 1 },
  title: { fontSize: 20, fontWeight: "700", color: "#333" },
  description: { fontSize: 13, color: "#666", marginTop: 4 },
  meta: { fontSize: 12, color: "#999", marginTop: 4 },
  actions: { flexDirection: "row", padding: 12, gap: 10 },
  installBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  installBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  removeBtn: { flex: 1, backgroundColor: "#E5E5EA", borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  removeBtnText: { color: "#666", fontWeight: "600", fontSize: 15 },
  grid: { padding: 8, paddingBottom: 20 },
  stickerCell: { flex: 1, aspectRatio: 1, padding: 6, alignItems: "center", justifyContent: "center" },
  stickerImage: { width: "80%", height: "80%" },
  stickerEmoji: { fontSize: 12, marginTop: 2 },
  emptyText: { textAlign: "center", color: "#999", fontSize: 15, padding: 40 },
});
