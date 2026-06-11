import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { downloadAndDecryptFile, formatDuration } from "../utils/mediaFile";
import { DecryptedMessage } from "../store/chatStore";
import { usePlaybackSpeedStore } from "../store/playbackSpeedStore";
import { colors } from "../theme/colors";

interface Props {
  message: DecryptedMessage;
  conversationKey: string;
}

export function MediaAudioBubble({ message, conversationKey }: Props) {
  const meta = message.meta;
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const player = useAudioPlayer(localUri);
  const status = useAudioPlayerStatus(player);
  const speed = usePlaybackSpeedStore((s) => s.speed);
  const cycleSpeed = usePlaybackSpeedStore((s) => s.cycleSpeed);

  useEffect(() => {
    if (!localUri) return;
    player.setPlaybackRate(speed, "high");
  }, [localUri, speed, player]);

  useEffect(() => {
    if (!meta || !message.mediaUrl) return;
    let cancelled = false;
    downloadAndDecryptFile(message.mediaUrl, meta.fileNonce, conversationKey, `${message.id}.m4a`)
      .then((uri) => {
        if (!cancelled) setLocalUri(uri);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [message.id, message.mediaUrl, meta?.fileNonce, conversationKey]);

  if (!meta) return null;

  const onPress = () => {
    if (!localUri) return;
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish) player.seekTo(0);
    player.play();
  };

  const duration = status.duration || meta.duration || 0;
  const remaining = status.playing || status.currentTime > 0 ? Math.max(duration - status.currentTime, 0) : duration;
  const progress = duration > 0 ? Math.min(status.currentTime / duration, 1) : 0;

  return (
    <Pressable style={styles.container} onPress={onPress} disabled={!localUri && !error}>
      <View style={styles.icon}>
        {!localUri && !error ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.iconText}>{status.playing ? "⏸" : "▶"}</Text>
        )}
      </View>
      <View style={styles.track}>
        <View style={[styles.progress, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.duration}>{formatDuration(remaining)}</Text>
      <Pressable style={styles.speedButton} onPress={cycleSpeed} hitSlop={8}>
        <Text style={styles.speedText}>{speed}x</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 160,
    maxWidth: 220,
    gap: 10,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 14, color: "#fff" },
  track: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progress: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  duration: { fontSize: 12, color: colors.textSecondary, minWidth: 32, textAlign: "right" },
  speedButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  speedText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
});
