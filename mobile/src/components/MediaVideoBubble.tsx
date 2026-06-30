import { useCallback, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Video, ResizeMode } from "expo-av";
import { downloadAndDecryptFile, extensionFromName, formatDuration } from "../utils/mediaFile";
import { DecryptedMessage } from "../store/chatStore";
import { colors } from "../theme/colors";

const MAX_WIDTH = 220;
const MAX_HEIGHT = 280;

interface Props {
  message: DecryptedMessage;
  conversationKey: string;
}

/** Inline-playable VIDEO message bubble: shows a thumbnail placeholder until tapped, then plays fullscreen. */
export function MediaVideoBubble({ message, conversationKey }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const meta = message.meta;

  const ratio = meta?.width && meta?.height ? meta.width / meta.height : 16 / 9;
  let width = MAX_WIDTH;
  let height = width / ratio;
  if (height > MAX_HEIGHT) {
    height = MAX_HEIGHT;
    width = height * ratio;
  }

  const onPress = useCallback(async () => {
    if (!message.mediaUrl || !meta || loading) return;
    if (uri) {
      setPlayerOpen(true);
      return;
    }
    setLoading(true);
    try {
      const localUri = await downloadAndDecryptFile(
        message.mediaUrl,
        meta.fileNonce,
        conversationKey,
        `${message.id}${extensionFromName(meta.name) || ".mp4"}`
      );
      setUri(localUri);
      setPlayerOpen(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [message.mediaUrl, message.id, meta, conversationKey, loading, uri]);

  if (!meta) return null;

  if (error) {
    return (
      <View style={[styles.box, { width, height }]}>
        <Text style={styles.errorText}>⚠️ Yuklab bo'lmadi</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable style={[styles.box, { width, height }]} onPress={onPress} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Text style={styles.playIcon}>▶️</Text>
            {meta.duration != null && <Text style={styles.duration}>{formatDuration(meta.duration)}</Text>}
          </>
        )}
      </Pressable>
      <Modal visible={playerOpen} transparent animationType="fade" onRequestClose={() => setPlayerOpen(false)}>
        <Pressable style={styles.viewerOverlay} onPress={() => setPlayerOpen(false)}>
          {uri && (
            <Video
              source={{ uri }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              useNativeControls
            />
          )}
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
  playIcon: {
    fontSize: 32,
  },
  duration: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
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
  video: {
    width: "100%",
    height: "100%",
  },
});
