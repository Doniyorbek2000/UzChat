import { useEffect, useState } from "react";
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { fetchLinkPreview, LinkPreviewData } from "../utils/linkPreview";

interface Props {
  url: string;
}

function getHostname(url: string): string {
  return url.replace(/^https?:\/\//i, "").split(/[/?#]/)[0];
}

export function LinkPreviewCard({ url }: Props) {
  const [preview, setPreview] = useState<LinkPreviewData | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchLinkPreview(url)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!preview) return null;

  return (
    <TouchableOpacity style={styles.container} onPress={() => Linking.openURL(url)}>
      {preview.imageUrl && <Image source={{ uri: preview.imageUrl }} style={styles.image} />}
      <View style={styles.info}>
        {preview.siteName && (
          <Text style={styles.siteName} numberOfLines={1}>
            {preview.siteName.toUpperCase()}
          </Text>
        )}
        {preview.title && (
          <Text style={styles.title} numberOfLines={2}>
            {preview.title}
          </Text>
        )}
        {preview.description && (
          <Text style={styles.description} numberOfLines={2}>
            {preview.description}
          </Text>
        )}
        <Text style={styles.hostname} numberOfLines={1}>
          {getHostname(url)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
    maxWidth: 260,
  },
  image: { width: "100%", height: 120, backgroundColor: colors.border },
  info: { padding: 8, gap: 2 },
  siteName: { fontSize: 10, fontWeight: "700", color: colors.textSecondary, letterSpacing: 0.5 },
  title: { fontSize: 13, fontWeight: "600", color: colors.text },
  description: { fontSize: 12, color: colors.textSecondary },
  hostname: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});
