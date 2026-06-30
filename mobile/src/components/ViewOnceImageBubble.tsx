import { useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { downloadAndDecryptFile, extensionFromName } from "../utils/mediaFile";
import { DecryptedMessage, useChatStore } from "../store/chatStore";
import { colors } from "../theme/colors";

const MAX_WIDTH = 220;
const MAX_HEIGHT = 280;

interface Props {
  message: DecryptedMessage;
  conversationKey: string;
  conversationId: string;
  isOwn: boolean;
  canView: boolean;
}

/** WhatsApp-style "view once" IMAGE message: shown as a placeholder until tapped, then deleted everywhere. */
export function ViewOnceImageBubble({ message, conversationKey, conversationId, isOwn, canView }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const viewOnceMedia = useChatStore((s) => s.viewOnceMedia);
  const meta = message.meta;

  const ratio = meta?.width && meta?.height ? meta.width / meta.height : 1;
  let width = MAX_WIDTH;
  let height = width / ratio;
  if (height > MAX_HEIGHT) {
    height = MAX_HEIGHT;
    width = height * ratio;
  }

  const onPress = async () => {
    if (!canView || loading || !message.mediaUrl || !meta) return;
    setLoading(true);
    setError(false);
    try {
      const localUri = await downloadAndDecryptFile(
        message.mediaUrl,
        meta.fileNonce,
        conversationKey,
        `${message.id}${extensionFromName(meta.name) || ".jpg"}`
      );
      setViewerUri(localUri);
      await viewOnceMedia(conversationId, message.id).catch(() => {});
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const onCloseViewer = () => {
    if (viewerUri) FileSystem.deleteAsync(viewerUri, { idempotent: true }).catch(() => {});
    setViewerUri(null);
  };

  let label: string;
  if (error) {
    label = "⚠️ Yuklab bo'lmadi. Qayta urinish uchun bosing";
  } else if (message.viewedAt) {
    label = "🔥 Ko'rilgan rasm";
  } else if (isOwn) {
    label = "🔥 Bir martalik rasm yuborildi";
  } else {
    label = "🔥 Bosing - bir marta ko'rish mumkin";
  }

  return (
    <>
      <Pressable
        style={[styles.box, { width, height }]}
        onPress={onPress}
        disabled={!canView || !!message.viewedAt || loading}
      >
        {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.label}>{label}</Text>}
      </Pressable>
      <Modal visible={!!viewerUri} transparent animationType="fade" onRequestClose={onCloseViewer}>
        <Pressable style={styles.viewerOverlay} onPress={onCloseViewer}>
          {viewerUri && <Image source={{ uri: viewerUri }} style={styles.viewerImage} resizeMode="contain" />}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: {
    width: "100%",
    height: "100%",
  },
});
