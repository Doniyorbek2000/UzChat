import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { downloadAndDecryptFile, extensionFromName } from "../utils/mediaFile";
import { DecryptedMessage } from "../store/chatStore";
import { colors } from "../theme/colors";

const MAX_WIDTH = 220;
const MAX_HEIGHT = 280;

interface Props {
  message: DecryptedMessage;
  conversationKey: string;
}

export function MediaImageBubble({ message, conversationKey }: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [revealed, setRevealed] = useState(!message.isSpoiler);
  const meta = message.meta;

  useEffect(() => {
    let cancelled = false;
    if (!message.mediaUrl || !meta) return;

    downloadAndDecryptFile(message.mediaUrl, meta.fileNonce, conversationKey, `${message.id}${extensionFromName(meta.name) || ".jpg"}`)
      .then((localUri) => {
        if (!cancelled) setUri(localUri);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [message.id, message.mediaUrl, meta, conversationKey]);

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

  if (!uri) {
    return (
      <View style={[styles.box, { width, height }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Pressable onPress={() => (revealed ? setViewerOpen(true) : setRevealed(true))}>
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
      <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
        <Pressable style={styles.viewerOverlay} onPress={() => setViewerOpen(false)}>
          <Image source={{ uri }} style={styles.viewerImage} resizeMode="contain" />
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
