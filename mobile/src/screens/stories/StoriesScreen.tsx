import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, RefreshControl } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { storiesApi, StoryGroup } from "../../api/stories";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { uploadPlainFile } from "../../utils/mediaFile";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Stories">;

export function StoriesScreen({ navigation }: Props) {
  const [feed, setFeed] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = useAuthStore((s) => s.user);

  const loadFeed = useCallback(async () => {
    try {
      const data = await storiesApi.getFeed();
      setFeed(data);
      setError(false);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const onAddStory = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const { url } = await uploadPlainFile(asset.uri, asset.mimeType ?? "image/jpeg");
      await storiesApi.create(url);
      await loadFeed();
    } catch {
      Alert.alert(tr("Xatolik"), tr("Hikoya yaratib bo'lmadi"));
    } finally {
      setUploading(false);
    }
  };

  const onViewStory = (group: StoryGroup) => {
    navigation.navigate("StoryViewer", { userId: group.user.id });
  };

  const myStories = feed.find((g) => g.user.id === currentUser?.id);
  const otherStories = feed.filter((g) => g.user.id !== currentUser?.id);
  const hasUnviewedStories = (group: StoryGroup) => group.stories.some((s) => !s.viewed);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message={tr("Hikoyalarni yuklab bo'lmadi")} onRetry={() => { setLoading(true); loadFeed(); }} />;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.myStoryRow} onPress={myStories ? () => onViewStory(myStories) : onAddStory}>
        <View style={styles.avatarWrap}>
          <Avatar uri={currentUser?.avatarUrl} name={currentUser?.displayName ?? ""} size={56} />
          {!myStories && (
            <View style={styles.addBadge}>
              <Text style={styles.addBadgeText}>+</Text>
            </View>
          )}
        </View>
        <View style={styles.myStoryInfo}>
          <Text style={styles.myStoryTitle}>{tr("Mening hikoyam")}</Text>
          <Text style={styles.myStorySubtitle}>
            {myStories ? `${myStories.stories.length} hikoya` : "Hikoya qo'shish uchun bosing"}
          </Text>
        </View>
      </TouchableOpacity>

      {uploading && (
        <View style={styles.uploadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.uploadingText}> {tr("Yuklanmoqda...")}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.addButton} onPress={onAddStory} disabled={uploading}>
        <Text style={styles.addButtonText}>+ Yangi hikoya</Text>
      </TouchableOpacity>

      {otherStories.length > 0 && (
        <Text style={styles.sectionTitle}>{tr("So'nggi yangiliklar")}</Text>
      )}
      <FlatList
        data={otherStories}
        keyExtractor={(item) => item.user.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); storiesApi.getFeed().then(setFeed).catch(() => {}).finally(() => setRefreshing(false)); }} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.storyRow} onPress={() => onViewStory(item)}>
            <View style={[styles.storyAvatarRing, hasUnviewedStories(item) && styles.storyAvatarRingActive]}>
              <Avatar uri={item.user.avatarUrl} name={item.user.displayName} size={50} />
            </View>
            <View style={styles.storyInfo}>
              <Text style={styles.storyName}>{item.user.displayName}</Text>
              <Text style={styles.storyTime}>
                {new Date(item.stories[0].createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>{tr("Hali hikoyalar yo'q")}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  myStoryRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  avatarWrap: { position: "relative" },
  addBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.surface,
  },
  addBadgeText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  myStoryInfo: { flex: 1 },
  myStoryTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  myStorySubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  uploadingRow: { flexDirection: "row", alignItems: "center", padding: 8, justifyContent: "center" },
  uploadingText: { color: colors.textSecondary, fontSize: 13 },
  addButton: { alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  addButtonText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, paddingHorizontal: 12, paddingTop: 16, paddingBottom: 4 },
  storyRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  storyAvatarRing: { borderRadius: 28, borderWidth: 2, borderColor: colors.border, padding: 2 },
  storyAvatarRingActive: { borderColor: colors.primary },
  storyInfo: { flex: 1 },
  storyName: { fontSize: 16, fontWeight: "500", color: colors.text },
  storyTime: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
