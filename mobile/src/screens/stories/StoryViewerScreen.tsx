import { useCallback, useEffect, useState, useRef } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { storiesApi, StoryGroup } from "../../api/stories";
import { chatsApi } from "../../api/chats";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "StoryViewer">;
const { width, height } = Dimensions.get("window");

export function StoryViewerScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const [group, setGroup] = useState<StoryGroup | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const currentUser = useAuthStore((s) => s.user);
  const isOwn = userId === currentUser?.id;
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const onReplyToStory = async () => {
    if (!replyText.trim()) {
      inputRef.current?.focus();
      setPaused(true);
      return;
    }
    setSendingReply(true);
    try {
      const conversations = await chatsApi.list();
      const dm = conversations.find(
        (c) => c.type === "DIRECT" && c.participants?.some((p: any) => p.userId === userId)
      );
      if (dm) {
        navigation.replace("ChatRoom", { conversationId: dm.id, title: dm.title ?? group?.user.displayName ?? "" });
      } else {
        navigation.replace("UserProfile", { userId });
      }
    } catch {
      navigation.replace("UserProfile", { userId });
    }
    setSendingReply(false);
  };

  const loadStories = useCallback(async () => {
    try {
      const feed = await storiesApi.getFeed();
      const found = feed.find((g) => g.user.id === userId);
      setGroup(found ?? null);
    } catch {
      Alert.alert("Xatolik", "Hikoyalarni yuklab bo'lmadi");
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const story = group?.stories[index];

  useEffect(() => {
    if (story && !story.viewed && !isOwn) {
      storiesApi.viewStory(story.id).catch(() => {});
    }
  }, [story, isOwn]);

  useEffect(() => {
    if (!story || paused) return;
    const timer = setTimeout(() => {
      if (group && index < group.stories.length - 1) {
        setIndex(index + 1);
      } else {
        navigation.goBack();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [index, story, group, navigation, paused]);

  const onTap = (x: number) => {
    if (!group) return;
    if (x < width / 3) {
      if (index > 0) setIndex(index - 1);
      else navigation.goBack();
    } else {
      if (index < group.stories.length - 1) setIndex(index + 1);
      else navigation.goBack();
    }
  };

  const onDelete = async () => {
    if (!story) return;
    try {
      await storiesApi.deleteStory(story.id);
      if (group && group.stories.length <= 1) {
        navigation.goBack();
      } else {
        await loadStories();
        if (index > 0) setIndex(index - 1);
      }
    } catch {
      Alert.alert("Xatolik", "Hikoyani o'chirib bo'lmadi");
    }
  };

  if (loading) {
    return <View style={styles.container}><ActivityIndicator color="#fff" /></View>;
  }

  if (!group || !story) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Hikoyalar topilmadi</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>Yopish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = group.stories.map((_, i) => (
    <View key={i} style={[styles.progressBar, i <= index ? styles.progressBarActive : styles.progressBarInactive]} />
  ));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity
        style={styles.container}
        activeOpacity={1}
        onPress={(e) => onTap(e.nativeEvent.locationX)}
      >
        <Image source={{ uri: story.mediaUrl }} style={styles.image} resizeMode="contain" />
        <View style={styles.overlay}>
          <View style={styles.progressRow}>{progress}</View>
          <View style={styles.header}>
            <TouchableOpacity style={styles.userInfo} onPress={() => navigation.replace("UserProfile", { userId })}>
              <Text style={styles.displayName}>{group.user.displayName}</Text>
              <Text style={styles.timestamp}>
                {new Date(story.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          {story.caption && (
            <View style={styles.captionBox}>
              <Text style={styles.captionText}>{story.caption}</Text>
            </View>
          )}
          {isOwn ? (
            <View style={styles.footer}>
              <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>O'chirish</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.replyRow}>
              <TextInput
                ref={inputRef}
                style={styles.replyInput}
                placeholder="Javob yozing..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={replyText}
                onChangeText={setReplyText}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                maxLength={500}
              />
              <TouchableOpacity
                onPress={onReplyToStory}
                style={[styles.replySendBtn, sendingReply && { opacity: 0.5 }]}
                disabled={sendingReply}
              >
                {sendingReply ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.replySendText}>➤</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#fff", fontSize: 16 },
  image: { width, height, position: "absolute" },
  overlay: { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0, justifyContent: "space-between" as const },
  progressRow: { flexDirection: "row", paddingHorizontal: 8, paddingTop: 50, gap: 4 },
  progressBar: { flex: 1, height: 3, borderRadius: 2 },
  progressBarActive: { backgroundColor: colors.surface },
  progressBarInactive: { backgroundColor: "rgba(255,255,255,0.3)" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8 },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  displayName: { color: "#fff", fontWeight: "700", fontSize: 15 },
  timestamp: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  closeBtn: { marginTop: 16, padding: 12 },
  closeBtnText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  captionBox: { alignSelf: "center", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 20, maxWidth: "80%" },
  captionText: { color: "#fff", fontSize: 15 },
  footer: { alignItems: "center", paddingBottom: 40 },
  deleteBtn: { backgroundColor: "rgba(255,0,0,0.6)", borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  deleteBtnText: { color: "#fff", fontWeight: "600" },
  replyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 8,
  },
  replyInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  replySendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  replySendText: { fontSize: 18, color: "#fff" },
});
