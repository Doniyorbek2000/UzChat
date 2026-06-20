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
  const webViewRef = useRef<{ goBack: () => void } | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);

  const onShare = () => {
    Share.share({ message: `${name} mini-dasturini UzChat'da ochish: ${url}` }).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.toolbarBtn}>
          <Text style={styles.toolbarBtnText}>Yopish</Text>
        </TouchableOpacity>
        <Text style={styles.toolbarTitle} numberOfLines={1}>{name}</Text>
        <View style={styles.toolbarRight}>
          {canGoBack && (
            <TouchableOpacity onPress={() => webViewRef.current?.goBack()} style={styles.toolbarBtn}>
              <Text style={styles.toolbarBtnText}>Orqaga</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onShare} style={styles.toolbarBtn}>
            <Text style={styles.toolbarBtnText}>Ulashish</Text>
          </TouchableOpacity>
        </View>
      </View>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(navState: { canGoBack: boolean }) => setCanGoBack(navState.canGoBack)}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  toolbarBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  toolbarBtnText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  toolbarTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text, textAlign: "center", marginHorizontal: 8 },
  toolbarRight: { flexDirection: "row", gap: 4 },
  webview: { flex: 1 },
  loadingOverlay: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
