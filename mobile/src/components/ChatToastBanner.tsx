import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToastStore } from "../store/toastStore";
import { navigationRef } from "../navigation/navigationRef";
import { Avatar } from "./Avatar";
import { colors } from "../theme/colors";

const DISPLAY_MS = 4000;

export function ChatToastBanner() {
  const toast = useToastStore((s) => s.toast);
  const hideToast = useToastStore((s) => s.hideToast);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(hideToast, DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  if (!toast) return null;

  const onPress = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate("ChatRoom", { conversationId: toast.conversationId, title: toast.title });
    }
    hideToast();
  };

  return (
    <Pressable style={[styles.container, { top: insets.top + 8 }]} onPress={onPress}>
      <Avatar uri={toast.avatarUrl} name={toast.title} size={36} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {toast.title}
        </Text>
        <Text style={styles.body} numberOfLines={1}>
          {toast.body}
        </Text>
      </View>
      <Pressable style={styles.closeButton} onPress={hideToast} hitSlop={8}>
        <Text style={styles.close}>✕</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 10,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 1000,
  },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: "700", color: colors.text },
  body: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  closeButton: { padding: 4 },
  close: { fontSize: 16, color: colors.textSecondary },
});
