import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Sharing from "expo-sharing";
import { downloadAndDecryptFile, extensionFromName, formatFileSize } from "../utils/mediaFile";
import { DecryptedMessage } from "../store/chatStore";
import { colors } from "../theme/colors";

interface Props {
  message: DecryptedMessage;
  conversationKey: string;
}

export function MediaFileBubble({ message, conversationKey }: Props) {
  const [loading, setLoading] = useState(false);
  const meta = message.meta;
  if (!meta) return null;

  const onPress = async () => {
    if (!message.mediaUrl || loading) return;
    setLoading(true);
    try {
      const localUri = await downloadAndDecryptFile(
        message.mediaUrl,
        meta.fileNonce,
        conversationKey,
        `${message.id}${extensionFromName(meta.name)}`
      );
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, { mimeType: meta.mimeType, dialogTitle: meta.name });
      }
    } catch {
      // download/sharing failed; user can retry
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} disabled={loading}>
      <View style={styles.icon}>
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.iconText}>📄</Text>}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {meta.name}
        </Text>
        <Text style={styles.size}>{formatFileSize(meta.size)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 180,
    maxWidth: 240,
    gap: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 18 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: "600", color: colors.text },
  size: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
