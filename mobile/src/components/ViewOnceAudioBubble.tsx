import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { downloadAndDecryptFile, extensionFromName, formatDuration } from "../utils/mediaFile";
import { DecryptedMessage, useChatStore } from "../store/chatStore";
import { colors } from "../theme/colors";

interface Props {
  message: DecryptedMessage;
  conversationKey: string;
  conversationId: string;
  isOwn: boolean;
  canView: boolean;
}

/** WhatsApp-style "view once" AUDIO message: shown as a placeholder until played once, then deleted everywhere. */
export function ViewOnceAudioBubble({ message, conversationKey, conversationId, isOwn, canView }: Props) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const viewOnceMedia = useChatStore((s) => s.viewOnceMedia);
  const meta = message.meta;
  const player = useAudioPlayer(localUri);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (localUri) player.play();
  }, [localUri, player]);

  useEffect(() => {
    if (status.didJustFinish && localUri) {
      FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
      setLocalUri(null);
    }
  }, [status.didJustFinish, localUri]);

  const onPress = async () => {
    if (!canView || loading || !message.mediaUrl || !meta) return;
    setLoading(true);
    try {
      const uri = await downloadAndDecryptFile(
        message.mediaUrl,
        meta.fileNonce,
        conversationKey,
        `${message.id}${extensionFromName(meta.name) || ".m4a"}`
      );
      await viewOnceMedia(conversationId, message.id).catch(() => {});
      setLocalUri(uri);
    } finally {
      setLoading(false);
    }
  };

  let label: string;
  if (message.viewedAt) {
    label = "🔥 Eshitilgan ovozli xabar";
  } else if (isOwn) {
    label = "🔥 Bir martalik ovozli xabar yuborildi";
  } else {
    label = `🔥 Bosing - bir marta eshitish mumkin (${formatDuration(meta?.duration ?? 0)})`;
  }

  return (
    <Pressable style={styles.box} onPress={onPress} disabled={!canView || !!message.viewedAt || loading}>
      {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    minWidth: 160,
    maxWidth: 220,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
});
