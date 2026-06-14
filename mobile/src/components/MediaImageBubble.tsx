import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { downloadAndDecryptFile, extensionFromName, getCachedFileUri } from "../utils/mediaFile";
import { DecryptedMessage } from "../store/chatStore";
import { useChatSettingsStore } from "../store/chatSettingsStore";
import { colors } from "../theme/colors";

const MAX_WIDTH = 220;
const MAX_HEIGHT = 280;

interface Props {
  message: DecryptedMessage;
  conversationKey: string;
  // When provided, tapping a revealed image calls this instead of opening the
  // built-in single-image modal (used to open a swipeable gallery instead).
  onOpenViewer?: () => void;
}

export function MediaImageBubble({ message, conversationKey, onOpenViewer }: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [needsDownload, setNeedsDownload] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [revealed, setRevealed] = useState(!message.isSpoiler);
  const autoDownloadMedia = useChatSettingsStore((s) => s.autoDownloadMedia);
  const meta = message.meta;
  const cacheKey = meta ? `${message.id}${extensionFromName(meta.name) || ".jpg"}` : "";

  const download = useCallback(() => {
    if (!message.mediaUrl || !meta) return;
    setNeedsDownload(false);
    downloadAndDecryptFile(message.mediaUrl, meta.fileNonce, conversationKey, cacheKey)
      .then(setUri)
      .catch(() => setError(true));
  }, [message.mediaUrl, meta, conversationKey, cacheKey]);

  useEffect(() => {
    let cancelled = false;
    if (!message.mediaUrl || !meta) return;

    if (!autoDownloadMedia) {
      getCachedFileUri(cacheKey).then((cached) => {
        if (cancelled) return;
        if (cached) setUri(cached);
        else setNeedsDownload(true);
      });
      return () => {
        cancelled = true;
      };
    }

    downloadAndDecryptFile(message.mediaUrl, meta.fileNonce, conversationKey, cacheKey)
      .then((localUri) => {
        if (!cancelled) setUri(localUri);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [message.id, message.mediaUrl, meta, conversationKey, autoDownloadMedia, cacheKey]);

  const ratio = meta?.width && meta?.height ? meta.width / meta.height : 1;
  let width = MAX_WIDTH;
  let height = width / ratio;
  if (height > MAX_HEIGHT) {
    height = MAX_HEIGHT;
    width = height * ratio;
  }

  if (error) {
    return (
      <View style={[styles.box, { width, height }]}>
        <Text style={styles.errorText}>⚠️ Yuklab bo'lmadi</Text>
      </View>
    );
  }

  if (needsDownload) {
    return (
      <Pressable style={[styles.box, { width, height }]} onPress={download}>
        <Text style={styles.downloadIcon}>⬇️</Text>
        <Text style={styles.downloadText}>Yuklab olish</Text>
      </Pressable>
    );
  }

  if (!uri) {
    return (
      <View style={[styles.box, { width, height }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => (revealed ? (onOpenViewer ? onOpenViewer() : setViewerOpen(true)) : setRevealed(true))}
      >
        <Image
          source={{ uri }}
          style={[styles.image, { width, height }, !revealed && styles.spoilerImage]}
          resizeMode="cover"
          blurRadius={revealed ? 0 : 40}
        />
        {!revealed && (
          <View style={styles.spoilerOverlay}>
            <Text style={styles.spoilerIcon}>👁</Text>
            <Text style={styles.spoilerText}>Ko'rsatish uchun bosing</Text>
          </View>
        )}
      </Pressable>
      {!onOpenViewer && (
        <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
          <Pressable style={styles.viewerOverlay} onPress={() => setViewerOpen(false)}>
            <Image source={{ uri }} style={styles.viewerImage} resizeMode="contain" />
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    borderRadius: 8,
  },
  spoilerImage: {
    opacity: 0.6,
  },
  spoilerOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  spoilerIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  spoilerText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  downloadIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  downloadText: {
    color: colors.textSecondary,
    fontSize: 12,
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
