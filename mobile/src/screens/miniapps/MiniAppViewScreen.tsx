import { useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Share } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { WebView } = require("react-native-webview");

type Props = NativeStackScreenProps<RootStackParamList, "MiniAppView">;

export function MiniAppViewScreen({ route, navigation }: Props) {
  const { name, url } = route.params;
  const webViewRef = useRef<{ goBack: () => void; reload: () => void } | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const onShare = () => {
    Share.share({ message: `${name} mini-dasturini UzChat'da ochish: ${url}` }).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.toolbarBtn} activeOpacity={0.6}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.toolbarCenter}>
          <Text style={styles.toolbarTitle} numberOfLines={1}>{name}</Text>
          {loading && <Text style={styles.toolbarSubtitle}>Yuklanmoqda...</Text>}
        </View>
        <View style={styles.toolbarRight}>
          {canGoBack && (
            <TouchableOpacity onPress={() => webViewRef.current?.goBack()} style={styles.toolbarBtn} activeOpacity={0.6}>
              <Text style={styles.actionIcon}>←</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => webViewRef.current?.reload()} style={styles.toolbarBtn} activeOpacity={0.6}>
            <Text style={styles.actionIcon}>↻</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare} style={styles.toolbarBtn} activeOpacity={0.6}>
            <Text style={styles.shareIcon}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>
      {loading && progress < 1 && (
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.max(progress * 100, 5)}%` }]} />
        </View>
      )}
      {loading && progress === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        onLoadStart={() => { setLoading(true); setProgress(0); }}
        onLoadEnd={() => { setLoading(false); setProgress(1); }}
        onLoadProgress={({ nativeEvent }: { nativeEvent: { progress: number } }) => setProgress(nativeEvent.progress)}
        onNavigationStateChange={(navState: { canGoBack: boolean }) => setCanGoBack(navState.canGoBack)}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        allowsInlineMediaPlayback
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 4,
  },
  toolbarBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  closeBtnText: { fontSize: 18, color: colors.textSecondary, fontWeight: "500" },
  toolbarCenter: { flex: 1, alignItems: "center" },
  toolbarTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  toolbarSubtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  toolbarRight: { flexDirection: "row", alignItems: "center" },
  actionIcon: { fontSize: 20, color: colors.primary, fontWeight: "600" },
  shareIcon: { fontSize: 16 },
  progressBarBg: {
    height: 2,
    backgroundColor: colors.border,
  },
  progressBarFill: {
    height: 2,
    backgroundColor: colors.primary,
  },
  webview: { flex: 1 },
  loadingOverlay: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
