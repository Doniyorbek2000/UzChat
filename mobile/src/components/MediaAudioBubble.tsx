import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { downloadAndDecryptFile, formatDuration, getCachedFileUri } from "../utils/mediaFile";
import { DecryptedMessage } from "../store/chatStore";
import { usePlaybackSpeedStore } from "../store/playbackSpeedStore";
import { useChatSettingsStore } from "../store/chatSettingsStore";
import { colors } from "../theme/colors";

interface Props {
  message: DecryptedMessage;
  conversationKey: string;
}

export function MediaAudioBubble({ message, conversationKey }: Props) {
  const meta = message.meta;
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [needsDownload, setNeedsDownload] = useState(false);
  const player = useAudioPlayer(localUri);
  const status = useAudioPlayerStatus(player);
  const speed = usePlaybackSpeedStore((s) => s.speed);
  const cycleSpeed = usePlaybackSpeedStore((s) => s.cycleSpeed);
  const autoDownloadMedia = useChatSettingsStore((s) => s.autoDownloadMedia);
  const cacheKey = `${message.id}.m4a`;

  useEffect(() => {
    if (!localUri) return;
    player.setPlaybackRate(speed, "high");
  }, [localUri, speed, player]);

  const download = useCallback(() => {
    if (!meta || !message.mediaUrl) return;
    setNeedsDownload(false);
    downloadAndDecryptFile(message.mediaUrl, meta.fileNonce, conversationKey, cacheKey)
      .then(setLocalUri)
      .catch(() => setError(true));
  }, [meta, message.mediaUrl, conversationKey, cacheKey]);

  useEffect(() => {
    if (!meta || !message.mediaUrl) return;
    let cancelled = false;

    if (!autoDownloadMedia) {
      getCachedFileUri(cacheKey).then((cached) => {
        if (cancelled) return;
        if (cached) setLocalUri(cached);
        else setNeedsDownload(true);
      });
      return () => {
        cancelled = true;
      };
    }

    downloadAndDecryptFile(message.mediaUrl, meta.fileNonce, conversationKey, cacheKey)
      .then((uri) => {
        if (!cancelled) setLocalUri(uri);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [message.id, message.mediaUrl, meta?.fileNonce, conversationKey, autoDownloadMedia, cacheKey]);

  if (!meta) return null;

  const onPress = () => {
    if (needsDownload) {
      download();
      return;
    }
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

  const BAR_COUNT = 28;
  const waveform = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < message.id.length; i++) hash = ((hash << 5) - hash + message.id.charCodeAt(i)) | 0;
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const v = Math.abs(Math.sin(hash * (i + 1) * 0.1)) * 0.7 + 0.3;
      return v;
    });
  }, [message.id]);

  return (
    <Pressable style={styles.container} onPress={onPress} disabled={!localUri && !error && !needsDownload}>
      <View style={styles.icon}>
        {needsDownload ? (
          <Text style={styles.iconText}>⬇️</Text>
        ) : !localUri && !error ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.iconText}>{status.playing ? "⏸" : "▶"}</Text>
        )}
      </View>
      <View style={styles.waveformContainer}>
        {waveform.map((h, i) => {
          const barProgress = i / BAR_COUNT;
          const isPlayed = barProgress < progress;
          return (
            <View
              key={i}
              style={[
                styles.waveformBar,
                { height: h * 20, backgroundColor: isPlayed ? colors.primary : colors.border },
              ]}
            />
          );
        })}
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
  waveformContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 1.5,
    height: 24,
  },
  waveformBar: {
    width: 2.5,
    borderRadius: 1.5,
    minHeight: 3,
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
