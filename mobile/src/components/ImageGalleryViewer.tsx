import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { DecryptedMessage } from "../store/chatStore";
import { downloadAndDecryptFile, extensionFromName, getCachedFileUri } from "../utils/mediaFile";
import { colors } from "../theme/colors";

interface Props {
  visible: boolean;
  messages: DecryptedMessage[];
  initialMessageId: string;
  conversationKey: string;
  onClose: () => void;
}

export function ImageGalleryViewer({ visible, messages, initialMessageId, conversationKey, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<DecryptedMessage>>(null);
  const initialIndex = Math.max(0, messages.findIndex((m) => m.id === initialMessageId));
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) setCurrentIndex(initialIndex);
  }, [visible, initialIndex]);

  if (!visible) return null;

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={({ item }) => (
            <GalleryImage message={item} conversationKey={conversationKey} width={width} height={height} />
          )}
        />
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
        {messages.length > 1 && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {messages.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

function GalleryImage({
  message,
  conversationKey,
  width,
  height,
}: {
  message: DecryptedMessage;
  conversationKey: string;
  width: number;
  height: number;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const meta = message.meta;
  const cacheKey = meta ? `${message.id}${extensionFromName(meta.name) || ".jpg"}` : "";

  useEffect(() => {
    let cancelled = false;
    if (!message.mediaUrl || !meta) return;
    getCachedFileUri(cacheKey).then((cached) => {
      if (cancelled) return;
      if (cached) {
        setUri(cached);
        return;
      }
      downloadAndDecryptFile(message.mediaUrl!, meta.fileNonce, conversationKey, cacheKey)
        .then((localUri) => {
          if (!cancelled) setUri(localUri);
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [message.id, message.mediaUrl, meta, conversationKey, cacheKey]);

  return (
    <View style={[styles.page, { width, height }]}>
      {error ? (
        <Text style={styles.errorText}>⚠️ Yuklab bo'lmadi</Text>
      ) : uri ? (
        <Image source={{ uri }} style={{ width, height }} resizeMode="contain" />
      ) : (
        <ActivityIndicator color="#fff" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  page: { alignItems: "center", justifyContent: "center" },
  closeButton: { position: "absolute", top: 48, right: 16, padding: 8 },
  closeIcon: { color: "#fff", fontSize: 22, fontWeight: "700" },
  counter: { position: "absolute", top: 52, left: 0, right: 0, alignItems: "center" },
  counterText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  errorText: { color: colors.textSecondary, fontSize: 13 },
});
