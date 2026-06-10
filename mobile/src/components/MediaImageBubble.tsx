import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
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

  return <Image source={{ uri }} style={[styles.image, { width, height }]} resizeMode="cover" />;
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
  errorText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
